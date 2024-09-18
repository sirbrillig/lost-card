import { DataKeys } from "./shared";
import { EnemyManager } from "./EnemyManager";
import {
	WaitForActive,
	Roar,
	RandomlyWalk,
	SeekingVine,
	TeleportToPlatform,
} from "./behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "initial"
	| "roar1"
	| "walk"
	| "attack1"
	| "attack2"
	| "attack3"
	| "teleport";

export class PlantBoss extends BaseMonster<AllStates> {
	hitPoints: number = 12;
	isBoss = true;
	primaryColor = 0x97a21a;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "bosses1", 0);

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
		const vineSpeed = 50;
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
				return new SeekingVine(state, "teleport", vineSpeed * 3, 2000);
			case "teleport":
				return new TeleportToPlatform(state, "walk", 2500);
		}
	}

	isHittable(): boolean {
		return (
			this.stateMachine.getCurrentState() !== "initial" &&
			!this.stateMachine.getCurrentState()?.includes("roar")
		);
	}
}
