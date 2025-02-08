import { WaitForActive, Poof } from "../lib/behaviors";
import { DataKeys } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "wait" | "burst";

export class Flower extends BaseMonster<AllStates> {
	awareDistance: number = 60;
	hitPoints = 3;
	primaryColor = 0x34c24c;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters2", 48);
		this.data.set(DataKeys.Pushable, false);
	}

	getInitialState(): AllStates {
		return "wait";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 48,
				end: 50,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 60,
				end: 62,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 72,
				end: 74,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 84,
				end: 86,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				return new WaitForActive(state, "burst", {
					distance: this.awareDistance,
				});
			case "burst":
				// FIXME: do burst effect instead
				return new Poof(state, "wait");
		}
	}
}
