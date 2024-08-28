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

		this.load.image("Mountain-Dusk", "Mountain-Dusk.png");
		this.load.image("game-map", "lost-card-map.png");
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
		this.load.atlas("icons-atlas", "menu-icons.png", "menu-icons.json");
		this.load.atlas("final-boss-atlas", "final-boss.png", "final-boss.json");
		this.load.spritesheet("npcs", "npcs.png", {
			frameWidth: 17,
			frameHeight: 21,
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

		this.load.atlas("character", "character.png", "character.json");

		this.load.spritesheet("ice_beam", "ice_beam.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("ice_ball", "ice_ball.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("green-ball", "green_ball.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("plant-power", "vine_right.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("cloud-power", "cloud_power.png", {
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
		this.load.spritesheet("wind-power", "wind_power.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("light-lantern", "light_lantern.png", {
			frameWidth: 32,
			frameHeight: 32,
		});

		this.load.spritesheet("monster_explode1", "monster_explode1.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("healing-1", "healing-1.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("healing-2", "healing-2.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("ice_powerup", "ice_powerup.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("slash-effect", "slash_effect.png", {
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
		this.load.spritesheet("monsters2", "Monsters2.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("monsters3", "Monsters3.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("monsters4", "Monsters4.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
		this.load.spritesheet("bosses1", "Bosses1.png", {
			frameWidth: 64,
			frameHeight: 64,
		});

		this.load.audio("attack", ["attack.ogg"]);
		this.load.audio("wind", ["wind.wav"]);
		this.load.audio("ice", ["ice.wav"]);
		this.load.audio("ice-charge", ["ice-charge.wav"]);
		this.load.audio("wave", ["wave.wav"]);
		this.load.audio("fire-loop", ["fire-loop.wav"]);
		this.load.audio("freeze", ["freeze.wav"]);
		this.load.audio("plant", ["plant.wav"]);
		this.load.audio("heal", ["heal.wav"]);
		this.load.audio("hit", ["hit.ogg"]);
		this.load.audio("walk", ["walk.ogg"]);
		this.load.audio("rock-destroy", ["rock-destroy.wav"]);
		this.load.audio("destroy", ["fire-hit.wav"]);
		this.load.audio("fire", ["fire-boom.wav"]);
		this.load.audio("spirit", ["spirit.wav"]);
		this.load.audio("holy", ["holy.wav"]);
		this.load.audio("holy-loop", ["holy-loop.wav"]);
		this.load.audio("enemy-walk", ["enemy-walk.ogg"]);
		this.load.audio("water-walk", ["water-walk.wav"]);
		this.load.audio("game-over", ["game-over.wav"]);
		this.load.audio("roar", ["roar.wav"]);
		this.load.audio("bonus", ["bonus.wav"]);
		this.load.audio("key", ["key.wav"]);
		this.load.audio("heart", ["heart.wav"]);

		this.load.audio("mountain-kingdom", ["mountain_kingdom.mp3"]);
		this.load.audio("ice-kingdom", ["ice_kingdom.mp3"]);
		this.load.audio("fire-kingdom", ["fire_kingdom.mp3"]);
		this.load.audio("spirit-kingdom", ["spirit_kingdom.mp3"]);
		this.load.audio("plant-kingdom", ["plant_kingdom.mp3"]);
		this.load.audio("cloud-kingdom", ["cloud_kingdom.mp3"]);
	}

	create() {
		this.scene.start("MainMenu");
	}
}
