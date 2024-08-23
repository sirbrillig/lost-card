import { Events, DataKeys } from "./shared";
import { EnemyManager } from "./EnemyManager";
import {
	WaitForActive,
	Roar,
	RandomlyWalk,
	SlashTowardPlayer,
	RandomTeleport,
} from "./behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "initial"
	| "roar1"
	| "walk"
	| "teleport"
	| "attack1"
	| "attack2"
	| "attack3";

export class SpiritBoss extends BaseMonster<AllStates> {
	hitPoints: number = 8;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "bosses1", 3);

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
				start: 3,
				end: 5,
			}),
			frameRate: 10,
			repeat: 8,
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
				start: 15,
				end: 17,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 27,
				end: 29,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 39,
				end: 41,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 3,
				end: 5,
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
				return new Roar(state, "teleport");
			case "walk":
				return new RandomlyWalk(state, "teleport", {
					speed: 60,
					minWalkTime: 2000,
					maxWalkTime: 5000,
				});
			case "teleport":
				return new RandomTeleport(state, "attack1");
			case "attack1":
				return new SlashTowardPlayer(state, "attack2");
			case "attack2":
				return new SlashTowardPlayer(state, "attack3");
			case "attack3":
				return new SlashTowardPlayer(state, "walk");
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
			!this.stateMachine.getCurrentState()?.includes("roar")
		);
	}
}
