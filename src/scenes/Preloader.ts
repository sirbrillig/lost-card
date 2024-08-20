import { Scene } from "phaser";

export class Preloader extends Scene {
	constructor() {
		super("Preloader");
	}

	init() {
		//  We loaded this image in our Boot Scene, so we can display it here
		this.add.image(512, 384, "background");

		//  A simple progress bar. This is the outline of the bar.
		this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

		//  This is the progress bar itself. It will increase in size from the left based on the % of progress.
		const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

		//  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
		this.load.on("progress", (progress: number) => {
			//  Update the progress bar (our bar is 464px wide, so 100% = 464px)
			bar.width = 4 + 460 * progress;
		});
	}

	preload() {
		//  Load the assets for the game - Replace with your own assets
		this.load.setPath("assets");

		this.load.image("logo", "logo.png");

		this.load.image("Mountain-Dusk", "Mountain-Dusk.png");
		this.load.image("side_portrait", "Side_Portrait_Small.png");
		this.load.bitmapFont(
			"RetroGamingWhite",
			"RetroGamingWhite.png",
			"RetroGamingWhite.xml"
		);
		this.load.bitmapFont(
			"RetroGamingWhiteSmall",
			"RetroGamingWhiteSmall.png",
			"RetroGamingWhiteSmall.xml"
		);

		this.load.image("dungeon_tiles", "Final_Tileset_extruded.png");
		this.load.tilemapTiledJSON("map", "lost-card-map.json");

		this.load.image("panel4", "Panel_4.png");
		this.load.spritesheet("icons1", "simple_icons.png", {
			frameWidth: 12,
			frameHeight: 12,
		});
		this.load.spritesheet("icons2", "menu-icons-white.png", {
			frameWidth: 13,
			frameHeight: 12,
		});
		this.load.spritesheet("icons3", "white_sprite_sheet.png", {
			frameWidth: 18,
			frameHeight: 18,
			margin: 1,
			spacing: 2,
		});
		this.load.spritesheet("icons4", "sprites.png", {
			frameWidth: 16,
			frameHeight: 16,
		});
		this.load.spritesheet("cards", "cards.png", {
			frameWidth: 16,
			frameHeight: 16,
		});

		this.load.spritesheet(
			"dungeon_tiles_sprites",
			"Final_Tileset_extruded.png",
			{
				frameWidth: 16,
				frameHeight: 16,
				margin: 1,
				spacing: 2,
			}
		);

		this.load.spritesheet("character-idle-down", "character_idle_down.png", {
			frameWidth: 15,
			frameHeight: 26,
		});
		this.load.spritesheet("character-idle-up", "character_idle_up.png", {
			frameWidth: 15,
			frameHeight: 26,
		});
		this.load.spritesheet("character-idle-left", "character_idle_left.png", {
			frameWidth: 15,
			frameHeight: 24,
		});
		this.load.spritesheet("character-run-down", "character_run_down.png", {
			frameWidth: 15,
			frameHeight: 26,
			spacing: 2,
			margin: 1,
		});
		this.load.spritesheet("character-run-up", "character_run_up.png", {
			frameWidth: 15,
			frameHeight: 26,
			spacing: 2,
			margin: 1,
		});
		this.load.spritesheet("character-run-left", "character_run_left.png", {
			frameWidth: 17,
			frameHeight: 24,
		});
		this.load.spritesheet("character-attack-down", "character_sword_down.png", {
			frameWidth: 38,
			frameHeight: 45,
		});
		this.load.spritesheet("character-attack-up", "character_sword_up.png", {
			frameWidth: 39,
			frameHeight: 45,
		});
		this.load.spritesheet(
			"character-attack-right",
			"character_sword_right.png",
			{
				frameWidth: 48,
				frameHeight: 38,
			}
		);
		this.load.spritesheet("character-attack-left", "character_sword_left.png", {
			frameWidth: 48,
			frameHeight: 38,
		});

		this.load.spritesheet("ice_beam", "ice_beam.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("ice_ball", "ice_ball.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("plant-power", "vine_right.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("spirit-power", "spirit_power.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("fire-power", "fire_power.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("ice-power", "ice_power.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet(
			"character-power-right",
			"wind_card_effect_right.png",
			{
				frameWidth: 32,
				frameHeight: 32,
			}
		);
		this.load.spritesheet("character-power-left", "wind_card_effect_left.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("light-lantern", "light_lantern.png", {
			frameWidth: 32,
			frameHeight: 32,
		});

		this.load.spritesheet("character", "character_sprite_sheet.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("monster_explode1", "monster_explode1.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("ice_powerup", "ice_powerup.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("ice_attack", "ice_attack.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("white_fire_circle", "white_fire_circle.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("character_appear", "character_appear.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("monsters1", "Monsters1.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("bosses1", "Bosses1.png", {
			frameWidth: 64,
			frameHeight: 64,
		});
	}

	create() {
		this.scene.start("MainMenu");
	}
}
