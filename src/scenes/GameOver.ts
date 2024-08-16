import { Scene } from "phaser";

export class GameOver extends Scene {
	constructor() {
		super("GameOver");
	}

	create() {
		this.time.addEvent({
			delay: 3000,
			callback: () => {
				this.scene.start("MainMenu");
			},
		});

		this.cameras.main.setBackgroundColor("black");

		this.add
			.bitmapText(
				this.cameras.main.width / 2,
				50,
				"RetroGamingWhite",
				"Game Over",
				24
			)
			.setOrigin(0.5);
	}
}
