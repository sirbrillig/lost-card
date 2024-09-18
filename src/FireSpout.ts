import { Idle, RangedFireBall } from "./behaviors";
import { DataKeys } from "./shared";
import { EnemyManager } from "./EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "idle1" | "spitfire" | "idle2" | "idle3";

export class FireSpout extends BaseMonster<AllStates> {
	hitPoints: number = 2;
	primaryColor = 0xb80000;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 3);
		this.data.set(DataKeys.Pushable, false);
	}

	initSprites() {
		this.anims.create({
			key: "idle",
			frames: this.anims.generateFrameNumbers("monsters1", {
				frames: [3],
			}),
			frameRate: 10,
			repeat: 8,
		});
		this.anims.create({
			key: "appear",
			frames: this.anims.generateFrameNumbers("monsters1", {
				frames: [3, 4, 5, 15, 16, 17, 27, 28, 29],
			}),
			frameRate: 10,
		});
		this.anims.create({
			key: "disappear",
			frames: this.anims.generateFrameNumbers("monsters1", {
				frames: [3, 4, 5, 15, 16, 17, 27, 28, 29].reverse(),
			}),
			frameRate: 10,
		});
	}

	getInitialState(): AllStates {
		return "idle1";
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "idle1": {
				const randomNumber = Phaser.Math.Between(400, 900);
				return new Idle(state, "spitfire", "appear", randomNumber);
			}
			case "spitfire": {
				const randomNumber = Phaser.Math.Between(1000, 1500);
				return new RangedFireBall(state, "idle2", 60, randomNumber);
			}
			case "idle2": {
				const randomNumber = Phaser.Math.Between(400, 900);
				return new Idle(state, "idle3", "disappear", randomNumber);
			}
			case "idle3": {
				const randomNumber = Phaser.Math.Between(400, 900);
				return new Idle(state, "idle1", "idle", randomNumber);
			}
		}
	}
}
