import { RandomlyWalk, TeleportToPlatform, WalkWithFire } from "./behaviors";
import { DataKeys } from "./shared";
import { EnemyManager } from "./EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "randomwalk1"
	| "randomwalk2"
	| "teleport1"
	| "teleport2"
	| "walkwithfire";

export class FireGiant extends BaseMonster<AllStates> {
	hitPoints: number = 8;
	primaryColor = 0xb80000;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 57);
		this.data.set(DataKeys.Pushable, false);
		this.setScale(2);
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 57,
				end: 59,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 69,
				end: 71,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 81,
				end: 83,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 93,
				end: 95,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	getInitialState(): AllStates {
		return "randomwalk1";
	}

	chooseAttack(): AllStates {
		const number = Phaser.Math.Between(1, 3);
		switch (number) {
			case 1:
				return "teleport1";
			case 2:
				return "walkwithfire";
			default:
				return "teleport1";
		}
	}

	constructNewBehaviorFor(state: string) {
		const speed = 190;
		const minWalkTime = 400;
		const maxWalkTime = 800;
		switch (state) {
			case "randomwalk1":
				return new RandomlyWalk(state, "teleport1", {
					speed,
					minWalkTime,
					maxWalkTime,
				});
			case "teleport1":
				return new TeleportToPlatform(state, "randomwalk2", 900);
			case "randomwalk2":
				return new RandomlyWalk(state, "teleport2", {
					speed,
					minWalkTime,
					maxWalkTime,
				});
			case "teleport2":
				return new TeleportToPlatform(state, this.chooseAttack(), 1000);
			case "walkwithfire":
				return new WalkWithFire(state, "teleport1", {
					speed: 60,
					endAfter: 2000,
					rotateDistance: 40,
				});
		}
	}
}
