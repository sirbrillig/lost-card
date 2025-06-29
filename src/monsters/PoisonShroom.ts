import { WaitForActive, StickyPoison } from "../lib/behaviors";
import { DataKeys } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "wait" | "stickypoison";

export class PoisonShroom extends BaseMonster<AllStates> {
	awareDistance: number = 28;
	hitPoints = 2;
	primaryColor = 0x34c24c;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters2", 89);
		this.data.set(DataKeys.Pushable, false);
		this.data.set(DataKeys.IsHarmless, true);
	}

	getInitialState(): AllStates {
		return "wait";
	}

	initSprites() {}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				this.nextState = "stickypoison";
				return new WaitForActive(state, {
					distance: this.awareDistance,
				});
			case "stickypoison":
				this.nextState = "wait";
				return new StickyPoison(state);
		}
	}
}
