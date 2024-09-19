import {
	Sound,
	moveHitboxInFrontOfSprite,
	DataKeys,
	getDirectionOfSpriteMovement,
	SpriteDirection,
	isTilemapTile,
	isDynamicSprite,
	isTileWithPropertiesObject,
	SpriteUp,
	SpriteDown,
	SpriteLeft,
	SpriteRight,
	Events,
	getTilesInRoom,
	createVelocityForDirection,
	vibrate,
} from "./shared";
import { EnemyManager } from "./EnemyManager";
import { Behavior, BehaviorMachineInterface } from "./behavior";
import { MainEvents } from "./MainEvents";
import { MountainMonster } from "./MountainMonster";

export class WaitForActive<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#distanceToActivate: number = 100;
	#maxWaitTime: number | undefined;
	#nextState: AllStates;
	name: AllStates;

	constructor(
		name: AllStates,
		nextState: AllStates,
		config?: {
			distance?: number;
			maxWaitTime?: number | undefined;
		}
	) {
		this.name = name;
		this.#nextState = nextState;
		if (config?.distance) {
			this.#distanceToActivate = config.distance;
		}
		if (config?.maxWaitTime) {
			this.#maxWaitTime = config.maxWaitTime;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		sprite.body.stop();

		if (this.#maxWaitTime) {
			sprite.scene?.time.addEvent({
				delay: this.#maxWaitTime,
				callback: () => {
					stateMachine.popState();
					stateMachine.pushState(this.#nextState);
				},
			});
		}
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!enemyManager.player.body) {
			return;
		}
		if (!isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		const distance = Phaser.Math.Distance.BetweenPoints(
			sprite.body.center,
			enemyManager.player.body.center
		);
		if (distance < this.#distanceToActivate) {
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		}
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
		sprite.body.stop();
		sprite.anims.play("roar", true);
		const roar = sprite.scene.sound.add("roar", {
			loop: false,
			volume: 0.9,
		});
		roar.play();
		MainEvents.emit(Events.StunPlayer, true);
		sprite.scene.cameras.main.shake(2000, 0.009);
		vibrate(sprite.scene, 2, 1800);

		sprite.scene.anims.create({
			key: "orange_boom",
			frames: sprite.anims.generateFrameNumbers("orange_boom"),
			frameRate: 24,
			repeat: -1,
			showOnStart: true,
			hideOnComplete: true,
		});
		const effect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"orange_boom",
			0
		);
		if ("primaryColor" in sprite) {
			effect.setTint(sprite.primaryColor as number);
		}
		effect.setDepth(5);
		effect.anims.play("orange_boom", true);
		sprite.once(Events.MonsterDying, () => {
			effect?.destroy();
		});

		sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			MainEvents.emit(Events.StunPlayer, false);
			roar.stop();
			effect?.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
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
	#maxSpawnedEnemies: number = 18;
	#enemiesToSpawn: number = 6;
	#postSpawnTime: number = 1000;
	#createMonster: (
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) => Phaser.GameObjects.Sprite = (scene, enemyManager, x, y) => {
		return new MountainMonster(scene, enemyManager, x, y);
	};
	name: AllStates;

	constructor(
		name: AllStates,
		nextState: AllStates,
		config?: {
			enemiesToSpawn?: number;
			maxSpawnedEnemies?: number;
			postSpawnTime?: number;
			createMonster: (
				scene: Phaser.Scene,
				enemyManager: EnemyManager,
				x: number,
				y: number
			) => Phaser.GameObjects.Sprite;
		}
	) {
		this.name = name;
		this.#nextState = nextState;
		if (config?.enemiesToSpawn) {
			this.#enemiesToSpawn = config.enemiesToSpawn;
		}
		if (config?.maxSpawnedEnemies) {
			this.#maxSpawnedEnemies = config.maxSpawnedEnemies;
		}
		if (config?.postSpawnTime) {
			this.#postSpawnTime = config.postSpawnTime;
		}
		if (config?.createMonster) {
			this.#createMonster = config.createMonster;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		sprite.body.stop();
		sprite.anims.play(
			{
				key: "spawn",
			},
			true
		);

		for (let x = 0; x < this.#enemiesToSpawn; x++) {
			this.#addEnemy(sprite, enemyManager);
		}

		sprite.scene.time.addEvent({
			delay: this.#postSpawnTime,
			callback: () => {
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
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

		const monster = this.#createMonster(
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
		MainEvents.once(Events.LeavingRoom, () => {
			monster.emit(Events.MonsterKillRequest);
		});
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
	}
}

export class Nothing<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	#animationKey: string;
	#idleTime: number;
	name: AllStates;

	constructor(
		name: AllStates,
		nextState: AllStates,
		animationKey: string,
		idleTime: number
	) {
		this.name = name;
		this.#nextState = nextState;
		this.#animationKey = animationKey;
		this.#idleTime = idleTime;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		sprite.anims.play(this.#animationKey, true);
		sprite.scene.time.addEvent({
			delay: this.#idleTime,
			callback: () => {
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	update(): void {}
}

export class Idle<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	#animationKey: string;
	#idleTime: number;
	name: AllStates;

	constructor(
		name: AllStates,
		nextState: AllStates,
		animationKey: string,
		idleTime: number
	) {
		this.name = name;
		this.#nextState = nextState;
		this.#animationKey = animationKey;
		this.#idleTime = idleTime;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		sprite.body.stop();
		sprite.anims.play(this.#animationKey, true);
		sprite.scene.time.addEvent({
			delay: this.#idleTime,
			callback: () => {
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	update(): void {}
}

export class RandomlyWalk<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#enemySpeed = 50;
	#minWalkTime = 800;
	#maxWalkTime = 4000;
	#nextState: AllStates;
	name: AllStates;
	#walkSound: Sound;

	constructor(
		name: AllStates,
		nextState: AllStates,
		config?: {
			speed?: number;
			minWalkTime?: number;
			maxWalkTime?: number;
			walkSound?: Sound;
		}
	) {
		this.name = name;
		this.#nextState = nextState;
		if (config?.speed) {
			this.#enemySpeed = config.speed;
		}
		if (config?.minWalkTime) {
			this.#minWalkTime = config.minWalkTime;
		}
		if (config?.maxWalkTime) {
			this.#maxWalkTime = config.maxWalkTime;
		}
		if (config?.walkSound) {
			this.#walkSound = config.walkSound;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		this.#walkSound =
			this.#walkSound ??
			sprite.scene.sound.add("enemy-walk", {
				loop: true,
				rate: 1.5,
				volume: 0.5,
			});
		this.#walkSound.play();

		const direction = getWalkingDirection(sprite);
		this.#walkInDirection(sprite, direction);

		sprite.on(Events.MonsterDying, () => {
			this.#walkSound.stop();
		});

		sprite.scene.time.addEvent({
			delay: this.#getWalkingTime(),
			callback: () => {
				sprite?.body?.setVelocity(0);
				this.#walkSound.stop();
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	#getWalkingTime(): number {
		return Phaser.Math.Between(this.#minWalkTime, this.#maxWalkTime);
	}

	#walkInDirection(
		sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
		direction: SpriteDirection
	) {
		sprite.data.set("direction", direction);
		const velocity = createVelocityForDirection(this.#enemySpeed, direction);
		sprite.body.setVelocity(velocity.x, velocity.y);
		sprite.anims.play(getWalkAnimationKeyForDirection(direction), true);
	}

	update(sprite: Phaser.GameObjects.Sprite) {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		// If you hit a wall, change direction.
		if (sprite.body?.velocity.x === 0 && sprite.body.velocity.y === 0) {
			const direction = getWalkingDirection(sprite);
			this.#walkInDirection(sprite, direction);
		}
	}
}

export class LeftRightMarch<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#enemySpeed = 70;
	#minWalkTime = 600;
	#maxWalkTime = 4000;
	#nextState: AllStates;
	name: AllStates;

	constructor(
		name: AllStates,
		nextState: AllStates,
		config?: { speed?: number; minWalkTime?: number; maxWalkTime?: number }
	) {
		this.name = name;
		this.#nextState = nextState;
		if (config?.speed) {
			this.#enemySpeed = config.speed;
		}
		if (config?.minWalkTime) {
			this.#minWalkTime = config.minWalkTime;
		}
		if (config?.maxWalkTime) {
			this.#maxWalkTime = config.maxWalkTime;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}

		const direction = getWalkingDirectionLeftRight(sprite);
		sprite.data.set("direction", direction);
		const walkSound = sprite.scene.sound.add("enemy-walk", {
			loop: true,
			rate: 1.5,
			volume: 0.5,
		});
		walkSound.play();
		switch (direction) {
			case SpriteRight:
				sprite.anims.play("right", true);
				sprite.body.setVelocityX(this.#enemySpeed);
				break;
			case SpriteLeft:
				sprite.anims.play("left", true);
				sprite.body.setVelocityX(-this.#enemySpeed);
				break;
		}

		sprite.scene.time.addEvent({
			delay: this.#getWalkingTime(),
			callback: () => {
				walkSound.stop();
				// sprite may have been destroyed before this happens
				sprite?.body?.setVelocity(0);
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	#getWalkingTime(): number {
		return Phaser.Math.Between(this.#minWalkTime, this.#maxWalkTime);
	}

	update() {}
}

export class RandomTeleport<AllStates extends string>
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

		sprite.scene.anims.create({
			key: "teleport",
			frames: sprite.anims.generateFrameNumbers("white_fire_circle"),
			frameRate: 24,
			repeat: 0,
			showOnStart: true,
			hideOnComplete: true,
		});
		const effect1 = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"teleport",
			0
		);
		effect1.setDepth(5);
		effect1.anims.play("teleport", true);
		sprite.scene.sound.play("holy");
		sprite.once(Events.MonsterDying, () => {
			effect1?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			effect1?.destroy();
		});

		// Get all tiles in room
		const tiles = getTilesInRoom(
			enemyManager.map,
			enemyManager.activeRoom
		).filter((tile) => {
			if (isTileWithPropertiesObject(tile) && tile.properties.collides) {
				return false;
			}
			return true;
		});
		if (tiles.length < 1) {
			console.log("No tiles in room to teleport to");
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		}
		// Choose tile at random
		const targetTile = tiles[Phaser.Math.Between(0, tiles.length - 1)];
		const x = targetTile.pixelX + targetTile.width / 2;
		// Move to tile
		sprite.setPosition(x, targetTile.pixelY);

		const effect2 = sprite.scene.add.sprite(
			x,
			targetTile.pixelY,
			"teleport",
			0
		);
		effect2.setDepth(8);
		effect2.anims.play("teleport", true);
		sprite.once(Events.MonsterDying, () => {
			effect2?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			effect2?.destroy();
		});

		// Move to next state
		sprite.scene.time.addEvent({
			delay: this.#postTeleportDelay,
			callback: () => {
				effect1?.destroy();
				effect2?.destroy();
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	update() {}
}

export class TeleportToPlatform<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#postTeleportDelay = 1500;
	#nextState: AllStates;
	name: AllStates;

	constructor(
		name: AllStates,
		nextState: AllStates,
		postTeleportDelay: number
	) {
		this.name = name;
		this.#nextState = nextState;
		this.#postTeleportDelay = postTeleportDelay;
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

		sprite.scene.anims.create({
			key: "teleport",
			frames: sprite.anims.generateFrameNumbers("white_fire_circle"),
			frameRate: 24,
			repeat: 0,
			showOnStart: true,
			hideOnComplete: true,
		});
		const effect1 = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"teleport",
			0
		);
		effect1.setDepth(5);
		effect1.anims.play("teleport", true);
		sprite.scene.sound.play("holy");
		sprite.once(Events.MonsterDying, () => {
			effect1?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			effect1?.destroy();
		});

		// Get all platform tiles in room
		const tiles = getTilesInRoom(
			enemyManager.map,
			enemyManager.activeRoom
		).filter((tile) => {
			if (isTileWithPropertiesObject(tile) && tile.properties.isPlatform) {
				return true;
			}
			return false;
		});
		if (tiles.length < 1) {
			console.log("Too few platform tiles in room to teleport to");
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		}
		// Choose furthest tile
		let targetTile = tiles[0];
		let lastDistance = 0;
		tiles.forEach((tile) => {
			const distance = Phaser.Math.Distance.BetweenPoints(sprite.body.center, {
				x: tile.pixelX,
				y: tile.pixelY,
			});
			if (distance > lastDistance) {
				lastDistance = distance;
				targetTile = tile;
			}
		});
		sprite.setVisible(false);
		const x = targetTile.pixelX + targetTile.width / 2;

		// Create movement effect between tiles
		const moveEffect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"teleport",
			0
		);
		moveEffect.setDepth(8);
		moveEffect.anims.play(
			{
				key: "teleport",
				repeat: -1,
			},
			true
		);
		sprite.scene.tweens.add({
			targets: moveEffect,
			duration: 400,
			x,
			y: targetTile.pixelY,
			onComplete: () => {
				moveEffect?.destroy();
			},
		});
		sprite.once(Events.MonsterDying, () => {
			moveEffect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			moveEffect?.destroy();
		});

		// Move to tile
		sprite.setPosition(x, targetTile.pixelY);
		sprite.setVisible(true);
		sprite.scene.sound.play("holy");

		const effect2 = sprite.scene.add.sprite(
			x,
			targetTile.pixelY,
			"teleport",
			0
		);
		effect2.setDepth(8);
		effect2.anims.play("teleport", true);
		sprite.once(Events.MonsterDying, () => {
			effect2?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			effect2?.destroy();
		});

		// Move to next state
		sprite.scene.time.addEvent({
			delay: this.#postTeleportDelay,
			callback: () => {
				effect1?.destroy();
				effect2?.destroy();
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	update() {}
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
			console.log("No water tiles in room to teleport to");
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		}
		// Choose tile at random
		const targetTile = tiles[Phaser.Math.Between(0, tiles.length - 1)];
		const x = targetTile.pixelX + targetTile.width / 2;
		// Move to tile
		sprite.setPosition(x, targetTile.pixelY);
		sprite.scene.sound.play("holy");

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
	#chargeTime = 1300;
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
			repeat: -1,
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
		sprite.scene.sound.play("ice-charge");
		sprite.once(Events.MonsterDying, () => {
			sprite.scene?.sound.stopByKey("ice-charge");
			effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			effect?.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
		sprite.scene.time.addEvent({
			delay: this.#chargeTime,
			callback: () => {
				sprite?.scene?.sound.stopByKey("ice-charge");
				effect?.destroy();
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	update(): void {}
}

export class SlashTowardPlayer<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	name: AllStates;
	#speed = 100;
	#hitboxSize = 30;
	#effect: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

	constructor(name: AllStates, nextState: AllStates, speed: number) {
		this.name = name;
		this.#nextState = nextState;
		this.#speed = speed;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (
			!sprite.body ||
			!isDynamicSprite(sprite) ||
			!isDynamicSprite(enemyManager.player)
		) {
			throw new Error("Could not update monster");
		}

		sprite.scene.physics.moveTo(
			sprite,
			enemyManager.player.body.center.x,
			enemyManager.player.body.center.y,
			this.#speed
		);
		const direction = getDirectionOfSpriteMovement(sprite.body);
		if (!direction) {
			return;
		}
		sprite.data.set("direction", direction);
		sprite.anims.play(getWalkAnimationKeyForDirection(direction), true);

		sprite.scene.anims.create({
			key: "slash-effect",
			frames: sprite.anims.generateFrameNumbers("slash-effect"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
			yoyo: true,
		});
		const effect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"slash-effect",
			0
		);
		sprite.scene.physics.add.existing(effect);
		if (!isDynamicSprite(effect)) {
			throw new Error("Slash effect is broken");
		}
		this.#effect = effect;
		this.#effect.setSize(this.#hitboxSize, this.#hitboxSize);
		this.#effect.setDisplaySize(this.#hitboxSize, this.#hitboxSize);
		this.#effect.setDepth(5);
		moveHitboxInFrontOfSprite(sprite, direction, this.#effect);
		this.#effect.anims.play("slash-effect", true);
		sprite.scene.sound.play("attack");

		sprite.scene.physics.add.overlap(enemyManager.player, this.#effect, () => {
			MainEvents.emit(Events.EnemyHitPlayer, true);
		});

		sprite.once(Events.MonsterDying, () => {
			this.#effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			this.#effect?.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
		this.#effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.#effect?.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		const direction = getDirectionOfSpriteMovement(sprite.body);
		if (!direction) {
			return;
		}
		if (isDynamicSprite(this.#effect)) {
			moveHitboxInFrontOfSprite(sprite, direction, this.#effect);
		}
	}
}

export class BigSwing<AllStates extends string>
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
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		sprite.scene.anims.create({
			key: "slash-effect",
			frames: sprite.anims.generateFrameNumbers("slash-effect"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
			yoyo: true,
		});
		const effect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"slash-effect",
			0
		);
		sprite.scene.physics.add.existing(effect);
		effect.setSize(sprite.body.width * 4, sprite.body.height * 4);
		effect.setDisplaySize(sprite.body.width * 4, sprite.body.height * 4);
		effect.setDepth(5);
		effect.anims.play("slash-effect", true);
		sprite.scene.sound.play("attack");

		sprite.scene.physics.add.overlap(enemyManager.player, effect, () => {
			MainEvents.emit(Events.EnemyHitPlayer, true);
		});

		sprite.once(Events.MonsterDying, () => {
			effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			effect?.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect?.destroy();
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
		// Both use width so this remains square
		effect.setSize(sprite.body.width * 5, sprite.body.width * 5);
		effect.setDisplaySize(sprite.body.width * 5, sprite.body.width * 5);
		effect.setDepth(5);
		effect.anims.play("ice_attack", true);
		sprite.scene.sound.play("ice");

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
		MainEvents.once(Events.LeavingRoom, () => {
			effect?.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect?.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
	}

	update(): void {}
}

export class SeekingVine<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	#speed = 50;
	#postAttackTime = 1000;
	name: AllStates;
	#effect: Phaser.GameObjects.Sprite;

	constructor(
		name: AllStates,
		nextState: AllStates,
		speed: number,
		postAttackTime: number
	) {
		this.name = name;
		this.#nextState = nextState;
		this.#speed = speed;
		this.#postAttackTime = postAttackTime;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		this.#effect = new Seeker(
			sprite.scene,
			enemyManager,
			sprite.body.center.x,
			sprite.body.center.y,
			"green-ball",
			0,
			this.#speed
		);

		sprite.once(Events.MonsterDying, () => {
			this.#effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			this.#effect?.destroy();
		});

		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	update(): void {}
}

export class SummonCircle<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	#speed = 1;
	name: AllStates;
	effects: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	#sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	#createMonster: (
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) => Phaser.GameObjects.Sprite = (scene, enemyManager, x, y) => {
		return new MountainMonster(scene, enemyManager, x, y);
	};

	constructor(
		name: AllStates,
		nextState: AllStates,
		config?: {
			enemiesToSpawn?: number;
			maxSpawnedEnemies?: number;
			createMonster: (
				scene: Phaser.Scene,
				enemyManager: EnemyManager,
				x: number,
				y: number
			) => Phaser.GameObjects.Sprite;
		}
	) {
		this.name = name;
		this.#nextState = nextState;
		if (config?.createMonster) {
			this.#createMonster = config.createMonster;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		this.#sprite = sprite;
		sprite.scene.anims.create({
			key: "fire-power",
			frames: sprite.anims.generateFrameNumbers("fire-power"),
			frameRate: 50,
			showOnStart: true,
			hideOnComplete: true,
			yoyo: true,
		});

		const existingEffects: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] =
			this.#sprite.data.get("SummonCircle")?.effects ?? [];
		existingEffects.forEach((effect) => {
			if (!isDynamicSprite(effect)) {
				return;
			}
			effect.destroy();
		});
		this.#sprite.data.remove("SummonCircle");

		const numberOfEffects = 6;
		for (let x = 0; x < numberOfEffects; x += 1) {
			sprite.scene.time.addEvent({
				delay: 450 * x,
				callback: () => {
					if (!sprite.body || !isDynamicSprite(sprite)) {
						return;
					}
					this.effects.push(this.createEffect(sprite, enemyManager));
					Phaser.Actions.PlaceOnCircle(
						this.effects,
						new Phaser.Geom.Circle(
							sprite.body.center.x,
							sprite.body.center.y,
							40
						)
					);
				},
			});
		}

		sprite.scene.time.addEvent({
			delay: 450 * (numberOfEffects + 1),
			callback: () => {
				this.#sprite?.data?.set("SummonCircle", { effects: this.effects });
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	createEffect(sprite: Phaser.GameObjects.Sprite, enemyManager: EnemyManager) {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		const monster = this.#createMonster(
			sprite.scene,
			enemyManager,
			sprite.body.x + 5,
			sprite.body.y + sprite.body.height
		);
		enemyManager.enemies.add(monster);
		sprite.once(Events.MonsterDying, () => {
			console.log("spawner is dying so killing spawned creatures");
			monster?.emit(Events.MonsterKillRequest);
		});
		MainEvents.once(Events.LeavingRoom, () => {
			monster?.emit(Events.MonsterKillRequest);
		});
		if (!isDynamicSprite(monster)) {
			throw new Error("Could not update monster");
		}

		return monster;
	}

	update(): void {
		Phaser.Actions.RotateAroundDistance(
			this.effects,
			this.#sprite.body.center,
			Phaser.Math.DegToRad(this.#speed),
			40
		);
	}
}

export class BlackOrbAttack<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	#speed = 50;
	#postAttackTime = 1000;
	#maxLifetime = 6000;
	name: AllStates;

	constructor(
		name: AllStates,
		nextState: AllStates,
		speed: number,
		postAttackTime: number
	) {
		this.name = name;
		this.#nextState = nextState;
		this.#speed = speed;
		this.#postAttackTime = postAttackTime;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		const circleData:
			| { effects?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] }
			| undefined = sprite.data.get("SummonCircle");
		if (!Array.isArray(circleData?.effects)) {
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
			return;
		}
		if (circleData.effects.length === 0) {
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
			return;
		}
		const enemy = circleData.effects.pop();
		if (!enemy) {
			throw new Error("Could not update monster");
		}
		sprite.data.set("SummonCircle", circleData);
		if (!enemy.active) {
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
			return;
		}

		sprite.scene.physics.moveToObject(enemy, enemyManager.player, this.#speed);

		sprite.scene.physics.add.overlap(enemyManager.player, enemy, () => {
			MainEvents.emit(Events.EnemyHitPlayer, true);
			enemy.emit(Events.MonsterKillRequest);
		});
		MainEvents.once(Events.LeavingRoom, () => {
			enemy?.emit(Events.MonsterKillRequest);
		});

		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});

		sprite.scene.time.addEvent({
			delay: this.#maxLifetime,
			callback: () => {
				enemy?.emit(Events.MonsterKillRequest);
			},
		});
	}

	update(): void {}
}

export class RangedFireBall<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	#speed = 50;
	#postAttackTime = 1000;
	name: AllStates;

	constructor(
		name: AllStates,
		nextState: AllStates,
		speed: number,
		postAttackTime: number
	) {
		this.name = name;
		this.#nextState = nextState;
		this.#speed = speed;
		this.#postAttackTime = postAttackTime;
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
			key: "fire-power",
			frames: sprite.anims.generateFrameNumbers("fire-power"),
			frameRate: 50,
			showOnStart: true,
			hideOnComplete: true,
			yoyo: true,
		});
		const effect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"fire-power",
			0
		);
		sprite.scene.physics.add.existing(effect);
		effect.setDepth(5);
		effect.anims.play(
			{
				key: "fire-power",
				repeat: 20,
			},
			true
		);
		const fireSound = sprite.scene.sound.add("fire", { volume: 0.4 });
		fireSound.play();
		if (!isDynamicSprite(effect)) {
			throw new Error("Could not update fire ball");
		}
		effect.setDisplaySize(effect.body.width * 0.8, effect.body.height * 0.8);
		effect.body.setSize(effect.body.width * 0.5, effect.body.height * 0.5);
		sprite.scene.physics.moveToObject(effect, enemyManager.player, this.#speed);

		sprite.scene.physics.add.overlap(enemyManager.player, effect, () => {
			fireSound?.stop();
			MainEvents.emit(Events.EnemyHitPlayer, true);
			effect.destroy();
		});

		sprite.once(Events.MonsterDying, () => {
			fireSound?.stop();
			effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			fireSound?.stop();
			effect?.destroy();
		});

		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});

		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			fireSound?.stop();
			effect?.destroy();
		});
	}

	update(): void {}
}

export class RangedIceBall<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	#speed = 50;
	#postAttackTime = 1000;
	name: AllStates;

	constructor(
		name: AllStates,
		nextState: AllStates,
		speed: number,
		postAttackTime: number
	) {
		this.name = name;
		this.#nextState = nextState;
		this.#speed = speed;
		this.#postAttackTime = postAttackTime;
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
			key: "ice_ball",
			frames: sprite.anims.generateFrameNumbers("ice_ball"),
			frameRate: 50,
			showOnStart: true,
			hideOnComplete: true,
			yoyo: true,
		});
		const effect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"ice_ball",
			0
		);
		sprite.scene.physics.add.existing(effect);
		effect.setDepth(5);
		effect.anims.play(
			{
				key: "ice_ball",
				repeat: 20,
			},
			true
		);
		sprite.scene.sound.play("ice");
		if (!isDynamicSprite(effect)) {
			throw new Error("Could not update ice ball");
		}
		effect.setDisplaySize(effect.body.width * 0.8, effect.body.height * 0.8);
		effect.body.setSize(effect.body.width * 0.5, effect.body.height * 0.5);
		sprite.scene.physics.moveToObject(effect, enemyManager.player, this.#speed);

		sprite.scene.physics.add.overlap(enemyManager.player, effect, () => {
			sprite?.scene?.sound.stopByKey("ice");
			MainEvents.emit(Events.EnemyHitPlayer, true);
			effect.destroy();
		});

		sprite.once(Events.MonsterDying, () => {
			sprite.scene?.sound.stopByKey("ice");
			effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			sprite.scene?.sound.stopByKey("ice");
			effect?.destroy();
		});

		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});

		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			sprite?.scene?.sound?.stopByKey("ice");
			effect?.destroy();
		});
	}

	update(): void {}
}

export class WalkWithFire<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	name: AllStates;
	#effect: Phaser.GameObjects.Sprite;
	#enemySpeed = 50;
	#endAfter = 1000;
	#rotateDistance = 25;

	constructor(
		name: AllStates,
		nextState: AllStates,
		config?: { speed?: number; endAfter?: number; rotateDistance?: number }
	) {
		this.name = name;
		this.#nextState = nextState;
		if (config?.speed) {
			this.#enemySpeed = config.speed;
		}
		if (config?.endAfter) {
			this.#endAfter = config.endAfter;
		}
		if (config?.rotateDistance) {
			this.#rotateDistance = config.rotateDistance;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		const direction = getWalkingDirection(sprite);
		this.#walkInDirection(sprite, direction);
		const walkSound = sprite.scene.sound.add("enemy-walk", {
			loop: true,
			rate: 1.5,
			volume: 0.5,
		});
		walkSound.play();

		sprite.scene.anims.create({
			key: "fire-power",
			frames: sprite.anims.generateFrameNumbers("fire-power"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
			repeat: 2,
		});
		this.#effect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"fire-power",
			0
		);
		sprite.scene.physics.add.existing(this.#effect);
		this.#effect.setDepth(5);
		this.#effect.anims.play(
			{
				key: "fire-power",
				repeat: 3,
			},
			true
		);
		if (!isDynamicSprite(this.#effect)) {
			throw new Error("Could not update fire ball");
		}
		this.#effect.setDisplaySize(
			this.#effect.body.width * 0.8,
			this.#effect.body.height * 0.8
		);
		this.#effect.body.setSize(
			this.#effect.body.width * 0.5,
			this.#effect.body.height * 0.5
		);
		sprite.scene.physics.add.overlap(enemyManager.player, this.#effect, () => {
			walkSound.stop();
			MainEvents.emit(Events.EnemyHitPlayer, true);
			this.#effect.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});

		sprite.once(Events.MonsterDying, () => {
			walkSound.stop();
			this.#effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			walkSound.stop();
			this.#effect?.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
		sprite.scene.time.addEvent({
			delay: this.#endAfter,
			callback: () => {
				walkSound?.stop();
				this.#effect?.destroy();
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	#walkInDirection(
		sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
		direction: SpriteDirection
	) {
		sprite.data.set("direction", direction);
		const velocity = createVelocityForDirection(this.#enemySpeed, direction);
		sprite.body.setVelocity(velocity.x, velocity.y);
		sprite.anims.play(getWalkAnimationKeyForDirection(direction), true);
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("Could not update fire ball");
		}
		// If you hit a wall, change direction.
		if (sprite.body?.velocity.x === 0 && sprite.body.velocity.y === 0) {
			const direction = getWalkingDirection(sprite);
			this.#walkInDirection(sprite, direction);
		}
		Phaser.Actions.RotateAroundDistance(
			[this.#effect],
			sprite.body.center,
			Phaser.Math.DegToRad(5),
			this.#rotateDistance
		);
	}
}

export class IceBeam<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	iceMeltTime = 4000;
	attackSpeed = 150;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates, attackSpeed: number) {
		this.name = name;
		this.#nextState = nextState;
		this.attackSpeed = attackSpeed;
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
			key: "ice_beam",
			frames: sprite.anims.generateFrameNumbers("ice_beam"),
			frameRate: 50,
			showOnStart: true,
			hideOnComplete: true,
			yoyo: true,
		});
		const effect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"ice_beam",
			0
		);
		sprite.scene.physics.add.existing(effect);
		effect.setDepth(5);
		effect.anims.play(
			{
				key: "ice_beam",
				repeat: 4,
			},
			true
		);
		sprite.scene.sound.play("ice");
		if (!isDynamicSprite(effect)) {
			throw new Error("Could not update ice beam");
		}
		effect.setDisplaySize(effect.body.width * 0.8, effect.body.height * 0.8);
		effect.body.setSize(effect.body.width * 0.5, effect.body.height * 0.5);
		sprite.scene.physics.moveToObject(
			effect,
			enemyManager.player,
			this.attackSpeed
		);

		const landLayer = enemyManager.map.getLayer("Background");
		if (!landLayer) {
			throw new Error("Could not find land layer for ice beam");
		}
		sprite.scene.physics.add.overlap(
			effect,
			landLayer.tilemapLayer,
			(_, tile) => {
				if (!isTilemapTile(tile)) {
					return;
				}
				this.freezeWaterTile(tile, sprite, enemyManager);
			}
		);

		sprite.scene.physics.add.overlap(enemyManager.player, effect, () => {
			sprite.scene?.sound.stopByKey("freeze");
			MainEvents.emit(Events.EnemyHitPlayer, true);
			effect.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});

		sprite.once(Events.MonsterDying, () => {
			sprite.scene?.sound.stopByKey("freeze");
			effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			sprite.scene?.sound.stopByKey("freeze");
			effect?.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			sprite.scene?.sound.stopByKey("freeze");
			effect?.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});
	}

	freezeWaterTile(
		tile: Phaser.Tilemaps.Tile,
		sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
		enemyManager: EnemyManager
	) {
		if (!isTileWithPropertiesObject(tile) || !tile.properties.isWater) {
			return;
		}
		sprite.scene.sound.play("freeze");
		const iceTileFrame = 284;
		enemyManager.map.removeTile(tile, iceTileFrame);
		sprite.scene.time.addEvent({
			delay: this.iceMeltTime,
			callback: () => this.meltFrozenTile(tile, sprite, enemyManager),
		});
	}

	meltFrozenTile(
		tile: Phaser.Tilemaps.Tile,
		sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
		enemyManager: EnemyManager
	) {
		if (
			!isTileWithPropertiesObject(tile) ||
			!tile.properties.isWater ||
			!sprite?.scene
		) {
			return;
		}
		if (sprite.scene.physics.overlapTiles(enemyManager.player, [tile])) {
			// Do not melt the tile we stand on.
			sprite.scene.time.addEvent({
				delay: this.iceMeltTime,
				callback: () => this.meltFrozenTile(tile, sprite, enemyManager),
			});
			return;
		}

		enemyManager.map.removeTile(tile);
		enemyManager.map.putTileAt(tile, tile.x, tile.y, true, tile.layer.name);
		const landLayer = enemyManager.map.getLayer("Background");
		if (!landLayer) {
			throw new Error("Could not find land layer for ice beam");
		}
		landLayer.tilemapLayer.setCollisionByProperty({ collides: true });
	}

	update(): void {}
}

function getWalkAnimationKeyForDirection(direction: SpriteDirection): string {
	switch (direction) {
		case SpriteUp:
			return "up";
		case SpriteRight:
			return "right";
		case SpriteDown:
			return "down";
		case SpriteLeft:
			return "left";
	}
}

export class SwoopAttack<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	name: AllStates;
	#followTime: number | undefined;
	#awareDistance: number | undefined;
	#speed: number = 10;
	#maxSpeed: number = 30;
	#lastDistance = 0;
	walkSound: Sound;

	constructor(
		name: AllStates,
		nextState: AllStates,
		config?: {
			speed?: number;
			maxSpeed?: number;
			followTime?: number;
			awareDistance?: number;
		}
	) {
		this.name = name;
		this.#nextState = nextState;
		if (config?.followTime) {
			this.#followTime = config.followTime;
		}
		if (config?.awareDistance) {
			this.#awareDistance = config.awareDistance;
		}
		if (config?.speed) {
			this.#speed = config.speed;
		}
		if (config?.maxSpeed) {
			this.#maxSpeed = config.maxSpeed;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}

		this.walkSound = sprite.scene.sound.add("wind", {
			loop: true,
			rate: 1.5,
			volume: 0.5,
		});

		if (this.#followTime) {
			sprite.scene.time.addEvent({
				delay: this.#followTime,
				callback: () => {
					sprite?.body?.setVelocity(0);
					stateMachine.popState();
					stateMachine.pushState(this.#nextState);
				},
			});
		}
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		if (!enemyManager.player.body) {
			return;
		}
		if (sprite.data.get(DataKeys.Stunned)) {
			return;
		}

		const distance = Phaser.Math.Distance.BetweenPoints(
			sprite.body.center,
			enemyManager.player.body.center
		);
		if (this.#awareDistance) {
			if (distance > this.#awareDistance) {
				sprite.body.stop();
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
				return;
			}
		}

		// If we are extremely close we don't need to change course.
		if (distance < 10) {
			return;
		}

		// If the distance is decreasing we don't need to change course.
		if (distance < this.#lastDistance) {
			return;
		}
		this.#lastDistance = distance;

		if (!this.walkSound.isPlaying) {
			this.walkSound.play();
		}
		sprite.scene.physics.accelerateTo(
			sprite,
			enemyManager.player.body.center.x,
			enemyManager.player.body.center.y,
			this.#speed,
			this.#maxSpeed,
			this.#maxSpeed
		);
		const direction = getDirectionOfSpriteMovement(sprite.body);
		if (!direction) {
			return;
		}
		sprite.data.set("direction", direction);
		sprite.anims.play(
			{
				key: getWalkAnimationKeyForDirection(direction),
				frameRate: 1,
			},
			true
		);
	}
}

export class FollowPlayer<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	name: AllStates;
	#followTime: number | undefined;
	#awareDistance: number | undefined;
	#speed: number = 30;

	constructor(
		name: AllStates,
		nextState: AllStates,
		config?: {
			speed?: number;
			followTime?: number;
			awareDistance?: number;
		}
	) {
		this.name = name;
		this.#nextState = nextState;
		if (config?.followTime) {
			this.#followTime = config.followTime;
		}
		if (config?.awareDistance) {
			this.#awareDistance = config.awareDistance;
		}
		if (config?.speed) {
			this.#speed = config.speed;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}

		if (this.#followTime) {
			sprite.scene.time.addEvent({
				delay: this.#followTime,
				callback: () => {
					sprite?.body?.setVelocity(0);
					stateMachine.popState();
					stateMachine.pushState(this.#nextState);
				},
			});
		}
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		if (!enemyManager.player.body) {
			return;
		}
		if (sprite.data.get(DataKeys.Stunned)) {
			return;
		}

		const distance = Phaser.Math.Distance.BetweenPoints(
			sprite.body.center,
			enemyManager.player.body.center
		);
		if (this.#awareDistance) {
			if (distance > this.#awareDistance) {
				sprite.scene?.sound.stopByKey("water-walk");
				sprite.body.stop();
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
				return;
			}
		}

		// If we are extremely close we don't need to change course.
		if (distance < 10) {
			return;
		}

		sprite.scene.physics.moveTo(
			sprite,
			enemyManager.player.body.center.x,
			enemyManager.player.body.center.y,
			this.#speed
		);
		if (
			!(sprite.scene.sound?.getAllPlaying() ?? []).some(
				(sound) => sound.key === "water-walk"
			)
		) {
			sprite.scene?.sound.play("water-walk");
		}
		const direction = getDirectionOfSpriteMovement(sprite.body);
		if (!direction) {
			return;
		}
		sprite.data.set("direction", direction);
		sprite.anims.play(getWalkAnimationKeyForDirection(direction), true);
	}
}

function getWalkingDirection(
	sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
): SpriteDirection {
	const previousDirection: SpriteDirection | undefined =
		sprite.data.get("direction");
	let direction = Phaser.Math.Between(0, 3);
	if (previousDirection !== undefined) {
		while (direction === previousDirection) {
			direction = Phaser.Math.Between(0, 3);
		}
	}
	return direction as SpriteDirection;
}

function getWalkingDirectionLeftRight(
	sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
): SpriteDirection {
	const previousDirection: SpriteDirection | undefined =
		sprite.data.get("direction");
	let direction = Phaser.Math.Between(0, 1) === 1 ? SpriteLeft : SpriteRight;
	if (previousDirection !== undefined) {
		while (direction === previousDirection) {
			direction = Phaser.Math.Between(0, 1) === 1 ? SpriteLeft : SpriteRight;
		}
	}
	return direction as SpriteDirection;
}

class Seeker extends Phaser.Physics.Arcade.Sprite {
	#speed = 50;
	#enemyManager: EnemyManager;
	#beingDestroyed = false;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number,
		texture: string,
		initialFrame: number,
		speed: number
	) {
		super(scene, x, y, texture, initialFrame);
		this.#speed = speed;
		this.#enemyManager = enemyManager;
		this.init();
		this.addToDisplayList();
		this.addToUpdateList();
	}

	init(): void {
		this.scene.anims.create({
			key: "green-ball",
			frames: this.anims.generateFrameNumbers("green-ball"),
			frameRate: 50,
			showOnStart: true,
			hideOnComplete: true,
			yoyo: true,
		});
		this.scene.physics.add.existing(this);
		this.setDepth(5);
		this.anims.play(
			{
				key: "green-ball",
				repeat: -1,
			},
			true
		);
		if (!isDynamicSprite(this)) {
			throw new Error("Could not update plant ball");
		}
		this.scene.sound.play("fire-loop");
		this.setDisplaySize(this.body.width * 0.8, this.body.height * 0.8);
		this.body.setSize(this.body.width * 0.5, this.body.height * 0.5);

		this.scene.physics.add.overlap(this.#enemyManager.player, this, () => {
			this.scene?.sound?.stopByKey("fire-loop");
			MainEvents.emit(Events.EnemyHitPlayer, true);
			this.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			this.destroy();
		});

		this.scene.physics.add.overlap(this.#enemyManager.sword, this, () => {
			if (!this.#enemyManager.sword.data.get(DataKeys.SwordAttackActive)) {
				return;
			}
			this.body.stop();
			this.#beingDestroyed = true;
			this.setVisible(false);

			this.scene.anims.create({
				key: "fire-power",
				frames: this.anims.generateFrameNumbers("fire-power"),
				frameRate: 50,
				showOnStart: true,
				hideOnComplete: true,
			});
			const effect = this.scene.add.sprite(
				this.body.center.x,
				this.body.center.y,
				"fire-power",
				0
			);
			effect.setDepth(5);
			effect.anims.play("fire-power", true);
			effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
				this.scene?.sound?.stopByKey("fire-loop");
				effect.destroy();
				this.destroy();
			});
		});
	}

	preUpdate(time: number, delta: number): void {
		super.preUpdate(time, delta);
		if (this.#beingDestroyed) {
			return;
		}
		this.scene?.physics.moveToObject(
			this,
			this.#enemyManager.player,
			this.#speed
		);
	}
}

export class ThrowRocks<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	#speed = 500;
	#delayBeforeEnd = 1000;
	#delayBetweenRocks = 600;
	#isEnding = false;
	#rockCount = 3;
	#sprite: Phaser.GameObjects.Sprite;
	#rocksCreated: Phaser.GameObjects.Sprite[] = [];
	#enemyManager: EnemyManager;
	name: AllStates;

	constructor(
		name: AllStates,
		nextState: AllStates,
		config: {
			speed: number;
			rockCount: number;
			delayBeforeEnd: number;
			delayBetweenRocks: number;
		}
	) {
		this.name = name;
		this.#nextState = nextState;
		this.#speed = config.speed;
		this.#rockCount = config.rockCount;
		this.#delayBeforeEnd = config.delayBeforeEnd;
		this.#delayBetweenRocks = config.delayBetweenRocks;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		_: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		this.#sprite = sprite;
		this.#enemyManager = enemyManager;

		this.dropRock(this.createRock());
	}

	createRock() {
		if (!this.#enemyManager.player.body) {
			throw new Error("No player exists");
		}

		this.#sprite.anims.play("throwrock");
		const rock = this.#sprite.scene.add.sprite(
			this.#enemyManager.player.body.center.x,
			this.#enemyManager.player.body.center.y,
			"dungeon_tiles_sprites",
			865
		);
		this.#sprite.scene.physics.add.existing(rock);
		if (!isDynamicSprite(rock)) {
			throw new Error("Could not create rock");
		}
		this.#sprite.once(Events.MonsterDying, () => {
			rock?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			rock?.destroy();
		});
		this.#rocksCreated.push(rock);
		return rock;
	}

	dropRock(tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		tile.setVisible(true);
		const tileFinalHeight = tile.y;
		const tileInitialHeight = 70;
		const tileInitialAlpha = 0.4;
		let height = tile.y - tileInitialHeight;
		let alpha = tileInitialAlpha;
		tile.setAlpha(alpha);
		tile.setPosition(tile.x, height);
		this.#sprite.scene.cameras.main.shake(200, 0.004);
		vibrate(this.#sprite.scene, 1, 200);
		this.#sprite.scene.tweens.add({
			targets: tile,
			x: tile.x,
			y: tileFinalHeight,
			duration: this.#speed,
			onComplete: () => {
				this.showRock(tile);
				this.#sprite.scene?.sound.play("rock-destroy", {
					loop: false,
					volume: 0.5,
				});
				this.#rockCount -= 1;
				if (this.#rockCount > 0) {
					this.#sprite.scene?.time.addEvent({
						delay: this.#delayBetweenRocks,
						callback: () => {
							this.dropRock(this.createRock());
						},
					});
				}
			},
		});
	}

	showRock(tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		tile.setAlpha(1);
		tile.body.pushable = false;

		if (this.#sprite.scene?.physics.overlap(this.#enemyManager.player, tile)) {
			MainEvents.emit(Events.EnemyHitPlayer, true);
		}
		this.#sprite.scene?.physics.add.collider(this.#enemyManager.player, tile);
		this.#sprite.scene?.physics.add.collider(this.#enemyManager.enemies, tile);
	}

	waitAndEnd(stateMachine: BehaviorMachineInterface<AllStates>) {
		if (this.#isEnding) {
			return;
		}
		this.#isEnding = true;

		this.#sprite.scene?.time.addEvent({
			delay: this.#delayBeforeEnd,
			callback: () => {
				this.#rocksCreated.forEach((rock) => {
					this.#sprite.scene?.sound.play("rock-destroy", {
						loop: false,
						volume: 0.5,
					});
					rock?.setOrigin(0.6, 0.5);
					rock?.anims?.play("explode", true);
					this.#sprite.scene?.cameras.main.shake(200, 0.004);
					vibrate(this.#sprite.scene, 1, 200);
					rock?.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
						rock.destroy();
					});
				});
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			},
		});
	}

	update(
		_: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (this.#rockCount === 0) {
			this.waitAndEnd(stateMachine);
		}
	}
}
