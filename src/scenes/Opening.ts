import { Scene } from "phaser";

export class Opening extends Scene {
	constructor() {
		super("Opening");
	}

	create() {
		this.sound.stopAll();
		this.time.addEvent({
			delay: 18000,
			callback: () => {
				if (this.scene.isActive("Opening")) {
					this.scene.start("MainMenu");
				}
			},
		});

		this.cameras.main.setBackgroundColor("black");

		this.input?.keyboard?.on("keydown-SPACE", () => {
			this.scene.start("MainMenu");
		});

		this.add
			.bitmapText(
				this.cameras.main.width / 2,
				80,
				"RetroGamingWhiteSmall",
				"Long ago a sage gifted a set of magical tarot cards to the six kingdoms to be used in times of danger. But now the cards have been lost...",
				12
			)
			.setMaxWidth(this.cameras.main.width - 10)
			.setOrigin(0.5);
	}
}
