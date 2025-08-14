import {
	DataKeys,
	hasXandY,
	hasWidthAndHeight,
	doRectanglesOverlap,
	getTilesInRoom,
} from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import {
	Poof,
	WaitForActive,
	Roar,
	RandomlyWalk,
	SeekingVine,
	SpawnEnemies,
	TeleportToPlatform,
	Repeat,
} from "../lib/behaviors";
import { Flower } from "./Flower";
import { BaseMonster } from "./BaseMonster";
import { getMap, getActiveRoom } from "../lib/components";

export class PlantBoss extends BaseMonster {
	hitPoints: number = 16;
	isBoss = true;
	primaryColor = 0x97a21a;
	enemyManager: EnemyManager;
	currentSide: "left" | "right" = "left";
	monsters: BaseMonster[] = [];

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "bosses1", 0);
		this.enemyManager = enemyManager;

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
				start: 0,
				end: 2,
			}),
			frameRate: 10,
			repeat: 8,
		});

		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 0,
				end: 2,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 12,
				end: 14,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 24,
				end: 26,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 36,
				end: 38,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	constructNewBehaviorFor(state: string) {
		const vineSpeed = 90;
		const previousMonsterPositions: Phaser.Tilemaps.Tile[] = [];
		const createMonster = () => {
			if (!this.body) {
				throw new Error("monster is invalid");
			}

			const map = getMap();
			const activeRoom = getActiveRoom();
			const enemyArea = map.findObject(
				"MetaObjects",
				(obj) =>
					obj.name ===
					(this.currentSide === "left"
						? "PlantBossRightSide"
						: "PlantBossLeftSide")
			);
			if (!enemyArea || !activeRoom) {
				throw new Error("cannot find summon area");
			}
			if (!hasXandY(enemyArea) || !hasWidthAndHeight(enemyArea)) {
				throw new Error("cannot find summon area");
			}
			// Choose tile at random within area
			const tiles = getTilesInRoom(map, activeRoom).filter((tile) => {
				if (
					!doRectanglesOverlap(
						{
							x: tile.pixelX,
							y: tile.pixelY,
							width: tile.width,
							height: tile.height,
						},
						enemyArea
					)
				) {
					return false;
				}
				return true;
			});
			if (tiles.length < 1) {
				throw new Error("No tiles in room to summon to");
			}
			let targetTile: Phaser.Tilemaps.Tile;
			do {
				targetTile = tiles[Phaser.Math.Between(0, tiles.length - 1)];
			} while (previousMonsterPositions.includes(targetTile));
			previousMonsterPositions.push(targetTile);
			const x = targetTile.pixelX + targetTile.width / 2;
			const y = targetTile.pixelY + targetTile.height / 2;
			const monster = new Flower(this.scene, this.enemyManager, x, y);
			this.monsters.push(monster);
			return monster;
		};
		switch (state) {
			case "initial":
				this.nextState = "roar1";
				return new WaitForActive(state);
			case "roar1":
				this.nextState = "attack1";
				return new Roar(state);
			case "walk":
				this.nextState = "attack1";
				return new RandomlyWalk(state, {
					speed: 75,
					minWalkTime: 500,
					maxWalkTime: 3000,
				});
			case "attack1":
				this.nextState = "teleport";
				return new Repeat(state, {
					count: 3,
					createBehavior: () => {
						return new SeekingVine(state, vineSpeed, 550);
					},
				});
			case "teleport":
				this.monsters.forEach((monster) => monster.silentKill());
				this.currentSide = this.currentSide === "left" ? "right" : "left";
				this.nextState = "poof1";
				return new TeleportToPlatform(state, 2000);
			case "poof1":
				this.nextState = "summon";
				return new Repeat(state, {
					count: 2,
					createBehavior: () => {
						return new Poof(state, { particleLifeSpan: 1500 });
					},
				});
			case "summon":
				previousMonsterPositions.length = 0;
				this.nextState = "walk";
				return new SpawnEnemies(state, {
					enemiesToSpawn: 6,
					// We will handle the max ourselves so we set it really high (we
					// could probably use spawnedEnemyCount directly instead).
					maxSpawnedEnemies: 1000,
					createMonster,
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
