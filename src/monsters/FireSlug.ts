import { WalkWithFire } from "../lib/behaviors";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

export class FireSlug extends BaseMonster {
	hitPoints: number = 10;
	primaryColor = 0xb80000;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters4", 6);
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 6,
				end: 8,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 18,
				end: 20,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 30,
				end: 32,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 42,
				end: 44,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
	}

	getInitialState() {
		return "randomwalk1";
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "randomwalk1":
				this.nextState = "walkwithfire";
				return new WalkWithFire(state);
			case "walkwithfire":
				this.nextState = "randomwalk1";
				return new WalkWithFire(state);
		}
	}
}
