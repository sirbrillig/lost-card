import { WaitForActive, FollowPlayer } from "../lib/behaviors";
import { isTileWithPropertiesObject } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

type AllStates = "wait" | "follow";

export class Slime extends BaseMonster<AllStates> {
	awareDistance: number = 70;
	speed: number = 40;
	hitPoints = 1;
	primaryColor = 0x65cc45;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters2", 0);
	}

	getInitialState(): AllStates {
		return "wait";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 0,
				end: 2,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 12,
				end: 14,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 24,
				end: 26,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters2", {
				start: 36,
				end: 38,
			}),
			frameRate: 10,
			repeat: -1,
		});
	}

	doesCollideWithTile(
		tile: Phaser.Tilemaps.Tile | Phaser.Types.Physics.Arcade.GameObjectWithBody
	) {
		if (!isTileWithPropertiesObject(tile)) {
			return true;
		}
		if (tile.properties.isSlime) {
			return false;
		}
		return true;
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				this.nextState = "follow";
				return new WaitForActive(state, {
					distance: this.awareDistance,
				});
			case "follow":
				this.nextState = "wait";
				return new FollowPlayer(state, {
					speed: this.speed,
					awareDistance: this.awareDistance,
				});
		}
	}
}
