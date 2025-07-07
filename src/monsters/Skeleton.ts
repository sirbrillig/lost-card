import { DataKeys, Events } from "../lib/shared";
import { MainEvents } from "../lib/MainEvents";
import { RandomlyWalk } from "../lib/behaviors";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "randomwalk1" | "randomwalk2";

export class Skeleton extends BaseMonster {
	hitPoints = 1;
	#originalHitPoints = 1;
	primaryColor = 0x23a487;
	#postDeathReviveMs = 3000;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 0);
	}

	getInitialState(): AllStates {
		return "randomwalk1";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 0,
				end: 2,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 12,
				end: 14,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 24,
				end: 26,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 36,
				end: 38,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "randomwalk1":
				this.nextState = "randomwalk2";
				return new RandomlyWalk(state);
			case "randomwalk2":
				this.nextState = "randomwalk1";
				return new RandomlyWalk(state);
		}
	}

	updateBeforeBehavior(): void {
		if (this.hitPoints === 0) {
			this.setVisible(false);
		}
	}

	shouldRemovePostKill(): boolean {
		if (!this.body) {
			return true;
		}
		this.data.set(DataKeys.Hittable, false);
		const bones = this.scene.add.sprite(
			this.body.center.x,
			this.body.center.y,
			"bones"
		);
		MainEvents.on(Events.LeavingRoom, () => {
			bones.setVisible(false);
		});
		MainEvents.on(Events.EnteredRoom, () => {
			if (this.isInActiveRoom()) {
				bones.setVisible(true);
			}
		});
		this.scene.time.addEvent({
			delay: this.#postDeathReviveMs,
			callback: () => {
				bones?.destroy();
				this.revive();
			},
		});
		return false;
	}

	revive(): void {
		// NOTE: this monster may have been deleted by the time this runs.
		if (!this.data || !this.body) {
			return;
		}
		this.data.set(DataKeys.Hittable, true);
		if (this.isInActiveRoom()) {
			this.setVisible(true);
		}
		this.hitPoints = this.#originalHitPoints;
		this.isDying = false;
		this.setStunned(false);
	}
}
