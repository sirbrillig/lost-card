import {
	WaitForActive,
	Burrow,
	RangedRockBall,
	Leap,
	Idle,
} from "../lib/behaviors";
import { DataKeys } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { isTileWithPropertiesObject } from "../lib/shared";
import { BaseMonster } from "./BaseMonster";

export class RockDigger extends BaseMonster {
	hitPoints: number = 10;

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

	getInitialState() {
		return "wait";
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				this.nextState = "dive";
				return new WaitForActive(state, { distance: 60 });
			case "dive": {
				this.nextState = "teleport";
				const targetPosition = this.body?.center
					? { x: this.body.center.x, y: this.body.center.y }
					: { x: 0, y: 0 };
				return new Leap(state, {
					jumpTime: 900,
					jumpHeight: 30,
					targetPosition,
				});
			}
			case "teleport":
				this.nextState = "burst";
				return new Burrow(state, {
					postAttackTime: 700,
					hitsOnAppear: true,
				});
			case "burst": {
				this.nextState = "throw";
				const targetPosition = this.body?.center
					? { x: this.body.center.x, y: this.body.center.y }
					: { x: 0, y: 0 };
				return new Leap(state, {
					jumpTime: 850,
					jumpHeight: 50,
					targetPosition,
				});
			}
			case "throw":
				this.nextState = "idle";
				return new RangedRockBall(state);
			case "idle":
				this.nextState = "dive";
				return new Idle(state, "down", 400);
		}
	}
}
