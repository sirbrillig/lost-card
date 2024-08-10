import { Scene } from "phaser";

export class GameOver extends Scene {
	camera: Phaser.Cameras.Scene2D.Camera;
	background: Phaser.GameObjects.Image;
	gameover_text: Phaser.GameObjects.Text;

	constructor() {
		super("GameOver");
	}

	create() {
		this.camera = this.cameras.main;
		this.camera.setBackgroundColor(0x00000);

		this.gameover_text = this.add.text(680, 384, "Game Over", {
			fontFamily: "Arial Black",
			fontSize: 64,
			color: "#ffffff",
			stroke: "#000000",
			strokeThickness: 8,
			align: "center",
		});
		this.gameover_text.setOrigin(0.5);
	}
}
