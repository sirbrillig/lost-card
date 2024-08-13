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

		this.load.image("dungeon_tiles", "Final_Tileset_extruded.png");
		this.load.tilemapTiledJSON("map", "lost-card-map.json");

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
		this.load.spritesheet("character-idle-right", "character_idle_right.png", {
			frameWidth: 15,
			frameHeight: 26,
		});
		this.load.spritesheet("character-idle-left", "character_idle_left.png", {
			frameWidth: 15,
			frameHeight: 26,
		});
		this.load.spritesheet("character-run-down", "character_run_down.png", {
			frameWidth: 17,
			frameHeight: 29,
		});
		this.load.spritesheet("character-run-up", "character_run_up.png", {
			frameWidth: 17,
			frameHeight: 29,
		});
		this.load.spritesheet("character-run-left", "character_run_left.png", {
			frameWidth: 17,
			frameHeight: 24,
		});
		this.load.spritesheet("character-run-right", "character_run_right.png", {
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

		this.load.spritesheet("character", "character_sprite_sheet.png", {
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
		this.scene.start("Game");
	}
}
