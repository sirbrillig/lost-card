import { Nothing } from "./behaviors";
import { EnemyManager } from "./EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "wait1" | "wait2";

export class BlackOrb extends BaseMonster<AllStates> {
	hitPoints = 1;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "final-boss-atlas", "summonIdle-0.png");
		this.setSize(this.width * 0.8, this.height * 0.8);
	}

	getInitialState(): AllStates {
		return "wait1";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNames("final-boss-atlas", {
				prefix: "summonIdle-",
				suffix: ".png",
				end: 3,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNames("final-boss-atlas", {
				prefix: "summonIdle-",
				suffix: ".png",
				end: 3,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNames("final-boss-atlas", {
				prefix: "summonIdle-",
				suffix: ".png",
				end: 3,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNames("final-boss-atlas", {
				prefix: "summonIdle-",
				suffix: ".png",
				end: 3,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	doesCollideWithTile() {
		return false;
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait1":
				return new Nothing(state, "wait2", "down", 1000);
			case "wait2":
				return new Nothing(state, "wait1", "down", 1000);
		}
	}
}
