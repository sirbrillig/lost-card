import {
	WaitForActive,
	RandomTeleport,
	LavaExplode,
	RangedRockBall,
} from "../lib/behaviors";
import { DataKeys } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { isTileWithPropertiesObject } from "../lib/shared";
import { BaseMonster } from "./BaseMonster";

type AllStates = "wait" | "teleport" | "burst" | "throw";

export class RockDigger extends BaseMonster<AllStates> {
	hitPoints: number = 8;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters3", 54);
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

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters3", {
				start: 54,
				end: 56,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	getInitialState(): AllStates {
		return "teleport";
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				this.nextState = "teleport";
				return new WaitForActive(state, { distance: 60 });
			case "teleport":
				this.nextState = "burst";
				// FIXME: teleport with digging animation
				// FIXME: show preview of creature before making it visible
				return new RandomTeleport(state, {
					postTeleportDelay: 200,
				});
			case "burst":
				this.nextState = "throw";
				return new LavaExplode(state);
			case "throw":
				this.nextState = "teleport";
				return new RangedRockBall(state);
		}
	}
}
