import { Events } from "./shared";
import { EnemyManager } from "./EnemyManager";
import {
	WaitForActive,
	Roar,
	SpawnEnemies,
	PostSpawn,
	LeftRightMarch,
} from "./behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "initial"
	| "roar1"
	| "spawn1"
	| "spawn2"
	| "idle1"
	| "leftrightmarch";

export class MountainBoss extends BaseMonster<AllStates> {
	hitPoints: number = 6;

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
			key: "explode-boss",
			frames: this.anims.generateFrameNumbers("monster_explode1"),
			frameRate: 24,
			repeat: 4,
			repeatDelay: 2,
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
		switch (state) {
			case "initial":
				return new WaitForActive(state, "roar1");
			case "roar1":
				return new Roar(state, "spawn1");
			case "spawn1":
				return new SpawnEnemies(state, "spawn2");
			case "spawn2":
				return new SpawnEnemies(state, "idle1");
			case "idle1":
				return new PostSpawn(state, "leftrightmarch");
			case "leftrightmarch":
				return new LeftRightMarch(state, "roar1");
		}
	}

	kill() {
		this.emit(Events.MonsterDying);
		this.setVelocity(0);
		this.data.set("stunned", true);
		this.setOrigin(0.5, 0.3);
		this.setDisplaySize(this.width * 2, this.height * 2);
		this.anims.play("explode-boss", true);
		this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.emit(Events.MonsterDefeated);
			this.destroy();
		});
	}

	isHittable(): boolean {
		return (
			this.stateMachine.getCurrentState() !== "initial" &&
			!this.stateMachine.getCurrentState().includes("roar")
		);
	}
}
