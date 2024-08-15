import { Scene } from "phaser";
import { loadSavedRegistry, loadSavedData } from "../shared";

export class MainMenu extends Scene {
	selectedButton: 0 | 1 = 0;
	selector: Phaser.GameObjects.Text;
	cursors: Phaser.Types.Input.Keyboard.CursorKeys;

	constructor() {
		super("MainMenu");
	}

	create() {
		this.cameras.main.setBackgroundColor("black");

		this.add
			.text(this.cameras.main.width / 2, 50, "Lost Card", {
				fontFamily: "Arial Black",
				fontSize: 24,
				color: "#ffffff",
				stroke: "#000000",
				strokeThickness: 8,
				align: "center",
			})
			.setOrigin(0.5);

		this.add
			.text(this.cameras.main.width / 2, 100, "Start", {
				fontFamily: "Arial Black",
				fontSize: 18,
				color: "#ffffff",
				stroke: "#000000",
				strokeThickness: 8,
				align: "center",
			})
			.setOrigin(0.5);

		this.add
			.text(this.cameras.main.width / 2, 125, "Load", {
				fontFamily: "Arial Black",
				fontSize: 18,
				color: "#ffffff",
				stroke: "#000000",
				strokeThickness: 8,
				align: "center",
			})
			.setOrigin(0.5);

		this.selector = this.add
			.text(this.cameras.main.width / 2 - 40, 100, "👉", {
				fontFamily: "Arial Black",
				fontSize: 18,
				color: "#ffffff",
				stroke: "#000000",
				strokeThickness: 8,
				align: "center",
			})
			.setOrigin(0.5);

		const cursors = this.input.keyboard?.createCursorKeys();
		if (!cursors) {
			throw new Error("Keyboard could not be loaded");
		}
		this.cursors = cursors;
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
