import { Scene } from "phaser";
import { loadSavedData, loadSavedRegistry } from "../shared";

export class GameOver extends Scene {
	selectedButton: 0 | 1 = 0;
	selector: Phaser.GameObjects.Text;
	cursors: Phaser.Types.Input.Keyboard.CursorKeys;

	constructor() {
		super("GameOver");
	}

	create() {
		this.cameras.main.setBackgroundColor("black");

		this.add
			.text(this.cameras.main.width / 2, 50, "Game Over", {
				fontFamily: "Arial Black",
				fontSize: 24,
				color: "#ffffff",
				stroke: "#000000",
				strokeThickness: 8,
				align: "center",
			})
			.setOrigin(0.5);

		this.add.text(this.cameras.main.width / 2 - 70, 100, "Start again", {
			fontFamily: "Arial Black",
			fontSize: 18,
			color: "#ffffff",
			stroke: "#000000",
			strokeThickness: 8,
			align: "center",
		});

		this.add
			.text(this.cameras.main.width / 2 - 70, 125, "Load last save", {
				fontFamily: "Arial Black",
				fontSize: 18,
				color: "#ffffff",
				stroke: "#000000",
				strokeThickness: 8,
				align: "center",
			})
			.setOrigin(0);

		this.selector = this.add.text(
			this.cameras.main.width / 2 - 100,
			100,
			"👉",
			{
				fontFamily: "Arial Black",
				fontSize: 18,
				color: "#ffffff",
				stroke: "#000000",
				strokeThickness: 8,
				align: "center",
			}
		);

		const cursors = this.input.keyboard?.createCursorKeys();
		if (!cursors) {
			throw new Error("Keyboard could not be loaded");
		}
		this.cursors = cursors;

		if (loadSavedData()) {
			this.selectedButton = 1;
		}
	}

	selectNextButton(change: number) {
		this.selectedButton += change;
		if (this.selectedButton > 1) {
			this.selectedButton = 0;
		}
		if (this.selectedButton < 0) {
			this.selectedButton = 1;
		}
		this.selector.setPosition(this.selector.x, 100 + this.selectedButton * 25);
	}

	confirmSelection() {
		if (this.selectedButton === 0) {
			this.registry.reset();
			this.scene.start("Game");
			return;
		}
		if (this.selectedButton === 1) {
			const savedData = loadSavedData();
			if (savedData) {
				loadSavedRegistry(this.registry, savedData);
			}
			this.scene.start("Game", savedData);
			return;
		}
	}

	update() {
		const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
		const downJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down);
		const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space);

		if (upJustPressed) {
			this.selectNextButton(-1);
		} else if (downJustPressed) {
			this.selectNextButton(1);
		} else if (spaceJustPressed) {
			this.confirmSelection();
		}
	}
}
