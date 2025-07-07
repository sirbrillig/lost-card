import { WaitForActive, LaserSight, Leap } from "../lib/behaviors";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "idle" | "target" | "leap";

export class HopPot extends BaseMonster {
	hitPoints: number = 2;
	#targetPosition: { x: number; y: number };

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "dungeon_tiles_sprites", 784);
	}

	initSprites() {}

	getInitialState(): AllStates {
		return "idle";
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "idle":
				this.nextState = "target";
				return new WaitForActive(state, {
					distance: 40,
				});
			case "target":
				this.nextState = "leap";
				return new LaserSight(state, {
					isHidden: true,
					postAttackTime: Phaser.Math.Between(300, 700),
					maxLength: Phaser.Math.Between(15, 30),
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
