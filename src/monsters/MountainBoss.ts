import { EnemyManager } from "../lib/EnemyManager";
import {
	WaitForActive,
	Roar,
	SpawnEnemies,
	LeftRightMarch,
	ThrowRocks,
	PowerUp,
	Leap,
	Repeat,
	Condition,
	Sequence,
} from "../lib/behaviors";
import { BaseMonster } from "./BaseMonster";
import { MountainMonster } from "./MountainMonster";

export class MountainBoss extends BaseMonster {
	hitPoints: number = 16;
	isBoss = true;
	enemyManager: EnemyManager;
	#attackCount: number = 0;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "bosses1", 48);
		this.enemyManager = enemyManager;

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setSize(this.width * 0.6, this.height * 0.65);
		this.setOffset(this.body.offset.x, this.body.offset.y + 10);
		this.setOrigin(0.5, 0.75);
	}

	getInitialState() {
		return "initial";
	}

	initSprites() {
		this.anims.create({
			key: "roar",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 48,
				end: 50,
			}),
			frameRate: 24,
			repeat: 16,
		});
		this.anims.create({
			key: "spawn",
			frames: this.anims.generateFrameNumbers("bosses1", {
				frames: [48, 49, 50, 60, 61, 62, 72, 73, 74, 84, 85, 86],
			}),
			frameRate: 20,
			repeat: 2,
		});
		this.anims.create({
			key: "throwrock",
			frames: this.anims.generateFrameNumbers("bosses1", {
				frames: [60, 61, 62],
			}),
			frameRate: 5,
			yoyo: true,
		});

		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 60,
				end: 62,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 72,
				end: 74,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	constructNewBehaviorFor(state: string) {
		const createMonster = () => {
			if (!this.body) {
				throw new Error("monster is invalid");
			}
			const enemy = new MountainMonster(
				this.scene,
				this.enemyManager,
				this.body.center.x,
				this.body.center.y
			);
			enemy.hitPoints = 1;
			return enemy;
		};
		switch (state) {
			case "initial":
				this.nextState = "roar1";
				return new WaitForActive(state);
			case "roar1":
				this.nextState = "spawn1";
				return new Roar(state);
			case "spawn1":
				this.nextState = "leftrightmarch";
				return new SpawnEnemies(state, {
					enemiesToSpawn: 4,
					maxSpawnedEnemies: 18,
					createMonster,
				});
			case "leftrightmarch":
				this.nextState = "attack";
				return new LeftRightMarch(state, {
					speed: 80,
				});
			case "attack":
				this.nextState = "roar1";
				this.#attackCount++;
				return new Condition(state, {
					condition: () => this.#attackCount % 2 !== 0,
					onSuccess: () =>
						new Sequence(state, {
							creators: [
								() => new PowerUp(state, { scale: 3 }),
								() =>
									new Leap(state, {
										jumpTime: 800,
										jumpHeight: 40,
										shakeOnLand: true,
										postAttackTime: 800,
										targetPosition: this.body?.center
											? { x: this.body.center.x, y: this.body.center.y }
											: { x: 0, y: 0 },
									}),
								() =>
									new ThrowRocks(state, {
										speed: 500,
										rockCount: 4,
										delayBeforeEnd: 1200,
										delayBetweenRocks: 600,
									}),
							],
						}),
					onFailure: () =>
						new Repeat(state, {
							count: 3,
							createBehavior: () => {
								return new Leap(state, {
									shakeOnLand: true,
									postAttackTime: 700,
								});
							},
						}),
				});
		}
	}

	playHitSound() {
		this.scene.sound.play("rock-destroy", {
			volume: 0.7,
		});
	}

	playDestroySound() {
		this.scene.sound.play("destroy");
	}

	isHittable(): boolean {
		return (
			this.getCurrentState() !== "initial" &&
			!this.getCurrentState()?.includes("roar")
		);
	}
}
