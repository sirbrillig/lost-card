import { DataKeys, isTileWithPropertiesObject } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import {
	WaitForActive,
	Roar,
	LeftRightMarch,
	IceBeam,
	PowerUp,
} from "../lib/behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates = "initial" | "roar1" | "leftrightmarch" | "powerup" | "icebeam";

export class IceBoss extends BaseMonster {
	hitPoints: number = 10;
	primaryColor: number = 0x39b7e0;
	isBoss = true;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "bosses1", 6);

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
				start: 6,
				end: 8,
			}),
			frameRate: 10,
			repeat: 8,
		});

		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 18,
				end: 20,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 30,
				end: 32,
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
		if (tile.properties.isWater) {
			return false;
		}
		return true;
	}

	constructNewBehaviorFor(state: AllStates) {
		const isBloodied = this.hitPoints < 5;
		switch (state) {
			case "initial":
				this.nextState = "roar1";
				return new WaitForActive(state);
			case "roar1":
				this.nextState = "leftrightmarch";
				return new Roar(state);
			case "leftrightmarch":
				this.nextState = "powerup";
				return new LeftRightMarch(state, {
					speed: isBloodied ? 90 : 70,
				});
			case "powerup":
				this.nextState = "icebeam";
				return new PowerUp(state);
			case "icebeam":
				this.nextState = "leftrightmarch";
				return new IceBeam(state, isBloodied ? 200 : 150);
		}
	}

	isHittable(): boolean {
		return (
			this.getCurrentState() !== "initial" &&
			!this.getCurrentState()?.includes("roar")
		);
	}
}
