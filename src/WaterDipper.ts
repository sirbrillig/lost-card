import { TeleportToWater, PowerUp, RangedIceBall } from "./behaviors";
import { EnemyManager } from "./EnemyManager";
import { isTileWithPropertiesObject } from "./shared";
import { BaseMonster } from "./BaseMonster";

type AllStates = "waterteleport" | "powerup" | "iceball";

export class WaterDipper extends BaseMonster<AllStates> {
	hitPoints: number = 6;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 51);
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 51,
				end: 53,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 63,
				end: 65,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 75,
				end: 77,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 87,
				end: 89,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "explode",
			frames: this.anims.generateFrameNumbers("monster_explode1"),
			frameRate: 20,
		});
	}

	doesCollideWithTile(
		tile: Phaser.Tilemaps.Tile | Phaser.Types.Physics.Arcade.GameObjectWithBody
	): boolean {
		if (!isTileWithPropertiesObject(tile)) {
			return true;
		}
		if (tile.properties.isWater) {
			return false;
		}
		return true;
	}

	getInitialState(): AllStates {
		return "waterteleport";
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "waterteleport":
				return new TeleportToWater(state, "powerup");
			case "powerup":
				return new PowerUp(state, "iceball");
			case "iceball":
				return new RangedIceBall(state, "waterteleport");
		}
	}
}
