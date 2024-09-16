import { Scene } from "phaser";
import { getRegionName, Region } from "../shared";

const lineHeight = 14;
const startHeight = 60;

export class Debug extends Scene {
	selectedButton: number = 0;
	selector: Phaser.GameObjects.Image;
	cursors: Phaser.Types.Input.Keyboard.CursorKeys;

	constructor() {
		super("Debug");
	}

	getLocations() {
		return [
			{ name: "MK", x: 1514, y: 998 },
			{ name: "IK", x: 1610, y: 1684 },
			{ name: "PK", x: 984, y: 2104 },
			{ name: "CK", x: 619, y: 1786 },
			{ name: "FK", x: 2377, y: 1886 },
			{ name: "SK", x: 2181, y: 1784 },
		];
	}

	create() {
		this.add
			.nineslice(128, 112, "panel4", 0, 248, 150, 8, 8, 8, 8)
			.setOrigin(0.5)
			.setAlpha(0.9);

		this.add
			.bitmapText(
				this.cameras.main.width / 2,
				startHeight,
				"RetroGamingWhiteSmall",
				"Select location",
				12
			)
			.setMaxWidth(this.cameras.main.width - 10)
			.setOrigin(0.5);

		this.selector = this.add.image(
			this.cameras.main.width / 2 - 100,
			startHeight + lineHeight,
			"icons1",
			29
		);

		const cursors = this.input.keyboard?.createCursorKeys();
		if (!cursors) {
			throw new Error("Keyboard could not be loaded");
		}
		this.cursors = cursors;

		this.input.gamepad?.on("down", () => {
			if (this.input.gamepad?.pad1?.A) {
				this.confirmSelection();
			}
			if (this.input.gamepad?.pad1?.up) {
				this.selectNextButton(-1);
			}
			if (this.input.gamepad?.pad1?.down) {
				this.selectNextButton(1);
			}
		});

		let y = startHeight + lineHeight;
		this.getLocations().forEach((location) => {
			this.add
				.bitmapText(
					this.cameras.main.width / 2,
					y,
					"RetroGamingWhiteSmall",
					getRegionName(location.name as Region),
					12
				)
				.setMaxWidth(this.cameras.main.width - 10)
				.setOrigin(0.5);

			y += lineHeight;
		});
	}

	selectNextButton(change: number) {
		this.selectedButton += change;
		if (this.selectedButton > this.getLocations().length - 1) {
			this.selectedButton = 0;
		}
		if (this.selectedButton < 0) {
			this.selectedButton = this.getLocations().length - 1;
		}
		this.selector.setPosition(
			this.selector.x,
			lineHeight + startHeight + this.selectedButton * lineHeight
		);
	}

	confirmSelection() {
		const selectedPosition = this.getLocations()[this.selectedButton];
		if (selectedPosition) {
			this.registry.set("playerX", selectedPosition.x);
			this.registry.set("playerY", selectedPosition.y);
			this.scene.start("Game", this.registry.getAll());
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
