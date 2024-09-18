import { DataKeys } from "./shared";
import { isTileWithPropertiesObject } from "./shared";
import { EnemyManager } from "./EnemyManager";
import {
	WaitForActive,
	Roar,
	LeftRightMarch,
	IceBeam,
	PowerUp,
} from "./behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates = "initial" | "roar1" | "leftrightmarch" | "powerup" | "icebeam";

export class IceBoss extends BaseMonster<AllStates> {
	hitPoints: number = 10;
	primaryColor: number = 0x39b7e0;

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
				return new WaitForActive(state, "roar1");
			case "roar1":
				return new Roar(state, "leftrightmarch");
			case "leftrightmarch":
				return new LeftRightMarch(state, "powerup", {
					speed: isBloodied ? 90 : 70,
				});
			case "powerup":
				return new PowerUp(state, "icebeam");
			case "icebeam":
				return new IceBeam(state, "leftrightmarch", isBloodied ? 200 : 150);
		}
	}

	isHittable(): boolean {
		return (
			this.stateMachine.getCurrentState() !== "initial" &&
			!this.stateMachine.getCurrentState()?.includes("roar")
		);
	}
}
