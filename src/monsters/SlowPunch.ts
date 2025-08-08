import {
	WaitForActive,
	FollowPlayer,
	LavaExplode,
	Decide,
	PowerUp,
} from "../lib/behaviors";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";
import { getPlayerOrThrow } from "../lib/components";

export class SlowPunch extends BaseMonster {
	awareDistance: number = 90;
	speed: number = 15;
	hitPoints = 7;
	primaryColor = 0xb80000;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 57);
	}

	getInitialState() {
		return "wait";
	}

	initSprites() {
		const frameRate = 4;
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 57,
				end: 59,
			}),
			frameRate,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 69,
				end: 71,
			}),
			frameRate,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 81,
				end: 83,
			}),
			frameRate,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 93,
				end: 95,
			}),
			frameRate,
			repeat: -1,
		});
	}

	constructNewBehaviorFor(state: string) {
		const closeDistance = 28;
		switch (state) {
			case "wait":
				this.nextState = "follow";
				return new WaitForActive(state, {
					distance: this.awareDistance,
				});
			case "follow":
				this.nextState = "decide";
				return new FollowPlayer(state, {
					speed: this.speed,
					awareDistance: this.awareDistance,
					stopWhenCloseDistance: closeDistance,
				});
			case "decide":
				return new Decide(state, {
					decider: () => {
						const player = getPlayerOrThrow();
						if (!this.body) {
							throw new Error("Could not update monster");
						}
						const distance = Phaser.Math.Distance.BetweenPoints(
							this.body.center,
							player.body.center
						);
						if (distance < closeDistance) {
							this.nextState = "windup";
						} else {
							this.nextState = "wait";
						}
					},
				});
			case "windup":
				this.nextState = "punch";
				return new PowerUp(state, { chargeTime: 700 });
			case "punch":
				this.nextState = "wait";
				return new LavaExplode(state, {
					hitboxRadius: 34,
					particleLifeSpan: 450,
				});
		}
	}
}
