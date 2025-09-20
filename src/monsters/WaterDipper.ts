import { TeleportToWater, PowerUp, RangedIceBall } from "../lib/behaviors";
import { DataKeys } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { isTileWithPropertiesObject } from "../lib/shared";
import { BaseMonster } from "./BaseMonster";

type AllStates = "waterteleport" | "powerup" | "iceball";

export class WaterDipper extends BaseMonster {
	hitPoints: number = 30;
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
				this.nextState = "powerup";
				return new TeleportToWater(state);
			case "powerup":
				this.nextState = "iceball";
				return new PowerUp(state);
			case "iceball":
				this.nextState = "waterteleport";
				return new RangedIceBall(state, 50, 1000);
		}
	}
}
