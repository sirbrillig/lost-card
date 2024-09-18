import { TeleportToWater, PowerUp, RangedIceBall } from "./behaviors";
import { DataKeys } from "./shared";
import { EnemyManager } from "./EnemyManager";
import { isTileWithPropertiesObject } from "./shared";
import { BaseMonster } from "./BaseMonster";

type AllStates = "waterteleport" | "powerup" | "iceball";

export class WaterDipper extends BaseMonster<AllStates> {
	hitPoints: number = 8;
	primaryColor: number = 0x39b7e0;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters3", 6);
		this.data.set(DataKeys.Pushable, false);
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

	initSprites() {}

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
				return new RangedIceBall(state, "waterteleport", 50, 1000);
		}
	}
}
