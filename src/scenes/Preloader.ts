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

		this.load.image("overworld_tiles", "Overworld.png");
		this.load.tilemapTiledJSON("map", "overworld.json");

		this.load.spritesheet("character", "character.png", {
			frameWidth: 16,
			frameHeight: 32,
		});
		this.load.spritesheet("logman", "log.png", {
			frameWidth: 32,
			frameHeight: 32,
		});
	}

	create() {
		this.scene.start("Game");
	}
}
