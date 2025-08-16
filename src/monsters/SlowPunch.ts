import {
	WaitForActive,
	FollowPlayer,
	LavaExplode,
	Sequence,
	Selector,
	PowerUp,
	IsNearPlayer,
	Inverter,
} from "../lib/behaviors";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

export class SlowPunch extends BaseMonster {
	awareDistance: number = 90;
	closeDistance: number = 28;
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
		return new Sequence(state, {
			loopIf: () => true,
			creators: [
				() =>
					new WaitForActive(state, {
						distance: this.awareDistance,
					}),
				() =>
					new FollowPlayer(state, {
						speed: this.speed,
						awareDistance: this.awareDistance,
						stopWhenCloseDistance: this.closeDistance,
					}),
				() =>
					new Selector(state, {
						creators: [
							() =>
								new Inverter(
									state,
									() => new IsNearPlayer(state, this.closeDistance)
								),
							() =>
								new Sequence(state, {
									creators: [
										() => new PowerUp(state, { chargeTime: 700 }),
										() =>
											new LavaExplode(state, {
												damage: 2,
												hitboxRadius: 34,
												particleLifeSpan: 450,
											}),
									],
								}),
						],
					}),
			],
		});
	}
}
