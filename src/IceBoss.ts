import { Events } from "./shared";
import { isTileWithPropertiesObject } from "./shared";
import { EnemyManager } from "./EnemyManager";
import { WaitForActive, Roar, PostSpawn, LeftRightMarch } from "./behaviors";
import { BaseMonster } from "./BaseMonster";

type AllStates = "initial" | "roar1" | "idle1" | "leftrightmarch";

export class IceBoss extends BaseMonster<AllStates> {
	hitPoints: number = 6;

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
			key: "idle",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 6,
				end: 8,
			}),
			frameRate: 10,
			repeat: 8,
		});
		this.anims.create({
			key: "explode-boss",
			frames: this.anims.generateFrameNumbers("monster_explode1"),
			frameRate: 24,
			repeat: 4,
			repeatDelay: 2,
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
		switch (state) {
			case "initial":
				return new WaitForActive(state, "roar1");
			case "roar1":
				return new Roar(state, "idle1");
			case "idle1":
				return new PostSpawn(state, "leftrightmarch");
			case "leftrightmarch":
				return new LeftRightMarch(state, "idle1");
		}
	}

	kill() {
		this.emit(Events.MonsterDying);
		this.setVelocity(0);
		this.data.set("stunned", true);
		this.setOrigin(0.5, 0.3);
		this.setDisplaySize(this.width * 2, this.height * 2);
		this.anims.play("explode-boss", true);
		this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.emit(Events.MonsterDefeated);
			this.destroy();
		});
	}

	isHittable(): boolean {
		return (
			this.stateMachine.getCurrentState() !== "initial" &&
			!this.stateMachine.getCurrentState().includes("roar")
		);
	}
}
