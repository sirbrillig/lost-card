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

		const panelWidth = this.cameras.main.width - 20;
		const panelHeight = data.text ? this.cameras.main.height / 2 : 30;
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
		}
	}

	update() {}
}
