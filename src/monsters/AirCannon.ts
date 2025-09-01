import { Idle, WindBlast, Sequence, Rotate } from "../lib/behaviors";
import { DataKeys, getRotationFromDirection, SpriteUp } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

export class AirCannon extends BaseMonster {
	hitPoints = 2;
	timeBeforeBubble = 500;
	timeBeforeExplode = 600;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters3", 3);
		this.data.set(DataKeys.Pushable, false);
		this.data.set(DataKeys.IsHarmless, true);
		this.data.set(DataKeys.Hittable, false);
		this.data.set(DataKeys.Flying, true);
	}

	isHittable(): boolean {
		return false;
	}

	getInitialState() {
		return "wait";
	}

	initSprites() {
		this.anims.create({
			key: "idle",
			frames: this.anims.generateFrameNumbers("monsters3", {
				frames: [3],
			}),
			frameRate: 10,
			repeat: 5,
		});
		this.anims.create({
			key: "appear",
			frames: this.anims.generateFrameNumbers("monsters3", {
				frames: [3, 4, 5, 15, 16, 17, 27, 28, 29],
			}),
			frameRate: 10,
			repeat: 0,
		});
		this.anims.create({
			key: "disappear",
			frames: this.anims.generateFrameNumbers("monsters3", {
				frames: [3, 4, 5, 15, 16, 17, 27, 28, 29].reverse(),
			}),
			frameRate: 10,
			repeat: 0,
		});
	}

	constructNewBehaviorFor(state: string) {
		const idleTime = 1000;
		return new Sequence(state, {
			loopIf: () => true,
			creators: [
				() =>
					new Rotate(state, getRotationFromDirection(SpriteUp, this.facing)),
				() =>
					new Sequence(state, {
						loopIf: () => true,
						creators: [
							() => new Idle(state, "appear", idleTime),
							() => new WindBlast(state, { direction: this.facing }),
							() => new Idle(state, "disappear", idleTime),
						],
					}),
			],
		});
	}
}
