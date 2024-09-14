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
	SlashTowardPlayer,
	ThrowRocks,
} from "./behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates =
	| "initial"
	| "roar1"
	| "summoncircle"
	| "walk"
	| "teleport"
	| "fireball1"
	| "fireball2"
	| "fireball3"
	| "iceball1"
	| "iceball2"
	| "iceball3"
	| "freeze"
	| "vine1"
	| "vine2"
	| "vine3"
	| "slash"
	| "rocks"
	| "attack1"
	| "attack2"
	| "attack3"
	| "attack4"
	| "attack5"
	| "attack6";

export class FinalBoss extends BaseMonster<AllStates> {
	hitPoints: number = 26;
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

	chooseAttack1(): "fireball1" | "slash" | "teleport" {
		const number = Phaser.Math.Between(1, 4);
		switch (number) {
			case 1:
				return "slash";
			case 2:
				return "teleport";
			case 3:
				return "teleport";
			default:
				return "fireball1";
		}
	}

	chooseAttack2(): "vine1" | "iceball1" | "rocks" {
		const number = Phaser.Math.Between(1, 3);
		switch (number) {
			case 1:
				return "vine1";
			case 2:
				return "iceball1";
			default:
				return "rocks";
		}
	}

	constructNewBehaviorFor(state: AllStates) {
		const orbSpeed = 210;
		const postOrbTime = 700;
		switch (state) {
			case "initial":
				return new WaitForActive(state, "roar1", { distance: 80 });
			case "roar1":
				return new Roar(state, "summoncircle");
			case "walk":
				return new RandomlyWalk(state, "attack1", {
					speed: 65,
					minWalkTime: 2000,
					maxWalkTime: 5000,
					walkSound: this.scene.sound.add("wind", {
						loop: true,
						rate: 1.5,
						volume: 0.5,
					}),
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
				return new IceAttack(state, this.chooseAttack1());
			case "teleport":
				return new TeleportToPlatform(state, this.chooseAttack2(), 300);
			case "vine1":
				return new SeekingVine(state, "vine2", 50, 350);
			case "vine2":
				return new SeekingVine(state, "vine3", 50, 350);
			case "vine3":
				return new SeekingVine(state, "summoncircle", 50, 350);
			case "iceball1":
				return new RangedIceBall(state, "iceball2", 60, 350);
			case "iceball2":
				return new RangedIceBall(state, "iceball3", 60, 350);
			case "iceball3":
				return new RangedIceBall(state, "summoncircle", 60, 350);
			case "fireball1":
				return new RangedFireBall(state, "fireball2", 140, 350);
			case "fireball2":
				return new RangedFireBall(state, "fireball3", 140, 350);
			case "fireball3":
				return new RangedFireBall(state, "summoncircle", 140, 350);
			case "slash":
				return new SlashTowardPlayer(state, "summoncircle", 180);
			case "rocks":
				return new ThrowRocks(state, "summoncircle", {
					speed: 500,
					rockCount: 4,
					delayBeforeEnd: 1000,
					delayBetweenRocks: 500,
				});
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
