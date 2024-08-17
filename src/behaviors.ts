import {
	isDynamicSprite,
	isTileWithPropertiesObject,
	getDirectionOfSpriteMovement,
	SpriteUp,
	SpriteDown,
	SpriteLeft,
	SpriteRight,
	Events,
	DataKeys,
	getTilesInRoom,
} from "./shared";
import { EnemyManager } from "./EnemyManager";
import { Behavior, BehaviorMachineInterface } from "./behavior";
import { MainEvents } from "./MainEvents";
import { MonsterA } from "./MonsterA";

export class WaitForActive<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#distanceToActivate: number = 100;
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(sprite: Phaser.GameObjects.Sprite): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		console.log("waiting for player");
		sprite.body.stop();
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (this.#isPlayerNear(sprite)) {
			console.log("waiting ended");
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		}
	}

	#isPlayerNear(sprite: Phaser.GameObjects.Sprite): boolean {
		const playerPosition: Phaser.Math.Vector2 = sprite.scene.data.get(
			DataKeys.PlayerPosition
		);
		const monsterPosition: Phaser.Math.Vector2 = sprite.data.get(
			DataKeys.MonsterPosition
		);
		const distance = monsterPosition.distance(playerPosition);
		if (distance > this.#distanceToActivate) {
			return false;
		}
		return true;
	}
}

export class Roar<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		console.log("roar");
		sprite.body.stop();
		sprite.anims.play(
			{
				key: "roar",
			},
			true
		);
		MainEvents.emit(Events.StunPlayer, true);
		sprite.scene.cameras.main.shake(2000, 0.009);
		sprite.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				console.log("roar complete", anim);
				MainEvents.emit(Events.StunPlayer, false);
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			}
		);
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
	}
}

export class SpawnEnemies<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	#maxSpawnedEnemies: number = 16;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		console.log("spawn");
		sprite.body.stop();
		sprite.anims.play(
			{
				key: "spawn",
			},
			true
		);

		this.#addEnemy(sprite, enemyManager);
		this.#addEnemy(sprite, enemyManager);
		this.#addEnemy(sprite, enemyManager);
		this.#addEnemy(sprite, enemyManager);

		sprite.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				console.log("spawn complete", anim);
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			}
		);
	}

	#addEnemy(sprite: Phaser.GameObjects.Sprite, enemyManager: EnemyManager) {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		const spawnedEnemyCount = sprite.data.get("spawnedEnemyCount") ?? 0;
		if (spawnedEnemyCount >= this.#maxSpawnedEnemies) {
			console.log("too many spawned enemies");
			return;
		}

		sprite.data.set("spawnedEnemyCount", spawnedEnemyCount + 1);

		const monster = new MonsterA(
			sprite.scene,
			enemyManager,
			sprite.body.x + 5,
			sprite.body.y + sprite.body.height
		);
		monster.once(Phaser.GameObjects.Events.DESTROY, () => {
			sprite?.data?.set("spawnedEnemyCount", spawnedEnemyCount - 1);
		});
		enemyManager.enemies.add(monster);
		sprite.once(Events.MonsterDying, () => {
			console.log("spawner is dying so killing spawned creatures");
			monster.emit(Events.MonsterKillRequest);
		});
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
	}
}

export class PostSpawn<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		console.log("post-spawn");
		sprite.body.stop();
		sprite.anims.play(
			{
				key: "idle",
			},
			true
		);
		sprite.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				console.log("post-spawn complete", anim);
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			}
		);
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
	}
}

export class RandomlyWalk<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#enemySpeed = 50;
	#minWalkTime = 500;
	#maxWalkTime = 4000;
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		setTimeout(() => {
			// sprite may have been destroyed before this happens
			sprite?.body?.setVelocity(0);
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		}, this.#getWalkingTime());
	}

	#getWalkingTime(): number {
		return Phaser.Math.Between(this.#minWalkTime, this.#maxWalkTime);
	}

	update(sprite: Phaser.GameObjects.Sprite) {
		if (!isDynamicSprite(sprite)) {
			return;
		}
		// If we are not moving, move in a random direction. If we are moving, keep
		// moving in that direction.
		const previousDirection = getDirectionOfSpriteMovement(sprite.body);
		if (previousDirection) {
			return;
		}
		const direction = Phaser.Math.Between(0, 3);
		switch (direction) {
			case SpriteUp:
				sprite.anims.play("up", true);
				sprite.body.setVelocityY(-this.#enemySpeed);
				break;
			case SpriteRight:
				sprite.anims.play("right", true);
				sprite.body.setVelocityX(this.#enemySpeed);
				break;
			case SpriteDown:
				sprite.anims.play("down", true);
				sprite.body.setVelocityY(this.#enemySpeed);
				break;
			case SpriteLeft:
				sprite.anims.play("left", true);
				sprite.body.setVelocityX(-this.#enemySpeed);
				break;
		}
	}
}

export class TeleportToWater<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#postTeleportDelay = 1000;
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		if (!enemyManager.activeRoom) {
			throw new Error("Cannot create monster outside of room");
		}
		sprite.body.setVelocity(0);
		// Get all water tiles in room
		const tiles = getTilesInRoom(
			enemyManager.map,
			enemyManager.activeRoom
		).filter((tile) => {
			if (isTileWithPropertiesObject(tile) && tile.properties.isWater) {
				return true;
			}
			return false;
		});
		if (tiles.length < 1) {
			throw new Error("No water tiles in room to teleport to");
		}
		// Choose tile at random
		const targetTile = tiles[Phaser.Math.Between(0, tiles.length - 1)];
		const x = targetTile.pixelX + targetTile.width / 2;
		// Move to tile
		sprite.setPosition(x, targetTile.pixelY);

		// Move to next state
		sprite.scene.time.addEvent({
			delay: this.#postTeleportDelay,
			callback: () => {
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	update() {}
}

export class PowerUp<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		sprite.scene.anims.create({
			key: "powerup",
			frames: sprite.anims.generateFrameNumbers("ice_powerup"),
			frameRate: 24,
			repeat: 2,
			showOnStart: true,
			hideOnComplete: true,
		});
		const effect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"powerup",
			0
		);
		effect.setDepth(5);
		effect.setAlpha(0.7);
		effect.anims.play("powerup", true);
		sprite.once(Events.MonsterDying, () => {
			effect?.destroy();
		});
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
	}

	update(): void {}
}

export class IceAttack<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	name: AllStates;
	#freezePlayerTime = 3000;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		sprite.scene.anims.create({
			key: "ice_attack",
			frames: sprite.anims.generateFrameNumbers("ice_attack"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
		});
		const effect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"ice_attack",
			0
		);
		sprite.scene.physics.add.existing(effect);
		effect.setSize(sprite.body.width * 5, sprite.body.height * 5);
		effect.setDisplaySize(sprite.body.width * 5, sprite.body.height * 5);
		effect.setDepth(5);
		effect.anims.play("ice_attack", true);

		sprite.scene.physics.add.overlap(enemyManager.player, effect, () => {
			MainEvents.emit(Events.FreezePlayer, true);
			sprite?.scene?.time.addEvent({
				delay: this.#freezePlayerTime,
				callback: () => {
					MainEvents.emit(Events.FreezePlayer, false);
				},
			});
		});

		sprite.once(Events.MonsterDying, () => {
			effect?.destroy();
		});
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
	}

	update(): void {}
}
