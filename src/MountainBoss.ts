import { EnemyManager } from "./EnemyManager";
import { WaitForActive, Roar, SpawnEnemies, LeftRightMarch } from "./behaviors";
import { BaseMonster } from "./BaseMonster";
import { MountainMonster } from "./MountainMonster";

type AllStates = "initial" | "roar1" | "spawn1" | "spawn2" | "leftrightmarch";

export class MountainBoss extends BaseMonster<AllStates> {
	hitPoints: number = 10;
	enemyManager: EnemyManager;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "bosses1", 48);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setSize(this.width * 0.6, this.height * 0.65);
		this.setOffset(this.body.offset.x, this.body.offset.y + 10);
		this.setOrigin(0.5, 0.75);
	}

	getInitialState(): AllStates {
		return "initial";
	}

	initSprites() {
		this.anims.create({
			key: "roar",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 48,
				end: 50,
			}),
			frameRate: 10,
			repeat: 8,
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
			key: "idle",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 48,
				end: 50,
			}),
			frameRate: 10,
			repeat: 6,
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

	constructNewBehaviorFor(state: AllStates) {
		const createMonster = () => {
			if (!this.body) {
				throw new Error("monster is invalid");
			}
			return new MountainMonster(
				this.scene,
				this.enemyManager,
				this.body.center.x,
				this.body.center.y
			);
		};
		switch (state) {
			case "initial":
				return new WaitForActive(state, "roar1");
			case "roar1":
				return new Roar(state, "spawn1");
			case "spawn1":
				return new SpawnEnemies(state, "spawn2", {
					enemiesToSpawn: 6,
					maxSpawnedEnemies: 18,
					createMonster,
				});
			case "spawn2":
				return new SpawnEnemies(state, "leftrightmarch", {
					enemiesToSpawn: 6,
					maxSpawnedEnemies: 18,
					createMonster,
				});
			case "leftrightmarch":
				return new LeftRightMarch(state, "roar1", { speed: 80 });
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
			this.stateMachine.getCurrentState() !== "initial" &&
			!this.stateMachine.getCurrentState()?.includes("roar")
		);
	}
}
