import { Idle, SpawnEnemies } from "./behaviors";
import { DataKeys } from "./shared";
import { EnemyManager } from "./EnemyManager";
import { BaseMonster } from "./BaseMonster";
import { PlantBug } from "./PlantBug";

type AllStates = "idle" | "spawn" | "idle2";

export class PlantSpitter extends BaseMonster<AllStates> {
	hitPoints: number = 3;
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
		this.anims.create({
			key: "explode",
			frames: this.anims.generateFrameNumbers("monster_explode1"),
			frameRate: 20,
		});
	}

	getInitialState(): AllStates {
		return "idle";
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "idle":
				return new Idle(state, "spawn", "appear", 300);
			case "spawn":
				return new SpawnEnemies(state, "idle2", {
					enemiesToSpawn: 1,
					maxSpawnedEnemies: 5,
					createMonster: () => {
						const bug = new PlantBug(
							this.scene,
							this.#enemyManager,
							this.x,
							this.y
						);
						bug.awareDistance = 500;
						return bug;
					},
				});
			case "idle2":
				return new Idle(state, "idle", "disappear", 300);
		}
	}
}
