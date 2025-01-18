import { DataKeys } from "../lib/shared";
import { Skeleton } from "./Skeleton";
import { EnemyManager } from "../lib/EnemyManager";
import {
	WaitForActive,
	Roar,
	RandomlyWalk,
	SlashTowardPlayer,
	RandomTeleport,
	Idle,
	SpawnEnemies,
	RangedFireBall,
	PowerUp,
} from "../lib/behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "initial"
	| "roar1"
	| "spawn"
	| "walk"
	| "idle"
	| "charge"
	| "fireball1"
	| "fireball2"
	| "fireball3"
	| "fireball4"
	| "fireball5"
	| "fireball6"
	| "fireball7"
	| "fireball8"
	| "teleport"
	| "attack1"
	| "attack2"
	| "attack3";

export class SpiritBoss extends BaseMonster<AllStates> {
	hitPoints: number = 10;
	primaryColor = 0x23a487;
	isBoss = true;
	#enemyManager;
	#minSpawnDistance = 5;
	#maxSpawnDistance = 40;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "bosses1", 3);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.#enemyManager = enemyManager;
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
				start: 3,
				end: 5,
			}),
			frameRate: 10,
			repeat: 8,
		});

		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 15,
				end: 17,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 27,
				end: 29,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 39,
				end: 41,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 3,
				end: 5,
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
				return new Roar(state, "spawn");
			case "spawn":
				return new SpawnEnemies(state, "teleport", {
					createMonster: () => {
						const x =
							this.x +
							Phaser.Math.Between(
								this.#minSpawnDistance,
								this.#maxSpawnDistance
							);
						const y =
							this.y +
							Phaser.Math.Between(
								this.#minSpawnDistance,
								this.#maxSpawnDistance
							);
						return new Skeleton(this.scene, this.#enemyManager, x, y);
					},
				});
			case "walk":
				return new RandomlyWalk(state, "teleport", {
					speed: 60,
					minWalkTime: 1000,
					maxWalkTime: 4000,
				});
			case "charge":
				return new PowerUp(state, "fireball1", {
					scale: 3,
					chargeTime: 800,
				});
			case "fireball1":
			case "fireball2":
			case "fireball3":
			case "fireball4":
			case "fireball5":
			case "fireball6":
			case "fireball7":
			case "fireball8":
				const fireballNumber = parseInt(state.match(/(\d+)/)?.[1] ?? "0");
				if (!fireballNumber) {
					throw new Error("Could not determine fireballNumber");
				}
				return new RangedFireBall(
					state,
					state === "fireball8"
						? "attack1"
						: (`fireball${fireballNumber + 1}` as AllStates),
					{
						speed: 150,
						postAttackTime: state === "fireball8" ? 350 : 0,
						hitsWalls: true,
						forceDirectionDegree: (360 / 8) * fireballNumber,
						colorTint: this.primaryColor,
					}
				);
			case "teleport":
				return new RandomTeleport(state, "charge");
			case "attack1":
				return new SlashTowardPlayer(state, "attack2", 180);
			case "attack2":
				return new SlashTowardPlayer(state, "idle", 180);
			case "idle":
				return new Idle(state, "attack3", "right", 500);
			case "attack3":
				return new SlashTowardPlayer(state, "walk", 180);
		}
	}

	isHittable(): boolean {
		return (
			this.stateMachine.getCurrentState() !== "initial" &&
			!this.stateMachine.getCurrentState()?.includes("roar")
		);
	}
}
