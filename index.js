const process = require('process');
const readline = require('readline');

class Game {

    constructor (opts) {

        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);

        this.options = Object.assign ({
                camera: {
                    length: process.stdout.columns
                },
                map_settings: {
                    game_speed: 0.03,
                    player_skin: '(x)',
                    enemy_skin: '/\\',
                    enemy: 20,
                    distance: 8,
                    player_offset_right: 10,
                    map_offset_top: 5,
                    jumping_speed: 0.5
                },
                game: {
                    health: 3,
                    enemy_skin_chars: [],
                    jumped: false,
                    damaged: 0,
                    player_position: {
                        jumped_index: 0,
                        is_max: false
                    }
                },
                loop: true
            }, opts
        );
        this.battle_area = '';

        this.generate_map ();
        this.handle_evnets ();
        this.setup ();
        process.stdin.resume ();
    }

    async handle_evnets () {
        process.stdout.on('resize', () => {
            this.resize (this);
            this.frame (this);
        });

        process.stdin.on('keypress', (chunk, key) => {
            if (key.ctrl && key.name === 'c') return process.exit ();

            this.options.game.jumped = key.name === 'space';
        });
    }

    generate_map () {

        const map_length = this.options.camera.length * (this.options.map_settings.distance * this.options.level);
        let enemy_length = this.options.map_settings.enemy * this.options.level;
        let battle_area = '_'.repeat(map_length);

        while (enemy_length--) {
            const enemyPositionIndex = this.get_random_int (50, battle_area.length);
            battle_area = this.replace (enemyPositionIndex, this.options.map_settings.enemy_skin, battle_area);
        }


        this.battle_area = battle_area;
    }

    get_random_int (min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    async resize () {
        this.options.camera.length = process.stdout.columns;
    }

    clear_console () {
        process.stdout.write('\x1B[2J\x1B[0f');
    }

    get_player_offset () {
        let player_offset = this.options.map_settings.player_offset_right;
        const jumped = this.options.game.jumped;
        let jumped_index = this.options.game.player_position.jumped_index;
        let delta = 0;

        if (jumped) {
            if (jumped_index < (this.options.map_settings.map_offset_top) && !this.options.game.player_position.is_max)
                delta = jumped_index + this.options.map_settings.jumping_speed;
            else
                delta = jumped_index - this.options.map_settings.jumping_speed;
        }

        if (jumped_index === this.options.map_settings.map_offset_top) {
            this.options.game.player_position.is_max = true;
        }

        if (delta === 0) {
            this.options.game.player_position.is_max = false;
            this.options.game.jumped = false;
        }

        let map_player_offset = ((this.options.camera.length + 1) * (this.options.map_settings.map_offset_top - Math.floor (delta))) + player_offset;
        this.options.game.player_position.jumped_index = delta;

        return map_player_offset;
    }

    draw_game_frame (frame_index) {
        if (!this.options.game.health) {
            this.options.loop = false;
        }

        const player_skin = this.options.map_settings.player_skin;

        const player_offset = this.get_player_offset ();
        const map_length = this.options.camera.length;

        let offset_top = this.options.map_settings.map_offset_top;
        let battle_area = `${this.battle_area.substr (frame_index, this.options.camera.length)}`;

        /* Check the case, when player intersects with an enemy */
        const triggered_char = battle_area.substr (this.options.map_settings.player_offset_right, 1);
        if (this.options.game.health && this.options.game.enemy_skin_chars.includes (triggered_char) && !this.options.game.jumped && !this.options.game.damaged) {
            this.options.game.damaged = this.options.map_settings.enemy_skin.length;
            this.options.game.health--;
        }

        if (this.options.game.damaged) {
            this.options.game.damaged--;
        }

        let area = '';
        do {
            area += `\n${' '.repeat (map_length)}`;
        } while (--offset_top);

        battle_area = area + battle_area;
        battle_area = this.replace (player_offset, player_skin, battle_area);

        return battle_area;
    }

    draw_results_line (index) {
        const points = this.options.game.health
            ? `Points ${index}, health: ${'* '.repeat (this.options.game.health)}`
            : 'You die';
        return `${' '.repeat (Math.floor ((this.options.camera.length / 2) - (points.length / 2)))}${points}`;
    }

    async frame (index) {
        this.clear_console ();
        const frame = this.draw_game_frame (index);
        const results_line = this.draw_results_line (index);
        process.stdout.write (results_line);
        process.stdout.write (frame);
    }

    replace (index, replacement, string) {
        return string.substr (0, index) + replacement+ string.substr (index + replacement.length);
    }

    async setup () {
        let i = 0;
        this.options.game.enemy_skin_chars = this.options.map_settings.enemy_skin.split ('');
        do {
            await Game.sleep (this.options.map_settings.game_speed);
            this.frame (i);
        } while (++i && this.options.loop)
    }

    static sleep (timeout) {
        return new Promise (resolve => setTimeout (resolve, timeout * 1000));
    }
}

new Game ({
    level: 1
});
