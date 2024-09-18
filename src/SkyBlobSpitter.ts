import { Idle, SpawnEnemies } from "./behaviors";
import { DataKeys } from "./shared";
import { EnemyManager } from "./EnemyManager";
import { BaseMonster } from "./BaseMonster";
import { SkyBlob } from "./SkyBlob";

type AllStates = "idle" | "spawn1" | "spawn2" | "spawn3" | "idle2";

export class SkyBlobSpitter extends BaseMonster<AllStates> {
	hitPoints: number = 6;
	primaryColor = 0x23A487;
	#enemyManager;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters3", 3);
		this.#enemyManager = enemyManager;
		this.data.set(DataKeys.Pushable, false);
	}

	initSprites() {
		this.anims.create({
			key: "idle",
			frames: this.anims.generateFrameNumbers("monsters3", {
				frames: [3],
			}),
			frameRate: 10,
			repeat: 5,
		});
		this.anims.create({
			key: "appear",
			frames: this.anims.generateFrameNumbers("monsters3", {
				frames: [3, 4, 5, 15, 16, 17, 27, 28, 29],
			}),
			frameRate: 10,
		});
		this.anims.create({
			key: "disappear",
			frames: this.anims.generateFrameNumbers("monsters3", {
				frames: [3, 4, 5, 15, 16, 17, 27, 28, 29].reverse(),
			}),
			frameRate: 10,
		});
	}

	getInitialState(): AllStates {
		return "idle";
	}

	constructNewBehaviorFor(state: string) {
		const postSpawnTime = 800;
		switch (state) {
			case "idle": {
				const randomNumber = Phaser.Math.Between(300, 400);
				return new Idle(state, "spawn1", "appear", randomNumber);
			}
			case "spawn1":
				return new SpawnEnemies(state, "spawn2", {
					enemiesToSpawn: 1,
					maxSpawnedEnemies: 6,
					postSpawnTime,
					createMonster: () => {
						const bug = new SkyBlob(
							this.scene,
							this.#enemyManager,
							this.x,
							this.y
						);
						bug.awareDistance = 500;
						bug.hitPoints = 1;
						return bug;
					},
				});
			case "spawn2":
				return new SpawnEnemies(state, "spawn3", {
					enemiesToSpawn: 1,
					maxSpawnedEnemies: 6,
					postSpawnTime,
					createMonster: () => {
						const bug = new SkyBlob(
							this.scene,
							this.#enemyManager,
							this.x,
							this.y
						);
						bug.awareDistance = 500;
						bug.hitPoints = 1;
						return bug;
					},
				});
			case "spawn3":
				return new SpawnEnemies(state, "idle2", {
					enemiesToSpawn: 1,
					maxSpawnedEnemies: 6,
					postSpawnTime,
					createMonster: () => {
						const bug = new SkyBlob(
							this.scene,
							this.#enemyManager,
							this.x,
							this.y
						);
						bug.awareDistance = 500;
						bug.hitPoints = 1;
						return bug;
					},
				});
			case "idle2": {
				const randomNumber = Phaser.Math.Between(300, 400);
				return new Idle(state, "idle", "disappear", randomNumber);
			}
		}
	}
}
