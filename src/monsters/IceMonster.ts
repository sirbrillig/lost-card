import { RandomlyWalk, PowerUp, IceAttack } from "../lib/behaviors";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "randomwalk" | "powerup" | "iceattack";

export class IceMonster extends BaseMonster<AllStates> {
	hitPoints: number = 2;
	primaryColor: number = 0x39b7e0;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 51);
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 51,
				end: 53,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 63,
				end: 65,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 75,
				end: 77,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 87,
				end: 89,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	getInitialState(): AllStates {
		return "randomwalk";
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "randomwalk":
				this.nextState = "powerup";
				return new RandomlyWalk(state);
			case "powerup":
				this.nextState = "iceattack";
				return new PowerUp(state);
			case "iceattack":
				this.nextState = "randomwalk";
				return new IceAttack(state);
		}
	}
}
