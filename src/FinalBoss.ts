import {
	DataKeys,
	isDynamicSprite,
	isTileWithPropertiesObject,
} from "./shared";
import { EnemyManager } from "./EnemyManager";
import {
	WaitForActive,
	Roar,
	RandomlyWalk,
	RangedFireBall,
	SummonCircle,
} from "./behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "initial"
	| "roar1"
	| "summoncircle"
	| "walk"
	| "attack1"
	| "attack2"
	| "attack3"
	| "attack4"
	| "attack5"
	| "attack6";

export class FinalBoss extends BaseMonster<AllStates> {
	hitPoints: number = 10;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "final-boss-atlas", "idle2-0.png");

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setSize(this.width * 0.3, this.height * 0.65);
		this.setOffset(this.body.offset.x - 12, this.body.offset.y + 10);
		this.setOrigin(0.5, 0.75);
		this.data.set(DataKeys.Freezable, false);
	}

	getInitialState(): AllStates {
		return "initial";
	}

	initSprites() {
		this.anims.create({
			key: "roar",
			frames: this.anims.generateFrameNames("final-boss-atlas", {
				prefix: "idle2-",
				suffix: ".png",
				end: 7,
			}),
			frameRate: 10,
			repeat: 4,
		});

		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNames("final-boss-atlas", {
				prefix: "idle2-",
				suffix: ".png",
				end: 7,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNames("final-boss-atlas", {
				prefix: "idle2-",
				suffix: ".png",
				end: 7,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNames("final-boss-atlas", {
				prefix: "idle2-",
				suffix: ".png",
				end: 7,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNames("final-boss-atlas", {
				prefix: "idle2-",
				suffix: ".png",
				end: 7,
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

	constructNewBehaviorFor(state: AllStates) {
		switch (state) {
			case "initial":
				return new WaitForActive(state, "roar1");
			case "roar1":
				return new Roar(state, "summoncircle");
			case "walk":
				return new RandomlyWalk(state, "attack1", {
					speed: 50,
					minWalkTime: 2000,
					maxWalkTime: 5000,
				});
			case "summoncircle":
				return new SummonCircle(state, "walk");
			case "attack1":
				return new RangedFireBall(state, "attack2", 140, 350);
			case "attack2":
				return new RangedFireBall(state, "attack3", 140, 350);
			case "attack3":
				return new RangedFireBall(state, "attack4", 140, 350);
			case "attack4":
				return new RangedFireBall(state, "attack5", 140, 350);
			case "attack5":
				return new RangedFireBall(state, "attack6", 140, 350);
			case "attack6":
				return new RangedFireBall(state, "summoncircle", 140, 350);
		}
	}

	updateAfterBehaviorInit(name: string | undefined) {
		const circleData = this.data.get("SummonCircle");
		if (!Array.isArray(circleData?.effects)) {
			return;
		}
		if (!this.body || !isDynamicSprite(this)) {
			throw new Error("Could not update monster");
		}

		if (name?.startsWith("attack") && circleData.effects.length > 0) {
			const effect = circleData.effects.pop();
			effect.destroy();
			this.data.set("SummonCircle", circleData);
		}
	}

	updateAfterBehavior() {
		const circleData = this.data.get("SummonCircle");
		if (!Array.isArray(circleData?.effects)) {
			return;
		}
		if (!this.body || !isDynamicSprite(this)) {
			throw new Error("Could not update monster");
		}

		Phaser.Actions.PlaceOnCircle(
			circleData.effects,
			new Phaser.Geom.Circle(this.body.center.x, this.body.center.y, 40)
		);
		// NOTE: this rotation doesn't quite work right when this sprite has a
		// velocity, so we need PlaceOnCircle but then the effects never actually
		// rotate.
		Phaser.Actions.RotateAroundDistance(
			circleData.effects,
			this.body.center,
			Phaser.Math.DegToRad(1),
			40
		);
	}

	isHittable(): boolean {
		return (
			this.stateMachine.getCurrentState() !== "initial" &&
			!this.stateMachine.getCurrentState()?.includes("roar")
		);
	}
}
