import { RandomlyWalk } from "./behaviors";
import { EnemyManager } from "./EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "randomwalk1" | "randomwalk2";

export class Skeleton extends BaseMonster<AllStates> {
	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 0);
	}

	getInitialState(): AllStates {
		return "randomwalk1";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 0,
				end: 2,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 12,
				end: 14,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 24,
				end: 26,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 36,
				end: 38,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "randomwalk1":
				return new RandomlyWalk(state, "randomwalk2");
			case "randomwalk2":
				return new RandomlyWalk(state, "randomwalk1");
		}
	}
}
