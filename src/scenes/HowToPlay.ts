import { Scene } from "phaser";
import { config } from "../config";

export class HowToPlay extends Scene {
	constructor() {
		super("HowToPlay");
	}

	create() {
		this.sound.stopAll();
		this.time.addEvent({
			delay: config.howToPlayDelay,
			callback: () => {
				if (this.scene.isActive("HowToPlay")) {
					this.scene.start("Game", {});
				}
			},
		});

		this.cameras.main.setBackgroundColor("black");

		this.input?.keyboard?.on("keydown", () => {
			this.scene.start("Game", {});
		});

		this.add
			.bitmapText(
				this.cameras.main.width / 2,
				80,
				"RetroGamingWhiteSmall",
				"Use the arrow keys or your joystick to move.\r\nThe game will save to your browser, so you can come back anytime you like.",
				12
			)
			.setMaxWidth(this.cameras.main.width - 10)
			.setOrigin(0.5);
	}
}
