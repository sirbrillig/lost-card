import { RandomlyWalk, Sequence } from "../lib/behaviors";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

export class MountainMonster extends BaseMonster {
	hitPoints = 6;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 54);
	}

	getInitialState() {
		return "all";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 54,
				end: 56,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 66,
				end: 68,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 78,
				end: 80,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 90,
				end: 92,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	constructNewBehaviorFor() {
		return new Sequence("all", {
			loopIf: () => true,
			creators: [() => new RandomlyWalk("a")],
		});
	}
}
