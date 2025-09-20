import { WaitForActive, LeftRightMarch } from "../lib/behaviors";
import { DataKeys } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "wait" | "move";

export class Spike extends BaseMonster {
	awareDistance: number = 60;
	speed: number = 74;
	hitPoints = 16;
	primaryColor = 0x34c24c;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters2", 51);
		this.data.set(DataKeys.Pushable, false);
	}

	getInitialState(): AllStates {
		return "wait";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters2", {
				frames: [51, 52, 53, 63, 64, 65],
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters2", {
				frames: [51, 52, 53, 63, 64, 65],
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters2", {
				frames: [51, 52, 53, 63, 64, 65],
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters2", {
				frames: [51, 52, 53, 63, 64, 65],
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				this.nextState = "move";
				return new WaitForActive(state, {
					distance: this.awareDistance,
				});
			case "move":
				this.nextState = "wait";
				return new LeftRightMarch(state, {
					speed: this.speed,
					moveUpDown: true,
					minWalkTime: 1000,
					maxWalkTime: 1000,
				});
		}
	}
}
