import { DataKeys } from "./shared";
import { isTileWithPropertiesObject } from "./shared";
import { EnemyManager } from "./EnemyManager";
import { WaitForActive, Roar, RandomlyWalk, SwoopAttack } from "./behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "initial"
	| "roar1"
	| "walk"
	| "attack1"
	| "attack2"
	| "attack3";

export class CloudBoss extends BaseMonster<AllStates> {
	hitPoints: number = 8;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "bosses1", 9);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setSize(this.width * 0.6, this.height * 0.65);
		this.setOffset(this.body.offset.x, this.body.offset.y + 10);
		this.setOrigin(0.5, 0.75);
		this.data.set(DataKeys.Freezable, false);
		this.data.set(DataKeys.Pushable, false);
	}

	getInitialState(): AllStates {
		return "initial";
	}

	initSprites() {
		this.anims.create({
			key: "roar",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 9,
				end: 11,
			}),
			frameRate: 8,
			repeat: 8,
		});

		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 9,
				end: 11,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 21,
				end: 23,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 33,
				end: 35,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 45,
				end: 47,
			}),
			frameRate: 8,
			repeat: -1,
		});
	}

	doesCollideWithTile(
		tile: Phaser.Tilemaps.Tile | Phaser.Types.Physics.Arcade.GameObjectWithBody
	): boolean {
		if (!isTileWithPropertiesObject(tile)) {
			return true;
		}
		if (tile.properties.isSky) {
			return false;
		}
		return true;
	}

	constructNewBehaviorFor(state: AllStates) {
		switch (state) {
			case "initial":
				return new WaitForActive(state, "roar1");
			case "roar1":
				return new Roar(state, "attack1");
			case "walk":
				this.body?.stop();
				return new RandomlyWalk(state, "attack1", {
					speed: 30,
					minWalkTime: 2200,
					maxWalkTime: 3000,
				});
			case "attack1":
				return new SwoopAttack(state, "attack2", {
					awareDistance: 600,
					speed: 250,
					maxSpeed: 850,
					followTime: 2000,
				});
			case "attack2":
				return new SwoopAttack(state, "attack3", {
					awareDistance: 600,
					speed: 250,
					maxSpeed: 850,
					followTime: 2000,
				});
			case "attack3":
				return new SwoopAttack(state, "walk", {
					awareDistance: 600,
					speed: 250,
					maxSpeed: 850,
					followTime: 2000,
				});
		}
	}

	isHittable(): boolean {
		return (
			this.stateMachine.getCurrentState() !== "initial" &&
			!this.stateMachine.getCurrentState()?.includes("roar")
		);
	}
}
