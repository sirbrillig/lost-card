import { RandomlyWalk } from "./behaviors";
import { EnemyManager } from "./EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "randomwalk1" | "randomwalk2";

export class MountainMonster extends BaseMonster<AllStates> {
	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 54);
	}

	getInitialState(): AllStates {
		return "randomwalk1";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 54,
				end: 56,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 66,
				end: 68,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 78,
				end: 80,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 90,
				end: 92,
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

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "randomwalk1":
				return new RandomlyWalk(state, "randomwalk2");
			case "randomwalk2":
				return new RandomlyWalk(state, "randomwalk1");
		}
	}
}
