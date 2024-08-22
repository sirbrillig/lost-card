import { RandomlyWalk, BigSwing } from "./behaviors";
import { EnemyManager } from "./EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "randomwalk1" | "randomwalk2" | "randomwalk3" | "attack";

export class CloudGoblin extends BaseMonster<AllStates> {
	hitPoints: number = 3;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters4", 3);
	}

	getInitialState(): AllStates {
		return "randomwalk1";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 3,
				end: 5,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 15,
				end: 17,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 27,
				end: 29,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters4", {
				start: 39,
				end: 41,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "explode",
			frames: this.anims.generateFrameNumbers("monster_explode1"),
			frameRate: 20,
		});
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "randomwalk1":
				return new RandomlyWalk(state, "attack", { speed: 25 });
			case "randomwalk2":
				return new RandomlyWalk(state, "randomwalk2", { speed: 100 });
			case "attack":
				return new BigSwing(state, "randomwalk3");
			case "randomwalk3":
				return new RandomlyWalk(state, "randomwalk1", { speed: 100 });
		}
	}
}
