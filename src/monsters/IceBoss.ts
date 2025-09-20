import { DataKeys, isTileWithPropertiesObject } from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import {
	WaitForActive,
	Roar,
	LeftRightMarch,
	IceBeam,
	PowerUp,
	FireWall,
} from "../lib/behaviors";
import { BaseMonster } from "./BaseMonster";

export class IceBoss extends BaseMonster {
	hitPoints: number = 80;
	primaryColor: number = 0x39b7e0;
	isBoss = true;
	#iceAttackCount: number = 0;

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

	getInitialState() {
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

	constructNewBehaviorFor(state: string) {
		const isBloodied = this.hitPoints < 5;
		const waveSpeed = 7000;
		const waveDelay = 3000;
		const waveHeightA = 36;
		const waveHeightB = 40;
		const waveColor = 0x0800ff;
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
				this.nextState = this.#iceAttackCount >= 2 ? "waves1" : "icebeam";
				return new PowerUp(state);
			case "icebeam":
				this.#iceAttackCount++;
				this.nextState = "leftrightmarch";
				return new IceBeam(state, isBloodied ? 200 : 150);
			case "waves1":
				this.#iceAttackCount = 0;
				this.nextState = "waves2";
				return new FireWall(state, {
					speed: waveSpeed,
					count: 16,
					colorTint: waveColor,
					postAttackTime: waveDelay,
					fireHeight: waveHeightA,
				});
			case "waves2":
				this.nextState = "waves3";
				return new FireWall(state, {
					speed: waveSpeed,
					count: 10,
					colorTint: waveColor,
					postAttackTime: waveDelay,
					fireHeight: waveHeightB,
				});
			case "waves3":
				this.nextState = "waves4";
				return new FireWall(state, {
					speed: waveSpeed,
					count: 16,
					colorTint: waveColor,
					postAttackTime: waveDelay,
					fireHeight: waveHeightA,
				});
			case "waves4":
				this.nextState = "leftrightmarch";
				return new FireWall(state, {
					speed: waveSpeed,
					count: 10,
					colorTint: waveColor,
					postAttackTime: waveDelay,
					fireHeight: waveHeightB,
				});
		}
	}

	isHittable(): boolean {
		return (
			this.getCurrentState() !== "initial" &&
			!this.getCurrentState()?.includes("roar")
		);
	}
}
