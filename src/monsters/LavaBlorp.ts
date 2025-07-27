import { WaitForActive, LavaExplode } from "../lib/behaviors";
import { DataKeys } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "wait" | "lava-bubble" | "lava-explode";

export class LavaBlorp extends BaseMonster {
	hitPoints = 2;
	timeBeforeBubble = 100;
	timeBeforeExplode = 600;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "light-lantern", 11);
		this.data.set(DataKeys.Pushable, false);
		this.data.set(DataKeys.IsHarmless, true);
		this.data.set(DataKeys.Hittable, false);
		this.timeBeforeBubble = Phaser.Math.Between(800, 2500);
	}

	isHittable(): boolean {
		return false;
	}

	getInitialState(): AllStates {
		return "wait";
	}

	initSprites() {
		this.anims.create({
			key: "lava-idle",
			frames: this.anims.generateFrameNumbers("light-lantern", {
				frames: [11, 11],
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "lava-bubble",
			frames: this.anims.generateFrameNumbers("light-lantern", {
				frames: [11, 0, 1, 11],
			}),
			frameRate: 11,
			repeatDelay: 300,
			repeat: -1,
		});
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				this.nextState = "lava-bubble";
				return new WaitForActive(state, {
					// Never activate; just use maxWaitTime
					distance: 1,
					maxWaitTime: this.timeBeforeBubble,
					waitAnimationKey: "lava-idle",
				});
			case "lava-bubble":
				this.nextState = "lava-explode";
				return new WaitForActive(state, {
					// Never activate; just use maxWaitTime
					distance: 1,
					maxWaitTime: this.timeBeforeExplode,
					waitAnimationKey: "lava-bubble",
				});
			case "lava-explode":
				this.anims.play("lava-idle", true);
				this.nextState = "wait";
				return new LavaExplode(state);
		}
	}
}
