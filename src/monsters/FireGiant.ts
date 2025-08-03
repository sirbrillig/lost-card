import {
	WaitForActive,
	RandomlyWalk,
	FireBeam,
	DashTowardPlayer,
} from "../lib/behaviors";
import { DataKeys, isTileWithPropertiesObject } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";

export class FireGiant extends BaseMonster {
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

	doesCollideWithTile(
		tile: Phaser.Tilemaps.Tile | Phaser.Types.Physics.Arcade.GameObjectWithBody
	): boolean {
		if (!isTileWithPropertiesObject(tile)) {
			return true;
		}
		if (tile.properties.isLava) {
			return false;
		}
		return true;
	}

	getInitialState() {
		return "wait";
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "wait":
				this.nextState = "walk";
				return new WaitForActive(state, {
					distance: 150,
				});
			case "walk":
				this.nextState = "fireBeam";
				return new RandomlyWalk(state, {
					maxWalkTime: 4000,
					speed: 90,
				});
			case "fireBeam":
				this.nextState = "dash";
				return new FireBeam(state, {
					width: 30,
					maxLength: 300,
					minLength: 200,
				});
			case "dash":
				this.nextState = "walk";
				return new DashTowardPlayer(state, {
					speed: 200,
					postAttackTime: 1000,
				});
		}
	}
}
