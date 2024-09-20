import { DataKeys } from "./shared";
import { EnemyManager } from "./EnemyManager";
import { WaitForActive, Roar, RandomlyWalk, RangedFireBall } from "./behaviors";
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

export class FireBoss extends BaseMonster<AllStates> {
	hitPoints: number = 10;
	primaryColor = 0xB80000;
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
		switch (state) {
			case "initial":
				return new WaitForActive(state, "roar1");
			case "roar1":
				return new Roar(state, "walk");
			case "walk":
				return new RandomlyWalk(state, "attack1", {
					speed: 60,
					minWalkTime: 2000,
					maxWalkTime: 5000,
				});
			case "attack1":
				return new RangedFireBall(state, "attack2", 180, 350);
			case "attack2":
				return new RangedFireBall(state, "attack3", 180, 350);
			case "attack3":
				return new RangedFireBall(state, "attack4", 180, 350);
			case "attack4":
				return new RangedFireBall(state, "attack5", 180, 350);
			case "attack5":
				return new RangedFireBall(state, "walk", 180, 350);
		}
	}

	isHittable(): boolean {
		return (
			this.stateMachine.getCurrentState() !== "initial" &&
			!this.stateMachine.getCurrentState()?.includes("roar")
		);
	}
}
