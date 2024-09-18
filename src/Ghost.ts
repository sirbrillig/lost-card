import { WaitForActive, FollowPlayer } from "./behaviors";
import { EnemyManager } from "./EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "wait" | "follow";

export class Ghost extends BaseMonster<AllStates> {
	awareDistance: number = 90;
	speed: number = 18;
	hitPoints = 4;
	primaryColor = 0x23A487;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 9);
	}

	getInitialState(): AllStates {
		return "wait";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 9,
				end: 11,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 21,
				end: 23,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 33,
				end: 35,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 45,
				end: 47,
			}),
			frameRate: 8,
			repeat: -1,
		});
	}

	doesCollideWithTile() {
		return false;
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				return new WaitForActive(state, "follow", {
					distance: this.awareDistance,
				});
			case "follow":
				return new FollowPlayer(state, "wait", {
					speed: this.speed,
					awareDistance: this.awareDistance,
				});
		}
	}
}
