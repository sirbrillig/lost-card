import { Scene } from "phaser";

export class Victory extends Scene {
	constructor() {
		super("Victory");
	}

	create() {
		this.sound.stopAll();
		this.time.addEvent({
			delay: 8000,
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
				"Lost Card\r\n\r\nYou Win!\r\nCongratulations!",
				24
			)
			.setOrigin(0.5);
	}
}
