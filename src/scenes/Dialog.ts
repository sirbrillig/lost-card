import { Scene } from "phaser";

export interface DialogData {
	heading: string;
	text?: string;
	hideAfter?: number;
}

export class Dialog extends Scene {
	bg: Phaser.GameObjects.NineSlice;
	title: Phaser.GameObjects.BitmapText;
	text: Phaser.GameObjects.BitmapText | undefined;
	fadeTime: number = 1000;

	constructor() {
		super("Dialog");
	}

	create(data: DialogData) {
		const panelTopLeft = new Phaser.Math.Vector2(
			this.cameras.main.x + 10,
			this.cameras.main.y + 40
		);

		const panelWidth = this.cameras.main.width - 10;
		const panelHeight = (() => {
			if (!data.text) {
				return 30;
			}
			if (data.text.length > 60) {
				return this.cameras.main.height - 70;
			}
			return 90;
		})();
		this.bg = this.add
			.nineslice(
				panelTopLeft.x,
				panelTopLeft.y,
				"panel4",
				0,
				panelWidth,
				panelHeight,
				8,
				8,
				8,
				8
			)
			.setOrigin(0);

		this.title = this.add
			.bitmapText(
				panelTopLeft.x + 10,
				panelTopLeft.y + 8,
				"RetroGamingWhiteSmall",
				data.heading,
				12
			)
			.setMaxWidth(panelWidth - 15)
			.setOrigin(0);

		if (data.text) {
			this.text = this.add
				.bitmapText(
					panelTopLeft.x + 10,
					panelTopLeft.y + 35,
					"RetroGamingWhiteSmall",
					data.text,
					12
				)
				.setMaxWidth(panelWidth - 15)
				.setOrigin(0);
		}

		if (data.hideAfter) {
			this.time.addEvent({
				delay: data.hideAfter,
				callback: () => {
					this.tweens.add({
						targets: [this.bg, this.title, this.text],
						alpha: 0,
						ease: "Cubic.easeOut",
						duration: this.fadeTime,
						onComplete: () => {
							this.scene.stop();
						},
					});
				},
			});
			return;
		} else {
			this.add
				.bitmapText(
					panelTopLeft.x + panelWidth / 2,
					panelTopLeft.y + panelHeight - 20,
					"RetroGamingWhiteSmall",
					"Press SPACE",
					12
				)
				.setMaxWidth(panelWidth - 15)
				.setOrigin(0);
		}

		this.scene.pause("Game");

		if (!this.input.keyboard) {
			throw new Error("No keyboard controls could be found");
		}
		this.input.keyboard.on("keydown-SPACE", () => {
			this.scene.resume("Game");
			this.scene.stop();
		});
	}

	update() {}
}
