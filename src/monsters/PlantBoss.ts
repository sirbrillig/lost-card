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
} from "../lib/behaviors";
import { Flower } from "./Flower";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "initial"
	| "roar1"
	| "walk"
	| "poof1"
	| "poof2"
	| "attack1"
	| "attack2"
	| "attack3"
	| "summon"
	| "teleport";

export class PlantBoss extends BaseMonster<AllStates> {
	hitPoints: number = 16;
	isBoss = true;
	primaryColor = 0x97a21a;
	enemyManager: EnemyManager;
	currentSide: "left" | "right" = "left";
	monsters: Phaser.Physics.Arcade.Sprite[] = [];

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

	getInitialState(): AllStates {
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

	constructNewBehaviorFor(state: AllStates) {
		const vineSpeed = 90;
		const previousMonsterPositions: Phaser.Tilemaps.Tile[] = [];
		const createMonster = () => {
			if (!this.body) {
				throw new Error("monster is invalid");
			}
			const enemyArea = this.enemyManager.map.findObject(
				"MetaObjects",
				(obj) =>
					obj.name ===
					(this.currentSide === "left"
						? "PlantBossRightSide"
						: "PlantBossLeftSide")
			);
			if (!enemyArea || !this.enemyManager.activeRoom) {
				throw new Error("cannot find summon area");
			}
			if (!hasXandY(enemyArea) || !hasWidthAndHeight(enemyArea)) {
				throw new Error("cannot find summon area");
			}
			// Choose tile at random within area
			const tiles = getTilesInRoom(
				this.enemyManager.map,
				this.enemyManager.activeRoom
			).filter((tile) => {
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
				return new WaitForActive(state, "roar1");
			case "roar1":
				return new Roar(state, "attack1");
			case "walk":
				return new RandomlyWalk(state, "attack1", {
					speed: 75,
					minWalkTime: 500,
					maxWalkTime: 3000,
				});
			case "attack1":
				return new SeekingVine(state, "attack2", vineSpeed, 550);
			case "attack2":
				return new SeekingVine(state, "attack3", vineSpeed, 900);
			case "attack3":
				return new SeekingVine(state, "teleport", vineSpeed * 2, 1000);
			case "teleport":
				this.monsters.forEach((monster) => monster.destroy());
				this.currentSide = this.currentSide === "left" ? "right" : "left";
				return new TeleportToPlatform(state, "poof1", 2000);
			case "poof1":
				return new Poof(state, "poof2", { particleLifeSpan: 1500 });
			case "poof2":
				return new Poof(state, "summon", { particleLifeSpan: 1500 });
			case "summon":
				previousMonsterPositions.length = 0;
				return new SpawnEnemies(state, "walk", {
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
			this.stateMachine.getCurrentState() !== "initial" &&
			!this.stateMachine.getCurrentState()?.includes("roar")
		);
	}
}
