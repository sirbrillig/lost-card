import {
	DataKeys,
	isDynamicSprite,
	isTileWithPropertiesObject,
} from "./shared";
import { BlackOrb } from "./BlackOrb";
import { EnemyManager } from "./EnemyManager";
import {
	WaitForActive,
	Roar,
	RandomlyWalk,
	BlackOrbAttack,
	SummonCircle,
	TeleportToPlatform,
	RangedFireBall,
	RangedIceBall,
	IceAttack,
	SeekingVine,
} from "./behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "initial"
	| "roar1"
	| "summoncircle"
	| "walk"
	| "teleport"
	| "fireball"
	| "iceball"
	| "freeze"
	| "vine"
	| "attack1"
	| "attack2"
	| "attack3"
	| "attack4"
	| "attack5"
	| "attack6";

export class FinalBoss extends BaseMonster<AllStates> {
	hitPoints: number = 20;
	enemyManager: EnemyManager;

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
		this.enemyManager = enemyManager;
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

	chooseAttack(): "vine" | "iceball" | "fireball" {
		const number = Phaser.Math.Between(0, 2);
		switch (number) {
			case 0:
				return "vine";
			case 1:
				return "iceball";
			default:
				return "fireball";
		}
	}

	constructNewBehaviorFor(state: AllStates) {
		const orbSpeed = 210;
		const postOrbTime = 700;
		switch (state) {
			case "initial":
				return new WaitForActive(state, "roar1");
			case "roar1":
				return new Roar(state, "summoncircle");
			case "walk":
				return new RandomlyWalk(state, "attack1", {
					speed: 65,
					minWalkTime: 2000,
					maxWalkTime: 5000,
				});
			case "summoncircle":
				return new SummonCircle(state, "walk", {
					createMonster: () => {
						if (!this.body) {
							throw new Error("monster is invalid");
						}
						return new BlackOrb(
							this.scene,
							this.enemyManager,
							this.body.center.x,
							this.body.center.y
						);
					},
				});
			case "attack1":
				return new BlackOrbAttack(state, "attack2", orbSpeed, postOrbTime);
			case "attack2":
				return new BlackOrbAttack(state, "attack3", orbSpeed, postOrbTime);
			case "attack3":
				return new BlackOrbAttack(state, "attack4", orbSpeed, postOrbTime);
			case "attack4":
				return new BlackOrbAttack(state, "attack5", orbSpeed, postOrbTime);
			case "attack5":
				return new BlackOrbAttack(state, "attack6", orbSpeed, postOrbTime);
			case "attack6":
				return new BlackOrbAttack(state, "freeze", orbSpeed, postOrbTime);
			case "freeze":
				return new IceAttack(state, "teleport");
			case "teleport":
				return new TeleportToPlatform(state, this.chooseAttack(), 300);
			case "vine":
				return new SeekingVine(state, "summoncircle", 50, 350);
			case "iceball":
				return new RangedIceBall(state, "summoncircle", 60, 350);
			case "fireball":
				return new RangedFireBall(state, "summoncircle", 140, 350);
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
