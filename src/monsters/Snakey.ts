import { WaitForActive, LaserSight, DashTowardPlayer } from "../lib/behaviors";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "wait" | "aim" | "dash";

export class Snakey extends BaseMonster<AllStates> {
	awareDistance: number = 80;
	speed: number = 120;
	hitPoints = 3;
	primaryColor = 0x097325;
	#targetPosition: { x: number; y: number };

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters2", 6);
	}

	getInitialState(): AllStates {
		return "wait";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 6,
				end: 8,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 18,
				end: 20,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 30,
				end: 32,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 42,
				end: 44,
			}),
			frameRate: 10,
			repeat: -1,
			yoyo: true,
		});
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				this.nextState = "aim";
				return new WaitForActive(state, {
					distance: this.awareDistance,
				});
			case "aim":
				this.nextState = "dash";
				return new LaserSight(state, {
					color: this.primaryColor,
					onTarget: (target: { x: number; y: number }) =>
						(this.#targetPosition = target),
				});
			case "dash":
				if (!this.#targetPosition) {
					throw new Error("No target for some reason");
				}
				this.nextState = "wait";
				return new DashTowardPlayer(state, {
					targetPosition: this.#targetPosition,
					speed: this.speed,
				});
		}
	}
}
