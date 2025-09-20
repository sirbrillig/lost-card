import { WaitForActive, FollowPlayer, SpawnEnemies } from "../lib/behaviors";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";
import { Ghost } from "./Ghost";

type AllStates = "wait" | "follow" | "spawn";

export class GreatGhost extends BaseMonster {
	awareDistance: number = 200;
	speed: number = 15;
	hitPoints = 24;
	primaryColor = 0x23a487;
	#enemyManager: EnemyManager;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 9);
		this.#enemyManager = enemyManager;
		this.setScale(2);
	}

	getInitialState(): AllStates {
		return "wait";
	}

	initSprites() {
		this.anims.create({
			key: "spawn",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 9,
				end: 11,
			}),
			frameRate: 8,
			yoyo: true,
		});
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 9,
				end: 11,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 21,
				end: 23,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 33,
				end: 35,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 45,
				end: 47,
			}),
			frameRate: 8,
			repeat: -1,
		});
	}

	doesCollideWithTile() {
		return false;
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				this.nextState = "spawn";
				return new WaitForActive(state, {
					distance: this.awareDistance,
				});
			case "spawn":
				this.nextState = "follow";
				return new SpawnEnemies(state, {
					enemiesToSpawn: 1,
					maxSpawnedEnemies: 4,
					createMonster: (_, _2, x: number, y: number) => {
						const monster = new Ghost(this.scene, this.#enemyManager, x, y);
						monster.speed = 35;
						return monster;
					},
				});
			case "follow":
				this.nextState = "spawn";
				return new FollowPlayer(state, {
					speed: this.speed,
					awareDistance: this.awareDistance,
					followTime: 1000,
				});
		}
	}
}
