import { Idle } from "../lib/behaviors";
import {
	DataKeys,
	SpriteDirection,
	SpriteUp,
	SpriteDown,
	SpriteLeft,
	SpriteRight,
	isDynamicSprite,
	invertSpriteDirection,
} from "../lib/shared";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "./BaseMonster";
import { Behavior, BehaviorCompleteCallback } from "../lib/Behavior";

class EvilFogMove implements Behavior {
	name: string;
	#speed: number;
	#moveUpDown: boolean;
	#done = false;

	constructor(
		name: string,
		options: { speed: number; moveUpDown: boolean }
	) {
		this.name = name;
		this.#speed = options.speed;
		this.#moveUpDown = options.moveUpDown;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		_goToNextState: BehaviorCompleteCallback
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		this.#done = false;

		const prevDir: SpriteDirection | undefined =
			sprite.data.get("fogDirection");
		let dir: SpriteDirection;

		if (prevDir === undefined) {
			dir = this.#moveUpDown
				? Phaser.Math.Between(0, 1) === 1
					? SpriteUp
					: SpriteDown
				: Phaser.Math.Between(0, 1) === 1
					? SpriteLeft
					: SpriteRight;
		} else {
			dir = invertSpriteDirection(prevDir);
		}

		sprite.data.set("fogDirection", dir);

		switch (dir) {
			case SpriteUp:
				sprite.anims.play("up", true);
				sprite.body.setVelocityY(-this.#speed);
				break;
			case SpriteDown:
				sprite.anims.play("down", true);
				sprite.body.setVelocityY(this.#speed);
				break;
			case SpriteLeft:
				sprite.anims.play("left", true);
				sprite.body.setVelocityX(-this.#speed);
				break;
			case SpriteRight:
				sprite.anims.play("right", true);
				sprite.body.setVelocityX(this.#speed);
				break;
		}
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (this.#done) return;
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}

		const dir: SpriteDirection = sprite.data.get("fogDirection");
		let blocked = false;
		switch (dir) {
			case SpriteLeft:
				blocked = sprite.body.blocked.left;
				break;
			case SpriteRight:
				blocked = sprite.body.blocked.right;
				break;
			case SpriteUp:
				blocked = sprite.body.blocked.up;
				break;
			case SpriteDown:
				blocked = sprite.body.blocked.down;
				break;
		}

		if (blocked) {
			this.#done = true;
			sprite.body.setVelocity(0);
			goToNextState();
		}
	}
}

type AllStates = "move" | "pause";

export class EvilFog extends BaseMonster {
	speed: number = 40;
	pauseDuration: number = 2000;
	moveUpDown: boolean = false;
	primaryColor = 0x5a3580;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, enemyManager, x, y, "monsters1", 9);
		this.data.set(DataKeys.Pushable, false);
		this.data.set(DataKeys.Freezable, false);
		this.data.set(DataKeys.Flying, true);
	}

	isHittable(): boolean {
		return false;
	}

	getInitialState(): AllStates {
		return "move";
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 9,
				end: 11,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 21,
				end: 23,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 33,
				end: 35,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 45,
				end: 47,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.anims.create({
			key: "idle",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 9,
				end: 11,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.setTintFill(0x888888);
	}

	constructNewBehaviorFor(state: string) {
		switch (state) {
			case "move":
				this.nextState = "pause";
				return new EvilFogMove("move", {
					speed: this.speed,
					moveUpDown: this.moveUpDown,
				});
			case "pause":
				this.nextState = "move";
				return new Idle("pause", "idle", this.pauseDuration);
		}
	}
}
