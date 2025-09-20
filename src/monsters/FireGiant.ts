import {
	WaitForActive,
	RandomlyWalk,
	FireBeam,
	PowerUp,
	SpawnEnemies,
	DashTowardPlayer,
} from "../lib/behaviors";
import {
	DataKeys,
	isTileWithPropertiesObject,
	getTilesInRoom,
} from "../lib/shared";
import { getActiveRoom, getMap } from "../lib/components";
import { EnemyManager } from "../lib/EnemyManager";
import { LavaBlorp } from "./LavaBlorp";
import { BaseMonster } from "./BaseMonster";

export class FireGiant extends BaseMonster {
	hitPoints: number = 40;
	primaryColor = 0xb80000;
	#enemyManager: EnemyManager;
	#previouslySummonedTiles: Phaser.Tilemaps.Tile[] = [];

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

	doesCollideWithTile(
		tile: Phaser.Tilemaps.Tile | Phaser.Types.Physics.Arcade.GameObjectWithBody
	): boolean {
		if (!isTileWithPropertiesObject(tile)) {
			return true;
		}
		if (tile.properties.isLava) {
			return false;
		}
		return true;
	}

	getInitialState() {
		return "wait";
	}

	constructNewBehaviorFor(state: string) {
		const activeRoom = getActiveRoom();
		if (!activeRoom) {
			throw new Error("No current room when creating monster");
		}
		const tiles = getTilesInRoom(getMap(), activeRoom).filter((tile) => {
			return isTileWithPropertiesObject(tile) && tile.properties.isLava;
		});
		if (tiles.length < 1) {
			throw new Error("No tiles in current room when creating monster");
		}
		const createMonster = () => {
			// Choose tile at random
			let targetTile = tiles[Phaser.Math.Between(0, tiles.length - 1)];
			const maxTries = 8;
			let tries = 0;
			while (this.#previouslySummonedTiles.includes(targetTile)) {
				if (tries > maxTries) {
					break;
				}
				tries += 1;
				targetTile = tiles[Phaser.Math.Between(0, tiles.length - 1)];
			}
			this.#previouslySummonedTiles.push(targetTile);
			const enemy = new LavaBlorp(
				this.scene,
				this.#enemyManager,
				targetTile.pixelX,
				targetTile.pixelY + targetTile.height
			);
			enemy.timeBeforeBubble = 100;
			this.scene.time.addEvent({
				delay: 8_000,
				callback: () => {
					enemy.destroy();
				},
			});
			return enemy;
		};
		switch (state) {
			case "wait":
				this.nextState = "walk";
				return new WaitForActive(state, {
					distance: 150,
				});
			case "walk":
				this.nextState = "fireBeam";
				return new RandomlyWalk(state, {
					maxWalkTime: 4000,
					speed: 90,
				});
			case "fireBeam":
				this.nextState = "dash";
				return new FireBeam(state, {
					width: 20,
					maxLength: 2500,
					minLength: 2500,
					postAttackTime: 400,
				});
			case "dash":
				this.nextState = "powerup";
				return new DashTowardPlayer(state, {
					speed: 225,
					postAttackTime: 1000,
					doNotStop: true,
				});
			case "powerup":
				this.nextState = "summon";
				return new PowerUp(state, {});
			case "summon":
				this.#previouslySummonedTiles = [];
				this.nextState = "walk";
				return new SpawnEnemies(state, {
					enemiesToSpawn: 10,
					createMonster,
				});
		}
	}
}
