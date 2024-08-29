import { Scene } from "phaser";
import { loadSavedRegistry, loadSavedData } from "../shared";

export class GameOver extends Scene {
	constructor() {
		super("GameOver");
	}

	create() {
		this.sound.stopAll();
		const gameOverSound = this.sound.add("game-over", {
			loop: false,
			volume: 0.8,
		});
		gameOverSound.play();
		this.time.addEvent({
			delay: 1800,
			callback: () => {
				const savedData = loadSavedData();
				if (savedData) {
					loadSavedRegistry(this.registry, savedData);
					this.scene.start("Game", savedData);
					return;
				}
				this.scene.start("MainMenu");
			},
		});

		this.cameras.main.setBackgroundColor("black");

		this.add
			.bitmapText(
				this.cameras.main.width / 2,
				50,
				"RetroGamingWhiteSmall",
				"Time repeats itself...",
				12
			)
			.setOrigin(0.5);
	}
}
