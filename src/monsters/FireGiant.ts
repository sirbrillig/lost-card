import { WaitForActive, RangedFireBall, SpawnEnemies } from "../lib/behaviors";
import {
	DataKeys,
	getTilesInRoom,
	isTileWithPropertiesObject,
} from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { LavaBlorp } from "./LavaBlorp";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "wait"
	| "fireball1"
	| "fireball2"
	| "wait2"
	| "lava1"
	| "lava2"
	| "lava3"
	| "lava4";

export class FireGiant extends BaseMonster<AllStates> {
	hitPoints: number = 8;
	primaryColor = 0xb80000;
	#enemyManager;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 57);
		this.data.set(DataKeys.Pushable, false);
		this.setScale(2);
		this.#enemyManager = enemyManager;
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 57,
				end: 59,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 69,
				end: 71,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 81,
				end: 83,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 93,
				end: 95,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	getInitialState(): AllStates {
		return "wait";
	}

	getSpawnPoint(count: 1 | 2 | 3 | 4): { x: number; y: number } {
		if (!this.#enemyManager.activeRoom) {
			throw new Error("No active room");
		}
		const tiles = getTilesInRoom(
			this.#enemyManager.map,
			this.#enemyManager.activeRoom
		).filter((tile) => {
			if (isTileWithPropertiesObject(tile) && tile.properties.isLava) {
				return true;
			}
			return false;
		});
		if (tiles.length < 1) {
			throw new Error("No tiles in room to summon to");
		}
		const tilesByDistance: Record<number, Phaser.Tilemaps.Tile> = {};
		const tileDistances: number[] = [];
		tiles.forEach((tile) => {
			const distance = Phaser.Math.Distance.BetweenPoints(tile, this);
			tilesByDistance[distance] = tile;
			tileDistances.push(distance);
		});
		tileDistances.sort(function (a, b) {
			return b - a;
		});
		// Pick one every pair
		const targetTileDistance = tileDistances[count * 2 - 1];
		const targetTile = tilesByDistance[targetTileDistance];
		return {
			x: targetTile.pixelX + targetTile.width / 2,
			y: targetTile.pixelY + targetTile.height / 2,
		};
	}

	prepareSelfDestructingEnemy(
		enemy: Phaser.GameObjects.Sprite
	): Phaser.GameObjects.Sprite {
		this.scene.time.addEvent({
			delay: 3000,
			callback: () => {
				enemy.destroy();
			},
		});
		return enemy;
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				return new WaitForActive(state, "fireball1", {
					distance: 1,
					maxWaitTime: 2000,
				});
			case "fireball1":
				return new RangedFireBall(state, "fireball2", { hitsWalls: true });
			case "fireball2":
				return new RangedFireBall(state, "wait2", { hitsWalls: true });
			case "wait2":
				return new WaitForActive(state, "lava1", {
					distance: 1,
					maxWaitTime: 2000,
				});
			case "lava1":
				return new SpawnEnemies(state, "lava2", {
					enemiesToSpawn: 1,
					createMonster: () => {
						const point = this.getSpawnPoint(1);
						const blorp = new LavaBlorp(
							this.scene,
							this.#enemyManager,
							point.x,
							point.y
						);
						blorp.maxWaitTime = 1;
						return this.prepareSelfDestructingEnemy(blorp);
					},
				});
			case "lava2":
				return new SpawnEnemies(state, "lava3", {
					enemiesToSpawn: 1,
					createMonster: () => {
						const point = this.getSpawnPoint(2);
						const blorp = new LavaBlorp(
							this.scene,
							this.#enemyManager,
							point.x,
							point.y
						);
						blorp.maxWaitTime = 1;
						return this.prepareSelfDestructingEnemy(blorp);
					},
				});
			case "lava3":
				return new SpawnEnemies(state, "lava4", {
					enemiesToSpawn: 1,
					createMonster: () => {
						const point = this.getSpawnPoint(3);
						const blorp = new LavaBlorp(
							this.scene,
							this.#enemyManager,
							point.x,
							point.y
						);
						blorp.maxWaitTime = 1;
						return this.prepareSelfDestructingEnemy(blorp);
					},
				});
			case "lava4":
				return new SpawnEnemies(state, "wait", {
					enemiesToSpawn: 1,
					createMonster: () => {
						const point = this.getSpawnPoint(4);
						const blorp = new LavaBlorp(
							this.scene,
							this.#enemyManager,
							point.x,
							point.y
						);
						blorp.maxWaitTime = 1;
						return this.prepareSelfDestructingEnemy(blorp);
					},
				});
		}
	}
}
