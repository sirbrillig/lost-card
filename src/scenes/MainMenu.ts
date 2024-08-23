import { Scene } from "phaser";
import { loadSavedRegistry, loadSavedData } from "../shared";

export class MainMenu extends Scene {
	selectedButton: 0 | 1 = 0;
	selector: Phaser.GameObjects.Image;
	cursors: Phaser.Types.Input.Keyboard.CursorKeys;

	constructor() {
		super("MainMenu");
	}

	create() {
		this.selectedButton = 0;
		this.add.image(0, 0, "Mountain-Dusk").setOrigin(0, 0);

		this.add
			.bitmapText(
				this.cameras.main.width / 2,
				50,
				"RetroGamingWhite",
				"Lost Card",
				24
			)
			.setOrigin(0.5);

		this.add.bitmapText(
			this.cameras.main.width / 2 - 50,
			100,
			"RetroGamingWhite",
			"Start",
			18
		);

		this.add.bitmapText(
			this.cameras.main.width / 2 - 50,
			125,
			"RetroGamingWhite",
			"Load",
			18
		);

		this.selector = this.add.image(
			this.cameras.main.width / 2 - 65,
			110,
			"icons1",
			29
		);

		const cursors = this.input.keyboard?.createCursorKeys();
		if (!cursors) {
			throw new Error("Keyboard could not be loaded");
		}
		this.cursors = cursors;

		if (loadSavedData()) {
			this.selectNextButton(1);
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
		this.selector.setPosition(this.selector.x, 110 + this.selectedButton * 25);
	}

	confirmSelection() {
		if (this.selectedButton === 0) {
			this.registry.reset();
			this.scene.start("Game", {});
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
