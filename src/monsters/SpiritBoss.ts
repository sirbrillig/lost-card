import { DataKeys, hasXandY, ObjectWithXandY } from "../lib/shared";
import { getMap, getActiveRoom } from "../lib/components";
import { EnemyManager } from "../lib/EnemyManager";
import {
	WaitForActive,
	Roar,
	RandomlyWalk,
	SlashTowardPlayer,
	RandomTeleport,
	Idle,
	FireWall,
	Leap,
	FollowPlayer,
	ToggleRoomDark,
} from "../lib/behaviors";
import { BaseMonster } from "./BaseMonster";

export class SpiritBoss extends BaseMonster {
	hitPoints: number = 80;
	primaryColor = 0x23a487;
	isBoss = true;
	#previousPosition: ObjectWithXandY;

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

	getInitialState() {
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

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "initial":
				this.nextState = "roar1";
				return new WaitForActive(state);
			case "roar1":
				this.nextState = "walk";
				return new Roar(state);
			case "walk":
				this.nextState = "jumpOut";
				return new RandomlyWalk(state, {
					speed: 60,
					minWalkTime: 1000,
					maxWalkTime: 4000,
				});
			case "jumpOut":
				this.nextState = "fireWall1";
				this.#previousPosition = { x: this.x, y: this.y };
				const activeRoom = getActiveRoom();
				if (!activeRoom) {
					throw new Error("No active room");
				}
				const map = getMap();
				const jumpTarget = map.findObject(
					"MetaObjects",
					(obj) => obj.name === "SKJumpTarget"
				);
				if (!jumpTarget || !hasXandY(jumpTarget)) {
					throw new Error("cannot find jump target");
				}
				return new Leap(state, {
					targetPosition: jumpTarget,
				});
			case "fireWall1":
				this.nextState = "fireWall2";
				return new FireWall(state, {
					postAttackTime: 1000,
					direction: "right",
					colorTint: this.primaryColor,
				});
			case "fireWall2":
				this.nextState = "jumpIn";
				return new FireWall(state, {
					postAttackTime: 6000,
					direction: "left",
					colorTint: this.primaryColor,
				});
			case "jumpIn":
				this.nextState = "idleBeforeDark";
				return new Leap(state, {
					targetPosition: this.#previousPosition,
				});
			case "idleBeforeDark":
				this.nextState = "darkness";
				return new Idle(state, "down", 1500);
			case "darkness":
				this.nextState = "teleport";
				return new ToggleRoomDark(state, true);
			case "teleport":
				this.nextState = "moveToward";
				return new RandomTeleport(state);
			case "moveToward":
				this.nextState = "idleBeforeAttack";
				return new FollowPlayer(state, {
					stopWhenCloseDistance: 35,
					speed: 20,
				});
			case "idleBeforeAttack":
				this.nextState = "attack1";
				return new Idle(state, "down", 2200);
			case "attack1":
				this.nextState = "attack2";
				return new SlashTowardPlayer(state, 140);
			case "attack2":
				this.nextState = "idleBeforeLastAttack";
				return new SlashTowardPlayer(state, 140);
			case "idleBeforeLastAttack":
				this.nextState = "attack3";
				return new Idle(state, "down", 600);
			case "attack3":
				this.nextState = "darknessUndo";
				return new SlashTowardPlayer(state, 140);
			case "darknessUndo":
				this.nextState = "idleAfterDarkness";
				return new ToggleRoomDark(state, false);
			case "idleAfterDarkness":
				this.nextState = "walk";
				return new Idle(state, "down", 3200);
		}
	}

	isHittable(): boolean {
		const invincibleStates = ["initial", "roar", "fireWall"];
		return !invincibleStates.includes(this.getCurrentState() ?? "");
	}
}
