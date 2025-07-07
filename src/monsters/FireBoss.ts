import { DataKeys } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import {
	WaitForActive,
	Roar,
	RandomlyWalk,
	RangedFireBall,
} from "../lib/behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "initial"
	| "roar1"
	| "walk"
	| "attack1"
	| "attack2"
	| "attack3"
	| "attack4"
	| "attack5";

export class FireBoss extends BaseMonster {
	hitPoints: number = 10;
	primaryColor = 0xb80000;
	isBoss = true;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "bosses1", 69);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setSize(this.width * 0.6, this.height * 0.65);
		this.setOffset(this.body.offset.x, this.body.offset.y + 10);
		this.setOrigin(0.5, 0.75);
		this.data.set(DataKeys.Freezable, false);
	}

	getInitialState(): AllStates {
		return "initial";
	}

	initSprites() {
		this.anims.create({
			key: "roar",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 57,
				end: 59,
			}),
			frameRate: 10,
			repeat: 8,
		});

		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 69,
				end: 71,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 81,
				end: 83,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 93,
				end: 95,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 57,
				end: 59,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	constructNewBehaviorFor(state: AllStates) {
		const isBloodied = this.hitPoints < 5;
		const fireSpeed = isBloodied ? 200 : 180;
		switch (state) {
			case "initial":
				this.nextState = "roar1";
				return new WaitForActive(state);
			case "roar1":
				this.nextState = "walk";
				return new Roar(state);
			case "walk":
				this.nextState = "attack1";
				return new RandomlyWalk(state, {
					speed: 60,
					minWalkTime: 2000,
					maxWalkTime: 5000,
				});
			case "attack1":
				this.nextState = "attack2";
				return new RangedFireBall(state, {
					speed: fireSpeed,
					postAttackTime: 350,
				});
			case "attack2":
				this.nextState = "attack3";
				return new RangedFireBall(state, {
					speed: fireSpeed,
					postAttackTime: 350,
				});
			case "attack3":
				this.nextState = "attack4";
				return new RangedFireBall(state, {
					speed: fireSpeed,
					postAttackTime: 350,
				});
			case "attack4":
				this.nextState = "attack5";
				return new RangedFireBall(state, {
					speed: fireSpeed,
					postAttackTime: 350,
				});
			case "attack5":
				this.nextState = "walk";
				return new RangedFireBall(state, {
					speed: fireSpeed,
					postAttackTime: 350,
				});
		}
	}

	isHittable(): boolean {
		return (
			this.getCurrentState() !== "initial" &&
			!this.getCurrentState()?.includes("roar")
		);
	}
}
