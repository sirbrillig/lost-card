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
				"RetroGamingWhiteSmall",
				"The monsters defeated and the cards restored, the people of the six kingdoms were free once again. Your spirit may return to its rest.\r\nThe End.",
				12
			)
			.setMaxWidth(this.cameras.main.width - 10)
			.setOrigin(0.5);
	}
}
