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
		super(scene, enemyManager, x, y, "monsters3", 6);
	}

	initSprites() {
		this.anims.create({
			key: "idle",
			frames: this.anims.generateFrameNumbers("monsters3", {
				start: 6,
				end: 8,
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
