import { Scene } from "phaser";

export class GameMap extends Scene {
	constructor() {
		super("GameMap");
	}

	create() {
		this.add
			.nineslice(128, 112, "panel4", 0, 248, 150, 8, 8, 8, 8)
			.setOrigin(0.5)
			.setAlpha(0.9);

		// Map is 150 x 150
		const mapOffset = { x: 50, y: 40 };
		this.add
			.image(mapOffset.x, mapOffset.y, "game-map")
			.setDepth(9)
			.setOrigin(0);

		const playerX = this.registry.get("playerX");
		const playerY = this.registry.get("playerY");

		if (!playerX || !playerY) {
			return;
		}

		const newPoints = this.mapGamePointToMapPoint(playerX, playerY);
		const playerAdjust = -2;

		const playerPoint = this.add
			.sprite(
				newPoints.x + playerAdjust + mapOffset.x,
				newPoints.y + playerAdjust + mapOffset.y,
				"icons2",
				5
			)
			.setOrigin(0.5)
			.setDepth(10);

		this.tweens.add({
			targets: playerPoint,
			alpha: 0,
			ease: "Cubic.easeOut",
			duration: 800,
			repeatDelay: 400,
			repeat: -1,
			yoyo: true,
		});
	}

	mapGamePointToMapPoint(x: number, y: number): { x: number; y: number } {
		const mapScale = 4.7;
		return {
			x: x / (100 / mapScale),
			y: y / (100 / mapScale),
		};
	}
}
