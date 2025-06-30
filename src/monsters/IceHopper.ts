import { Idle, LaserSight, Leap } from "../lib/behaviors";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "idle" | "target" | "leap";

export class IceHopper extends BaseMonster<AllStates> {
	hitPoints: number = 3;
	primaryColor: number = 0x39b7e0;
	#targetPosition: { x: number; y: number };

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters2", 57);
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 57,
				end: 59,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 69,
				end: 71,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 81,
				end: 83,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 93,
				end: 95,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	getInitialState(): AllStates {
		return "idle";
	}

	doesCollideWithTile() {
		return false;
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "idle":
				this.nextState = "target";
				// FIXME: set idle animation based on direction of player
				return new Idle(state, "down", 1000);
			case "target":
				this.nextState = "leap";
				return new LaserSight(state, {
					isHidden: true,
					onTarget: (target: { x: number; y: number }) =>
						(this.#targetPosition = target),
				});
			case "leap":
				this.nextState = "idle";
				return new Leap(state, {
					targetPosition: this.#targetPosition,
				});
		}
	}
}
