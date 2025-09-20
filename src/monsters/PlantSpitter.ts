import { Idle, SpawnEnemies } from "../lib/behaviors";
import { DataKeys } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";
import { PlantBug } from "./PlantBug";

type AllStates = "idle" | "spawn" | "idle2";

export class PlantSpitter extends BaseMonster {
	hitPoints: number = 10;
	primaryColor = 0x97a21a;
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
		switch (state) {
			case "idle": {
				const randomNumber = Phaser.Math.Between(300, 500);
				this.nextState = "spawn";
				return new Idle(state, "appear", randomNumber);
			}
			case "spawn":
				this.nextState = "idle2";
				return new SpawnEnemies(state, {
					enemiesToSpawn: 1,
					maxSpawnedEnemies: 5,
					postSpawnTime: 1500,
					createMonster: () => {
						const bug = new PlantBug(
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
				const randomNumber = Phaser.Math.Between(300, 500);
				this.nextState = "idle";
				return new Idle(state, "disappear", randomNumber);
			}
		}
	}
}
