import { RandomlyWalk, BigSwing } from "../lib/behaviors";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "randomwalk1" | "randomwalk2" | "randomwalk3" | "attack";

export class CloudGoblin extends BaseMonster {
	hitPoints: number = 3;
	primaryColor = 0xd0693b;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters4", 3);
	}

	getInitialState(): AllStates {
		return "randomwalk1";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 3,
				end: 5,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 15,
				end: 17,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 27,
				end: 29,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 39,
				end: 41,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "randomwalk1":
				this.nextState = "attack";
				return new RandomlyWalk(state, { speed: 25 });
			case "randomwalk2":
				this.nextState = "randomwalk2";
				return new RandomlyWalk(state, { speed: 100 });
			case "attack":
				this.nextState = "randomwalk3";
				return new BigSwing(state);
			case "randomwalk3":
				this.nextState = "randomwalk1";
				return new RandomlyWalk(state, { speed: 100 });
		}
	}
}
