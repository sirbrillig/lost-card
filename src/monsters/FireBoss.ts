import { DataKeys, ObjectWithXandY } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import {
	WaitForActive,
	Roar,
	RandomlyWalk,
	RangedFireBall,
	FireBallRing,
	Leap,
} from "../lib/behaviors";
import { BaseMonster } from "./BaseMonster";

export class FireBoss extends BaseMonster {
	hitPoints: number = 80;
	primaryColor = 0xb80000;
	isBoss = true;
	#regularAttackCounter: number = 0;
	#originalPosition: ObjectWithXandY;

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

	getInitialState() {
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

	constructNewBehaviorFor(state: string) {
		this.data.set(DataKeys.EnemyTouchDamage, 1);
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
				this.nextState = this.#regularAttackCounter >= 3 ? "leap" : "attack";
				return new RandomlyWalk(state, {
					speed: 60,
					minWalkTime: 2000,
					maxWalkTime: 5000,
				});
			case "attack":
				this.#regularAttackCounter++;
				this.nextState = "walk";
				return new RangedFireBall(state, {
					speed: fireSpeed,
					postAttackTime: 350,
					count: 5,
				});
			case "leap":
				this.#originalPosition = { x: this.x, y: this.y };
				this.#regularAttackCounter = 0;
				this.data.set(DataKeys.EnemyTouchDamage, 2);
				this.nextState = "fireRing";
				return new Leap(state, { shakeOnLand: true });
			case "fireRing":
				this.nextState = "leapBack";
				return new FireBallRing(state, {
					speed: 70,
					postAttackTime: 2400,
					count: 14,
				});
			case "leapBack":
				this.nextState = "walk";
				return new Leap(state, {
					targetPosition: this.#originalPosition,
					shakeOnLand: true,
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
