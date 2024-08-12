import { Scene } from "phaser";

export class GameOver extends Scene {
	camera: Phaser.Cameras.Scene2D.Camera;
	background: Phaser.GameObjects.Image;

	constructor() {
		super("GameOver");
	}

	create() {
		this.camera = this.cameras.main;
		this.camera.setBackgroundColor(0x00000);

		const screenCenterX =
			this.cameras.main.worldView.x + this.cameras.main.width / 2;
		const screenCenterY =
			this.cameras.main.worldView.y + this.cameras.main.height / 2;
		const text = this.add.text(screenCenterX, screenCenterY, "Game Over", {
			fontFamily: "Arial Black",
			fontSize: 24,
			color: "#ffffff",
			stroke: "#000000",
			strokeThickness: 8,
			align: "center",
		});
		text.setOrigin(0.5);
	}
}
