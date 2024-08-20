import { RandomlyWalk, WalkWithFire } from "./behaviors";
import { EnemyManager } from "./EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "randomwalk1" | "walkwithfire";

export class FireMonster extends BaseMonster<AllStates> {
	hitPoints: number = 3;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 57);
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 57,
				end: 59,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 69,
				end: 71,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 81,
				end: 83,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 93,
				end: 95,
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

	getInitialState(): AllStates {
		return "randomwalk1";
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "randomwalk1":
				return new RandomlyWalk(state, "walkwithfire");
			case "walkwithfire":
				return new WalkWithFire(state, "randomwalk1");
		}
	}
}
