import { Scene } from "phaser";

export interface DialogData {
	heading: string;
	text: string;
}

export class Dialog extends Scene {
	bg: Phaser.GameObjects.NineSlice;

	constructor() {
		super("Dialog");
	}

	create(data: DialogData) {
		const panelTopLeft = new Phaser.Math.Vector2(
			this.cameras.main.x + 10,
			this.cameras.main.y + 40
		);
		this.bg = this.add
			.nineslice(
				panelTopLeft.x,
				panelTopLeft.y,
				"panel4",
				0,
				230,
				80,
				8,
				8,
				8,
				8
			)
			.setOrigin(0);

		this.add
			.bitmapText(
				panelTopLeft.x + 10,
				panelTopLeft.y + 8,
				"RetroGamingWhiteSmall",
				data.heading,
				12
			)
			.setOrigin(0);

		this.add
			.bitmapText(
				panelTopLeft.x + 10,
				panelTopLeft.y + 35,
				"RetroGamingWhiteSmall",
				data.text,
				12
			)
			.setOrigin(0);
	}

	update() {}
}
