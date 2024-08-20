import { Idle, RangedFireBall } from "./behaviors";
import { EnemyManager } from "./EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "idle1" | "spitfire" | "idle2" | "idle3";

export class FireSpout extends BaseMonster<AllStates> {
	hitPoints: number = 1;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters2", 3);
	}

	initSprites() {
		this.anims.create({
			key: "idle",
			frames: this.anims.generateFrameNumbers("monsters2", {
				frames: [3],
			}),
			frameRate: 10,
			repeat: 8,
		});
		this.anims.create({
			key: "appear",
			frames: this.anims.generateFrameNumbers("monsters2", {
				frames: [3, 4, 5, 15, 16, 17, 27, 28, 29],
			}),
			frameRate: 10,
		});
		this.anims.create({
			key: "disappear",
			frames: this.anims.generateFrameNumbers("monsters2", {
				frames: [3, 4, 5, 15, 16, 17, 27, 28, 29].reverse(),
			}),
			frameRate: 10,
		});
		this.anims.create({
			key: "explode",
			frames: this.anims.generateFrameNumbers("monster_explode1"),
			frameRate: 20,
		});
	}

	getInitialState(): AllStates {
		return "idle1";
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "idle1":
				return new Idle(state, "spitfire", "appear");
			case "spitfire":
				return new RangedFireBall(state, "idle2");
			case "idle2":
				return new Idle(state, "idle3", "disappear");
			case "idle3":
				return new Idle(state, "idle1", "idle");
		}
	}
}
