import { config } from "../lib/config";
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
	jumpToTileWithArc,
	createShadowSprite,
	getLimitedEndPoint,
	doesTileBlockFire,
	distanceToLine,
	makeFireExplosion,
} from "./shared";
import { EnemyManager } from "./EnemyManager";
import { TeleportSystem } from "./TeleportSystem";
import { Behavior, BehaviorCompleteCallback } from "./Behavior";
import { MainEvents } from "./MainEvents";
import { MountainMonster } from "../monsters/MountainMonster";
import {
	PhysicsSpriteComponent,
	getPlayerOrThrow,
	getPhysicsSpriteOrThrow,
	getMap,
	getActiveRoom,
} from "../lib/components";

export class WaitForActive implements Behavior {
	#distanceToActivate: number = 100;
	#waitAnimationKey: string | undefined = undefined;
	#maxWaitTime: number | undefined;
	#hasEnded: boolean = false;
	name: string;

	constructor(
		name: string,
		config?: {
			distance?: number;
			maxWaitTime?: number | undefined;
			waitAnimationKey?: string | undefined;
		}
	) {
		this.name = name;
		if (config?.distance) {
			this.#distanceToActivate = config.distance;
		}
		if (config?.maxWaitTime) {
			this.#maxWaitTime = config.maxWaitTime;
		}
		if (config?.waitAnimationKey) {
			this.#waitAnimationKey = config.waitAnimationKey;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		sprite.body.stop();

		if (this.#waitAnimationKey) {
			sprite.anims.play(this.#waitAnimationKey, true);
		} else {
			sprite.anims.stop();
		}

		if (this.#maxWaitTime) {
			sprite.scene?.time.addEvent({
				delay: this.#maxWaitTime,
				callback: () => {
					sprite?.anims?.stop();
					if (this.#hasEnded) {
						return;
					}
					this.#hasEnded = true;
					goToNextState();
				},
			});
		}
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		const player = PhysicsSpriteComponent.get("player");
		if (!player) {
			return;
		}
		if (!isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		const distance = Phaser.Math.Distance.BetweenPoints(
			sprite.body.center,
			player.body.center
		);
		if (distance < this.#distanceToActivate) {
			this.#hasEnded = true;
			goToNextState();
		}
	}
}

export class Roar implements Behavior {
	name: string;

	constructor(name: string) {
		this.name = name;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
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
		sprite.scene.cameras.main.shake(2000, 0.009, true);
		vibrate(sprite.scene, 2, 1800);

		const emitter = sprite.scene.add.particles(
			sprite.body.center.x,
			sprite.body.center.y - 5,
			"player-hit",
			{
				frame: [0, 1],
				lifespan: 1500,
				speed: { min: 70, max: 150 },
				scale: { start: 0.9, end: 0 },
				alpha: 0.9,
				tint:
					"primaryColor" in sprite
						? (sprite.primaryColor as number)
						: undefined,
				duration: 2000,
			}
		);
		emitter.once(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
			emitter.destroy();
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
		effect.setDepth(config.effectDepth);
		effect.anims.play("orange_boom", true);
		sprite.once(Events.MonsterDying, () => {
			effect?.destroy();
		});

		sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			MainEvents.emit(Events.StunPlayer, false);
			roar.stop();
			effect?.destroy();

			goToNextState();
		});
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
	}
}

export class SpawnEnemies implements Behavior {
	#maxSpawnedEnemies: number | undefined = undefined;
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
	name: string;

	constructor(
		name: string,
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
		goToNextState: BehaviorCompleteCallback,
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
				goToNextState();
			},
		});
	}

	#addEnemy(sprite: Phaser.GameObjects.Sprite, enemyManager: EnemyManager) {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		const spawnedEnemyCount = sprite.data.get("spawnedEnemyCount") ?? 0;
		if (
			this.#maxSpawnedEnemies &&
			spawnedEnemyCount >= this.#maxSpawnedEnemies
		) {
			return;
		}

		sprite.data.set("spawnedEnemyCount", spawnedEnemyCount + 1);

		const monster = this.#createMonster(
			sprite.scene,
			enemyManager,
			sprite.body.x + 5,
			sprite.body.y + sprite.body.height
		);
		monster.once(Events.MonsterDying, () => {
			const spawnedEnemyCount = sprite.data.get("spawnedEnemyCount") ?? 0;
			sprite?.data?.set("spawnedEnemyCount", spawnedEnemyCount - 1);
		});
		enemyManager.enemies.add(monster);
		sprite.once(Events.MonsterDying, () => {
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

export class Nothing implements Behavior {
	#animationKey: string;
	#idleTime: number;
	name: string;

	constructor(name: string, animationKey: string, idleTime: number) {
		this.name = name;
		this.#animationKey = animationKey;
		this.#idleTime = idleTime;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		sprite.anims.play(this.#animationKey, true);
		sprite.scene.time.addEvent({
			delay: this.#idleTime,
			callback: () => {
				goToNextState();
			},
		});
	}
}

export class Idle implements Behavior {
	#animationKey: string;
	#idleTime: number;
	name: string;

	constructor(name: string, animationKey: string, idleTime: number) {
		this.name = name;
		this.#animationKey = animationKey;
		this.#idleTime = idleTime;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		sprite.body.stop();
		sprite.anims.play(this.#animationKey, true);
		sprite.scene.time.addEvent({
			delay: this.#idleTime,
			callback: () => {
				goToNextState();
			},
		});
	}
}

export class Burrow implements Behavior {
	#speed = 90;
	#postAttackTime = 900;
	#hitsOnAppear: boolean = false;
	#targetPosition: { x: number; y: number } | undefined = undefined;
	name: string;

	constructor(
		name: string,
		options?: {
			speed?: number;
			postAttackTime?: number;
			hitsOnAppear?: boolean;
			targetPosition?: { x: number; y: number };
		}
	) {
		this.name = name;
		this.#speed = options?.speed ?? this.#speed;
		this.#postAttackTime = options?.postAttackTime ?? this.#postAttackTime;
		this.#hitsOnAppear = options?.hitsOnAppear ?? this.#hitsOnAppear;
		this.#targetPosition = options?.targetPosition;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		const player = getPlayerOrThrow();
		const target = this.#targetPosition ?? {
			x: player.x,
			y: player.y,
		};
		const shadow = createShadowSprite({
			scene: sprite.scene,
			x: sprite.body.center.x,
			y: sprite.body.center.y,
		});

		let harmless = sprite.data.get(DataKeys.IsHarmless);
		let hittable = sprite.data.get(DataKeys.Hittable);
		let pushable = sprite.data.get(DataKeys.Pushable);
		sprite.data.set(DataKeys.IsHarmless, true);
		sprite.data.set(DataKeys.Hittable, false);
		sprite.data.set(DataKeys.Pushable, false);

		const startX = sprite.x;
		const startY = sprite.y;
		sprite.setVisible(false);
		sprite.scene.tweens.add({
			targets: sprite,
			duration: 600,
			x: target.x,
			y: target.y,
			onUpdate: (tween) => {
				const progress = tween.progress;
				// Have shadow follow sprite
				shadow.x = startX + (target.x - startX) * progress;
				shadow.y = startY + (target.y - startY) * progress;
			},
			onComplete: () => {
				sprite.scene.time.addEvent({
					delay: this.#postAttackTime,
					callback: () => {
						sprite?.setVisible(true);
						if (this.#hitsOnAppear) {
							const player = PhysicsSpriteComponent.get("player");
							if (!player) {
								return;
							}
							sprite?.scene.physics.add.overlap(player, shadow, () => {
								MainEvents.emit(Events.EnemyHitPlayer, {
									source: sprite,
									damage: 1,
								});
							});
						}
						shadow?.destroy();
						sprite?.data?.set(DataKeys.IsHarmless, harmless);
						sprite?.data?.set(DataKeys.Hittable, hittable);
						sprite?.data?.set(DataKeys.Pushable, pushable);
						goToNextState();
					},
				});
			},
		});
	}
}

export class Leap implements Behavior {
	#jumpTime = 900;
	#jumpHeight = 30;
	#shakeOnLand: boolean = false;
	#postAttackTime: number = 0;
	#targetPosition: { x: number; y: number } | undefined = undefined;
	name: string;

	constructor(
		name: string,
		options?: {
			jumpTime?: number;
			jumpHeight?: number;
			shakeOnLand?: boolean;
			postAttackTime?: number;
			targetPosition?: { x: number; y: number };
		}
	) {
		this.name = name;
		this.#jumpTime = options?.jumpTime ?? this.#jumpTime;
		this.#jumpHeight = options?.jumpHeight ?? this.#jumpHeight;
		this.#targetPosition = options?.targetPosition;
		this.#shakeOnLand = options?.shakeOnLand ?? this.#shakeOnLand;
		this.#postAttackTime = options?.postAttackTime ?? this.#postAttackTime;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		const player = getPlayerOrThrow();
		const target = this.#targetPosition ?? player;
		const shadow = createShadowSprite({
			scene: sprite.scene,
			x: sprite.body.center.x,
			y: sprite.body.center.y,
		});

		let harmless = sprite.data.get(DataKeys.IsHarmless);
		let hittable = sprite.data.get(DataKeys.Hittable);
		let pushable = sprite.data.get(DataKeys.Pushable);
		sprite.data.set(DataKeys.IsHarmless, true);
		sprite.data.set(DataKeys.Hittable, false);
		sprite.data.set(DataKeys.Pushable, false);

		jumpToTileWithArc({
			sprite,
			targetX: target.x,
			targetY: target.y,
			jumpHeight: this.#jumpHeight,
			duration: this.#jumpTime,
			shadow,
		});

		sprite.scene.time.addEvent({
			delay: this.#jumpTime,
			callback: () => {
				if (this.#shakeOnLand) {
					sprite.scene?.cameras.main.shake(500, 0.02);
					vibrate(sprite.scene, 2, 500);
				}
				shadow?.destroy();
				sprite?.data?.set(DataKeys.IsHarmless, harmless);
				sprite?.data?.set(DataKeys.Hittable, hittable);
				sprite?.data?.set(DataKeys.Pushable, pushable);

				sprite?.scene?.time.addEvent({
					delay: this.#postAttackTime,
					callback: () => {
						goToNextState();
					},
				});
			},
		});
	}
}

export class RandomlyWalk implements Behavior {
	#enemySpeed = 50;
	#minWalkTime = 800;
	#maxWalkTime = 4000;
	name: string;
	#walkSound: Sound;

	constructor(
		name: string,
		config?: {
			speed?: number;
			minWalkTime?: number;
			maxWalkTime?: number;
			walkSound?: Sound;
		}
	) {
		this.name = name;
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
		goToNextState: BehaviorCompleteCallback
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

				goToNextState();
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

	cleanUp(sprite: Phaser.GameObjects.Sprite) {
		if (isDynamicSprite(sprite)) {
			sprite?.body.stop();
			sprite?.anims.stop();
		}
	}
}

export class LeftRightMarch implements Behavior {
	#enemySpeed = 70;
	#minWalkTime = 600;
	#maxWalkTime = 4000;
	#moveUpDown = false;
	name: string;

	constructor(
		name: string,
		config?: {
			speed?: number;
			minWalkTime?: number;
			maxWalkTime?: number;
			moveUpDown?: boolean;
		}
	) {
		this.name = name;
		if (config?.speed) {
			this.#enemySpeed = config.speed;
		}
		if (config?.minWalkTime) {
			this.#minWalkTime = config.minWalkTime;
		}
		if (config?.maxWalkTime) {
			this.#maxWalkTime = config.maxWalkTime;
		}
		if (config?.moveUpDown) {
			this.#moveUpDown = config.moveUpDown;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}

		const direction = this.#moveUpDown
			? getWalkingDirectionUpDown(sprite)
			: getWalkingDirectionLeftRight(sprite);
		sprite.data.set("direction", direction);
		const walkSound = sprite.scene.sound.add("enemy-walk", {
			loop: true,
			rate: 1.5,
			volume: 0.5,
		});
		walkSound.play();
		switch (direction) {
			case SpriteUp:
				sprite.anims.play("up", true);
				sprite.body.setVelocityY(-this.#enemySpeed);
				break;
			case SpriteDown:
				sprite.anims.play("down", true);
				sprite.body.setVelocityY(this.#enemySpeed);
				break;
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

				goToNextState();
			},
		});
	}

	#getWalkingTime(): number {
		return Phaser.Math.Between(this.#minWalkTime, this.#maxWalkTime);
	}
}

export class RandomTeleport implements Behavior {
	#postTeleportDelay = 1000;
	name: string;

	constructor(
		name: string,
		config?: {
			postTeleportDelay?: number;
		}
	) {
		this.name = name;
		this.#postTeleportDelay =
			config?.postTeleportDelay ?? this.#postTeleportDelay;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		const activeRoom = getActiveRoom();
		if (!activeRoom) {
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
		effect1.setDepth(config.effectDepth);
		effect1.anims.play("teleport", true);
		sprite.scene.sound.play("holy");
		sprite.once(Events.MonsterDying, () => {
			effect1?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			effect1?.destroy();
		});

		const roomObject = activeRoom;
		if (
			!roomObject.x ||
			!roomObject.y ||
			!roomObject.width ||
			!roomObject.height
		) {
			console.warn("No room to teleport to");
			goToNextState();
			return;
		}

		const system = new TeleportSystem(sprite.scene);
		const landLayer = getMap().getLayer("Background");
		if (!landLayer) {
			throw new Error("Could not find bg layer for RandomTeleport");
		}
		const stuffLayer = getMap().getLayer("Stuff");
		if (!stuffLayer) {
			throw new Error("Could not find stuff layer for RandomTeleport");
		}
		system.teleportWithPhysicsCheck(sprite, roomObject, {
			collisionLayers: [landLayer.tilemapLayer, stuffLayer.tilemapLayer],
		});

		const effect2 = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
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

				goToNextState();
			},
		});
	}
}

export class TeleportToPlatform implements Behavior {
	#postTeleportDelay = 1500;
	name: string;

	constructor(name: string, postTeleportDelay: number) {
		this.name = name;
		this.#postTeleportDelay = postTeleportDelay;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		const activeRoom = getActiveRoom();
		if (!activeRoom) {
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
		effect1.setDepth(config.effectDepth);
		effect1.anims.play("teleport", true);
		sprite.scene.sound.play("holy");
		sprite.once(Events.MonsterDying, () => {
			effect1?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			effect1?.destroy();
		});

		// Get all platform tiles in room
		const tiles = getTilesInRoom(getMap(), activeRoom).filter((tile) => {
			if (isTileWithPropertiesObject(tile) && tile.properties.isPlatform) {
				return true;
			}
			return false;
		});
		if (tiles.length < 1) {
			console.warn("Too few platform tiles in room to teleport to");

			goToNextState();
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

				goToNextState();
			},
		});
	}
}

export class TeleportToWater implements Behavior {
	#postTeleportDelay = 1000;
	name: string;

	constructor(name: string) {
		this.name = name;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		const activeRoom = getActiveRoom();
		if (!activeRoom) {
			throw new Error("Cannot create monster outside of room");
		}
		sprite.body.setVelocity(0);
		// Get all water tiles in room
		const tiles = getTilesInRoom(getMap(), activeRoom).filter((tile) => {
			if (isTileWithPropertiesObject(tile) && tile.properties.isWater) {
				return true;
			}
			return false;
		});
		if (tiles.length < 1) {
			console.warn("No water tiles in room to teleport to");

			goToNextState();
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
				goToNextState();
			},
		});
	}
}

export class PowerUp implements Behavior {
	#chargeTime = 1300;
	#scale = 1;
	#effect: Phaser.GameObjects.Sprite;
	name: string;

	constructor(
		name: string,
		config?: {
			scale?: number;
			chargeTime?: number;
		}
	) {
		this.name = name;
		if (config?.scale) {
			this.#scale = config.scale;
		}
		if (config?.chargeTime) {
			this.#chargeTime = config.chargeTime;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
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
		if ("primaryColor" in sprite) {
			effect.setTint(sprite.primaryColor as number);
		}
		effect.setScale(this.#scale);
		effect.setDepth(config.effectDepth);
		effect.setAlpha(0.7);
		effect.anims.play("powerup", true);
		this.#effect = effect;
		sprite.scene.sound.play("ice-charge");
		sprite.once(Events.MonsterDying, () => {
			sprite.scene?.sound.stopByKey("ice-charge");
			effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			effect?.destroy();

			goToNextState();
		});
		sprite.scene.time.addEvent({
			delay: this.#chargeTime,
			callback: () => {
				sprite?.scene?.sound.stopByKey("ice-charge");
				effect?.destroy();

				goToNextState();
			},
		});
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!sprite?.body) {
			return;
		}
		if (!isDynamicSprite(sprite)) {
			return;
		}
		this.#effect?.setPosition(sprite.body.center.x, sprite.body.center.y);
	}
}

export class SlashTowardPlayer implements Behavior {
	name: string;
	#speed = 100;
	#hitboxSize = 30;
	#effect: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

	constructor(name: string, speed: number) {
		this.name = name;
		this.#speed = speed;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		const player = getPlayerOrThrow();
		if (!sprite.body || !isDynamicSprite(sprite) || !isDynamicSprite(player)) {
			throw new Error("Could not update monster");
		}

		sprite.scene.physics.moveTo(
			sprite,
			player.body.center.x,
			player.body.center.y,
			this.#speed
		);
		// FIXME: change this to be the facing direction instead of the moving direction (eg: if you hit a wall you will stop moving but will continue facing)
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
		this.#effect.setDepth(config.effectDepth);
		moveHitboxInFrontOfSprite(sprite, direction, this.#effect);
		this.#effect.anims.play("slash-effect", true);
		sprite.scene.sound.play("attack");

		sprite.scene.physics.add.overlap(player, this.#effect, () => {
			MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
		});

		sprite.once(Events.MonsterDying, () => {
			this.#effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			this.#effect?.destroy();

			goToNextState();
		});
		this.#effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.#effect?.destroy();

			goToNextState();
		});
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		// FIXME: change this to be the facing direction instead of the moving direction (eg: if you hit a wall you will stop moving but will continue facing)
		const direction = getDirectionOfSpriteMovement(sprite.body);
		if (!direction) {
			return;
		}
		if (isDynamicSprite(this.#effect)) {
			moveHitboxInFrontOfSprite(sprite, direction, this.#effect);
		}
	}
}

export class BigSwing implements Behavior {
	name: string;

	constructor(name: string) {
		this.name = name;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
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
		effect.setDepth(config.effectDepth);
		effect.anims.play("slash-effect", true);
		sprite.scene.sound.play("attack");

		const player = getPlayerOrThrow();
		sprite.scene.physics.add.overlap(player, effect, () => {
			MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
		});

		sprite.once(Events.MonsterDying, () => {
			effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			effect?.destroy();

			goToNextState();
		});
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect?.destroy();

			goToNextState();
		});
	}
}

export class IceAttack implements Behavior {
	name: string;
	#freezePlayerTime = 3000;

	constructor(name: string) {
		this.name = name;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
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
		effect.setDepth(config.effectDepth);
		effect.anims.play("ice_attack", true);
		sprite.scene.sound.play("ice");

		const player = getPlayerOrThrow();
		sprite.scene.physics.add.overlap(player, effect, () => {
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

			goToNextState();
		});
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect?.destroy();

			goToNextState();
		});
	}
}

export class StickyPoison implements Behavior {
	#poisonHitDelay = 2000;
	#speed = 300;
	#isStuck = false;
	name: string;

	constructor(
		name: string,
		options?: {
			poisonHitDelay: number;
		}
	) {
		this.name = name;
		this.#poisonHitDelay = options?.poisonHitDelay
			? options.poisonHitDelay
			: this.#poisonHitDelay;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		const player = getPlayerOrThrow();
		if (!sprite.body || !isDynamicSprite(sprite) || !player.body) {
			throw new Error("Could not update monster");
		}

		this.#isStuck = true;

		sprite.scene.time.addEvent({
			repeat: 5,
			delay: this.#poisonHitDelay,
			callback: () => {
				if (this.#isStuck) {
					MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
					return;
				}

				goToNextState();
			},
		});
		sprite.once(Events.MonsterDying, () => {
			this.#isStuck = false;
		});
		MainEvents.once(Events.LeavingRoom, () => {
			this.#isStuck = false;
		});
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		_goToNextState: BehaviorCompleteCallback
	): void {
		const player = getPlayerOrThrow();
		if (!sprite.body || !isDynamicSprite(sprite) || !player.body) {
			throw new Error("Could not update monster");
		}

		const distance = Phaser.Math.Distance.BetweenPoints(
			sprite.body.center,
			player.body.center
		);

		// If you reach the target, stop.
		if (distance < 10) {
			sprite.body.stop();
			return;
		}

		if (this.#isStuck) {
			sprite.scene.physics.moveToObject(sprite, player, this.#speed);
		}
	}
}

export class Poof implements Behavior {
	#postAttackTime = 1000;
	#particleLifeSpan = 800;
	name: string;

	constructor(
		name: string,
		options?: {
			postAttackTime?: number;
			particleLifeSpan?: number;
		}
	) {
		this.name = name;
		this.#postAttackTime = options?.postAttackTime ?? this.#postAttackTime;
		this.#particleLifeSpan =
			options?.particleLifeSpan ?? this.#particleLifeSpan;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		const deathZoneDetector = {
			contains: (x: number, y: number) => {
				// Particle coordinates are global but that was changed around 3.85 to
				// make them local instead (see
				// https://github.com/phaserjs/phaser/issues/6371). If we ever upgrade
				// Phaser, we will need the following adjustments for the emitter
				// position.
				// x += sprite.body.x;
				// y += sprite.body.y;

				// If a particle hits the player, then trigger an effect.
				const player = getPlayerOrThrow();
				const didHit = player.body?.hitTest(x, y) ?? false;
				if (didHit) {
					MainEvents.emit(Events.ConfusePlayer, true);
				}
				return didHit;
			},
		};
		const emitter = sprite.scene.add.particles(
			sprite.body.center.x,
			sprite.body.center.y - 5,
			"monsters2",
			{
				frame: [75, 76, 77],
				lifespan: this.#particleLifeSpan,
				speed: { min: 15, max: 55 },
				scale: { start: 1, end: 0.4 },
				emitting: false,
				deathZone: { source: deathZoneDetector, killOnEnter: true },
			}
		);
		emitter.explode(20);
		emitter.once(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
			emitter?.destroy();
		});
		sprite.once(Events.MonsterDying, () => {
			emitter?.destroy?.();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			emitter?.destroy?.();
		});

		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				goToNextState();
			},
		});
	}
}

export class LavaExplode implements Behavior {
	#postAttackTime = 1500;
	#particleLifeSpan = 300;
	#hitboxRadius = 25;
	#isConstant = false;
	#damage: number = 1;
	name: string;

	constructor(
		name: string,
		options?: {
			postAttackTime?: number;
			particleLifeSpan?: number;
			hitboxRadius?: number;
			isConstant?: boolean;
			damage?: number;
		}
	) {
		this.name = name;
		this.#postAttackTime = options?.postAttackTime ?? this.#postAttackTime;
		this.#particleLifeSpan =
			options?.particleLifeSpan ?? this.#particleLifeSpan;
		this.#hitboxRadius = options?.hitboxRadius ?? this.#hitboxRadius;
		this.#isConstant = options?.isConstant ?? this.#isConstant;
		this.#damage = options?.damage ?? this.#damage;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		// The invisible circle will be the hitbox and the emitter will be just the
		// visual.
		const circle = sprite.scene.add.zone(
			sprite.body.center.x,
			sprite.body.center.y,
			2,
			2
		);
		sprite.scene.physics.add.existing(circle);
		if (!circle.body || !("setCircle" in circle.body)) {
			throw new Error("Could not create circle");
		}
		circle.body.setCircle(this.#hitboxRadius);
		circle.body.setOffset(-this.#hitboxRadius, -this.#hitboxRadius);
		const player = getPlayerOrThrow();
		sprite.scene.physics.add.overlap(player, circle, () => {
			MainEvents.emit(Events.EnemyHitPlayer, {
				source: sprite,
				damage: this.#damage,
			});
			if (!this.#isConstant) {
				circle?.destroy();
			}
		});

		const emitter = sprite.scene.add.particles(
			sprite.body.center.x,
			sprite.body.center.y - 5,
			"fire-power",
			{
				frame: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
				lifespan: this.#particleLifeSpan,
				speed: { min: 30, max: 90 },
				scale: { start: 0.8, end: 0.2 },
				emitting: false,
			}
		);
		if (this.#isConstant) {
			emitter.start();
		} else {
			emitter.explode(20);
		}
		emitter.once(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
			circle?.destroy();
			emitter?.destroy();
		});
		sprite.once(Events.MonsterDying, () => {
			circle?.destroy();
			emitter?.destroy?.();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			circle?.destroy();
			emitter?.destroy?.();
		});

		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				circle?.destroy();
				emitter?.destroy?.();
				goToNextState();
			},
		});
	}
}

export class SeekingVine implements Behavior {
	#speed = 50;
	#postAttackTime = 1000;
	name: string;
	#effect: Phaser.GameObjects.Sprite;

	constructor(name: string, speed: number, postAttackTime: number) {
		this.name = name;
		this.#speed = speed;
		this.#postAttackTime = postAttackTime;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		this.#effect = new Seeker(
			sprite.scene,
			sprite,
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
				goToNextState();
			},
		});
	}
}

export class SummonCircle implements Behavior {
	#speed = 1;
	name: string;
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
		name: string,
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
		if (config?.createMonster) {
			this.#createMonster = config.createMonster;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback,
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

				goToNextState();
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

export class DashTowardPlayer implements Behavior {
	#speed = 90;
	#postAttackTime = 900;
	#previousDistance: number;
	#doNotStop: boolean = false;
	#targetPosition: { x: number; y: number } | undefined = undefined;
	name: string;

	constructor(
		name: string,
		options?: {
			speed?: number;
			postAttackTime?: number;
			doNotStop?: boolean;
			targetPosition?: { x: number; y: number };
		}
	) {
		this.name = name;
		this.#speed = options?.speed ?? this.#speed;
		this.#postAttackTime = options?.postAttackTime ?? this.#postAttackTime;
		this.#targetPosition = options?.targetPosition;
		this.#doNotStop = options?.doNotStop ?? false;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		const player = getPlayerOrThrow();
		sprite.scene.physics.moveToObject(
			sprite,
			this.#targetPosition ?? player,
			this.#speed
		);

		sprite.scene.physics.add.overlap(player, sprite, () => {
			MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
		});

		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				sprite.body.stop();
				goToNextState();
			},
		});
	}

	update(sprite: Phaser.GameObjects.Sprite, _: BehaviorCompleteCallback): void {
		const player = getPlayerOrThrow();
		if (!isDynamicSprite(sprite) || !player.body) {
			throw new Error("Could not update monster");
		}
		const distance = Phaser.Math.Distance.BetweenPoints(
			sprite.body.center,
			this.#targetPosition ?? player.body.center
		);

		// If you hit a wall, the direction will change as moveToObject tries to
		// slide around it. We want to stop in that case so we check to see if the
		// distance isn't getting closer.
		if (
			!this.#doNotStop &&
			this.#previousDistance &&
			distance > this.#previousDistance
		) {
			sprite.body.stop();
			return;
		}

		// If you reach the target, stop.
		if (distance < 5 && !this.#doNotStop) {
			sprite.body.stop();
			return;
		}

		this.#previousDistance = distance;
	}
}

export class FireBeam implements Behavior {
	#speed = 50;
	#postAttackTime = 400;
	#telegraphDelay = 1400;
	#maxLength = 500;
	#minLength: number | undefined = undefined;
	#width: number = 10;
	#glowColor = 0xf71000;
	#color = 0xf54e42;
	#damage: number = 2;
	name: string;

	#fadeOutTimer: Phaser.Time.TimerEvent | undefined;
	#fadeInTween: Phaser.Tweens.Tween | undefined;
	#outerGlow: Phaser.GameObjects.Line | undefined;
	#effect: Phaser.GameObjects.Line | undefined;
	#scene: Phaser.Scene;

	constructor(
		name: string,
		options?: {
			speed?: number;
			postAttackTime?: number;
			color?: number;
			maxLength?: number;
			minLength?: number;
			width?: number;
			damage?: number;
		}
	) {
		this.name = name;
		this.#speed = options?.speed ?? this.#speed;
		this.#postAttackTime = options?.postAttackTime ?? this.#postAttackTime;
		this.#color = options?.color ?? this.#color;
		this.#maxLength = options?.maxLength ?? this.#maxLength;
		this.#minLength = options?.minLength ?? this.#minLength;
		this.#width = options?.width ?? this.#width;
		this.#damage = options?.damage ?? this.#damage;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		this.#scene = sprite.scene;
		const player = getPlayerOrThrow();
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		if (!player.body) {
			throw new Error("Could not update monster");
		}
		const start = {
			x: sprite.body.center.x,
			y: sprite.body.center.y,
		};
		const originalTarget = {
			x: player.body.center.x,
			y: player.body.center.y,
		};
		const target = getLimitedEndPoint({
			startX: start.x,
			startY: start.y,
			endX: originalTarget.x,
			endY: originalTarget.y,
			maxLength: this.#maxLength,
			minLength: this.#minLength,
		});

		// Make an outer glow
		this.#outerGlow = sprite.scene.add.line(
			0,
			0,
			start.x,
			start.y,
			target.x,
			target.y,
			this.#glowColor
		);
		this.#outerGlow.setOrigin(0);
		this.#outerGlow.setAlpha(0);
		const outerGlowAdjustment = 1.7;
		this.#outerGlow.setLineWidth(this.#width * outerGlowAdjustment);

		this.#effect = sprite.scene.add.line(
			0,
			0,
			start.x,
			start.y,
			target.x,
			target.y,
			this.#color
		);
		this.#effect.setOrigin(0);
		this.#effect.setAlpha(0);

		const scene = sprite.scene;

		this.#fadeInTween = scene.tweens.add({
			targets: [this.#effect, this.#outerGlow],
			alpha: 1,
			duration: this.#telegraphDelay,
			onUpdate: (tween) => {
				// Scale the beam width as it builds strength.
				this.#effect?.setLineWidth(this.#width * tween.totalProgress);
				this.#outerGlow?.setLineWidth(
					this.#width * tween.totalProgress * outerGlowAdjustment
				);
			},
			onComplete: () => {
				// Flash line at full power.
				scene.tweens.add({
					targets: this.#effect,
					strokeColor: 0xffffff,
					duration: 30,
					yoyo: true,
					repeat: 1,
				});

				// This cannot test collision with the line because we cannot use a
				// diagonal line in arcade physics.
				const distance = distanceToLine(
					{ x: player.x, y: player.y },
					start,
					target
				);
				const angle = Phaser.Math.Angle.Between(
					start.x,
					start.y,
					target.x,
					target.y
				);
				// If player is close enough to the laser line...
				if (distance < 25) {
					// Check if player is actually in the beam's path (and not behind the source).
					const playerAngle = Phaser.Math.Angle.Between(
						start.x,
						start.y,
						player.x,
						player.y
					);
					const angleDiff = Math.abs(
						Phaser.Math.Angle.Wrap(playerAngle - angle)
					);

					if (angleDiff < Math.PI / 2) {
						MainEvents.emit(Events.EnemyHitPlayer, {
							source: sprite,
							damage: this.#damage,
						});
					}
				}

				this.#fadeOutTimer = scene.time.addEvent({
					delay: 300,
					callback: () => {
						this.#endBeam(() => {
							this.#effect?.destroy();
							this.#outerGlow?.destroy();
							this.#scene.time.addEvent({
								delay: this.#postAttackTime,
								callback: () => {
									goToNextState();
								},
							});
						});
					},
				});
			},
		});
	}

	#endBeam(onComplete: () => void) {
		// Fade the beam out again.
		this.#scene.tweens.add({
			targets: [this.#effect, this.#outerGlow],
			alpha: 0,
			onUpdate: (tween) => {
				this.#effect?.setLineWidth(this.#width * (1 - tween.totalProgress));
				this.#outerGlow?.setLineWidth(this.#width * (1 - tween.totalProgress));
			},
			duration: 150,
			onComplete,
		});
	}

	cleanUp() {
		this.#fadeInTween?.destroy();
		this.#fadeOutTimer?.destroy();
		this.#endBeam(() => {
			this.#effect?.destroy();
			this.#outerGlow?.destroy();
		});
	}
}

export class LaserSight implements Behavior {
	#speed = 50;
	#postAttackTime = 1000;
	#maxLength = 500;
	#color = 0xff0000;
	#isHidden = true;
	#onTarget: undefined | ((target: { x: number; y: number }) => void);
	name: string;

	constructor(
		name: string,
		options?: {
			speed?: number;
			postAttackTime?: number;
			color?: number;
			isHidden?: boolean;
			maxLength?: number;
			onTarget: undefined | ((target: { x: number; y: number }) => void);
		}
	) {
		this.name = name;
		this.#speed = options?.speed ?? this.#speed;
		this.#postAttackTime = options?.postAttackTime ?? this.#postAttackTime;
		this.#color = options?.color ?? this.#color;
		this.#isHidden = options?.isHidden ?? this.#isHidden;
		this.#maxLength = options?.maxLength ?? this.#maxLength;
		this.#onTarget = options?.onTarget;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		const player = getPlayerOrThrow();
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		if (!player.body) {
			throw new Error("Could not update monster");
		}
		let effect: Phaser.GameObjects.Line | undefined;
		const originalTarget = {
			x: player.body.x,
			y: player.body.y,
		};
		const target = getLimitedEndPoint({
			startX: sprite.body.x,
			startY: sprite.body.y,
			endX: originalTarget.x,
			endY: originalTarget.y,
			maxLength: this.#maxLength,
			minLength: 1,
		});
		if (!this.#isHidden) {
			effect = sprite.scene.add.line(
				0,
				0,
				sprite.body.x,
				sprite.body.y,
				target.x,
				target.y,
				this.#color
			);
			effect.setOrigin(0);
			effect.setLineWidth(2);
		}
		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				effect?.destroy();
				goToNextState();
			},
		});
		this.#onTarget?.(target);
	}
}

export class BlackOrbAttack implements Behavior {
	#speed = 50;
	#postAttackTime = 1000;
	#maxLifetime = 6000;
	name: string;

	constructor(name: string, speed: number, postAttackTime: number) {
		this.name = name;
		this.#speed = speed;
		this.#postAttackTime = postAttackTime;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		const player = getPlayerOrThrow();
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		const circleData:
			| { effects?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] }
			| undefined = sprite.data.get("SummonCircle");
		if (!Array.isArray(circleData?.effects)) {
			goToNextState();
			return;
		}
		if (circleData.effects.length === 0) {
			goToNextState();
			return;
		}
		const enemy = circleData.effects.pop();
		if (!enemy) {
			throw new Error("Could not update monster");
		}
		sprite.data.set("SummonCircle", circleData);
		if (!enemy.active) {
			goToNextState();
			return;
		}

		sprite.scene.physics.moveToObject(enemy, player, this.#speed);

		sprite.scene.physics.add.overlap(player, enemy, () => {
			MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
			enemy.emit(Events.MonsterKillRequest);
		});
		MainEvents.once(Events.LeavingRoom, () => {
			enemy?.emit(Events.MonsterKillRequest);
		});

		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				goToNextState();
			},
		});

		sprite.scene.time.addEvent({
			delay: this.#maxLifetime,
			callback: () => {
				enemy?.emit(Events.MonsterKillRequest);
			},
		});
	}
}

export class RangedRockBall implements Behavior {
	#speed = 160;
	#postAttackTime = 2200;
	#maxLifetime = 10000;
	#hitsWalls = true;
	#forceDirectionDegree: number | undefined = undefined;
	#colorTint: number | undefined;
	name: string;

	constructor(
		name: string,
		config?: {
			speed?: number;
			postAttackTime?: number;
			hitsWalls?: boolean;
			forceDirectionDegree?: number;
			colorTint?: number;
		}
	) {
		this.name = name;
		this.#speed = config?.speed ?? this.#speed;
		this.#postAttackTime = config?.postAttackTime ?? this.#postAttackTime;
		this.#hitsWalls = config?.hitsWalls ?? this.#hitsWalls;
		this.#forceDirectionDegree = config?.forceDirectionDegree;
		this.#colorTint = config?.colorTint;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		const effect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"dungeon_tiles_sprites",
			865
		);
		sprite.scene.physics.add.existing(effect);
		effect.setDepth(config.effectDepth);
		if (!isDynamicSprite(effect)) {
			throw new Error("Could not update rock ball");
		}
		effect.setDisplaySize(effect.body.width * 0.8, effect.body.height * 0.8);
		effect.body.setSize(effect.body.width * 0.5, effect.body.height * 0.5);
		if (this.#colorTint) {
			effect.setTint(this.#colorTint);
		}

		if (undefined === this.#forceDirectionDegree) {
			const player = getPlayerOrThrow();
			sprite.scene.physics.moveToObject(effect, player, this.#speed);
		}
		if (undefined !== this.#forceDirectionDegree) {
			const velocity = sprite.scene.physics.velocityFromAngle(
				this.#forceDirectionDegree,
				1
			);
			effect.body.setVelocity(
				velocity.x * this.#speed,
				velocity.y * this.#speed
			);
		}

		let isDestroyed = false;
		const onDestroy = () => {
			if (!effect?.anims || isDestroyed) {
				return;
			}
			isDestroyed = true;
			sprite.scene?.sound.play("rock-destroy", {
				loop: false,
				volume: 0.5,
			});
			effect.body.stop();
			effect.setOrigin(0.6, 0.5);
			effect.anims?.play("explode", true);
			sprite.scene?.cameras.main.shake(200, 0.004);
			vibrate(sprite.scene, 1, 200);
			effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
				effect?.destroy();
			});
		};

		if (this.#hitsWalls) {
			const landLayer = getMap().getLayer("Background");
			if (!landLayer) {
				throw new Error("Could not find bg layer for RangedRockBall");
			}
			const stuffLayer = getMap().getLayer("Stuff");
			if (!stuffLayer) {
				throw new Error("Could not find stuff layer for RangedRockBall");
			}
			sprite.scene.physics.add.collider(effect, stuffLayer.tilemapLayer, () => {
				onDestroy();
			});
			sprite.scene.physics.add.collider(effect, landLayer.tilemapLayer, () => {
				onDestroy();
			});
		}

		const player = getPlayerOrThrow();
		sprite.scene.physics.add.overlap(player, effect, () => {
			MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
			onDestroy();
		});

		sprite.once(Events.MonsterDying, () => {
			onDestroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			onDestroy();
		});

		sprite.scene.time.addEvent({
			delay: this.#maxLifetime,
			callback: () => {
				onDestroy();
			},
		});
		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				goToNextState();
			},
		});
	}
}

export class FireBallRing implements Behavior {
	#speed = 50;
	#postAttackTime = 1000;
	#hitsWalls = false;
	#colorTint: number | undefined;
	#count: number = 1;
	#fireballs: Behavior[] = [];
	name: string;

	constructor(
		name: string,
		config?: {
			speed?: number;
			postAttackTime?: number;
			hitsWalls?: boolean;
			colorTint?: number;
			count?: number;
		}
	) {
		this.name = name;
		this.#speed = config?.speed ?? this.#speed;
		this.#postAttackTime = config?.postAttackTime ?? this.#postAttackTime;
		this.#hitsWalls = config?.hitsWalls ?? this.#hitsWalls;
		this.#colorTint = config?.colorTint;
		this.#count = config?.count ?? this.#count;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback,
		enemyManager: EnemyManager
	) {
		for (let i = 0; i < this.#count; i++) {
			this.#shootFire(i, sprite, enemyManager);
		}
		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				goToNextState();
			},
		});
	}

	#shootFire(
		fireballNumber: number,
		sprite: Phaser.GameObjects.Sprite,
		enemyManager: EnemyManager
	) {
		const fireball: Behavior = new RangedFireBall(
			"fireball-" + fireballNumber,
			{
				speed: this.#speed,
				postAttackTime: 0,
				hitsWalls: this.#hitsWalls,
				forceDirectionDegree: (360 / this.#count) * fireballNumber,
				colorTint: this.#colorTint,
			}
		);
		fireball.init(sprite, () => ({}), enemyManager);
		this.#fireballs.push(fireball);
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		_goToNextState: BehaviorCompleteCallback,
		enemyManager: EnemyManager
	) {
		this.#fireballs.forEach((fireball) => {
			fireball.update?.(sprite, () => ({}), enemyManager);
		});
	}
}

export class FireWall implements Behavior {
	#speed = 5000;
	#fireHeight = 16;
	#direction: "left" | "right" = "right";
	#postAttackTime = 1000;
	#hitsWalls = false;
	#colorTint: number | undefined;
	#count: number | undefined;
	name: string;

	constructor(
		name: string,
		config?: {
			speed?: number;
			direction?: "left" | "right";
			postAttackTime?: number;
			hitsWalls?: boolean;
			colorTint?: number;
			count?: number;
			fireHeight?: number;
		}
	) {
		this.name = name;
		this.#speed = config?.speed ?? this.#speed;
		this.#postAttackTime = config?.postAttackTime ?? this.#postAttackTime;
		this.#hitsWalls = config?.hitsWalls ?? this.#hitsWalls;
		this.#direction = config?.direction ?? this.#direction;
		this.#colorTint = config?.colorTint;
		this.#count = config?.count;
		this.#fireHeight = config?.fireHeight ?? this.#fireHeight;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		sprite.scene.anims.create({
			key: "fire-power",
			frames: sprite.anims.generateFrameNumbers("fire-power"),
			frameRate: 50,
			showOnStart: true,
			hideOnComplete: true,
			yoyo: true,
		});
		const activeRoom = getActiveRoom();
		if (!activeRoom?.width || !activeRoom.height) {
			throw new Error("Cannot work outside of room");
		}
		const count = this.#count ?? activeRoom.height / this.#fireHeight;
		for (let i = 0; i < count; i++) {
			this.#shootFire(sprite, i);
		}
		sprite.scene.time.addEvent({
			delay: this.#postAttackTime,
			callback: () => {
				goToNextState();
			},
		});
	}

	#shootFire(sprite: Phaser.GameObjects.Sprite, count: number): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		const activeRoom = getActiveRoom();
		if (
			!activeRoom?.x ||
			!activeRoom.y ||
			!activeRoom.width ||
			!activeRoom.height
		) {
			throw new Error("Cannot work outside of room");
		}
		const position = {
			x:
				this.#direction === "right"
					? activeRoom.x
					: activeRoom.x + activeRoom.width,
			y: activeRoom.y + count * this.#fireHeight,
		};
		const effect = sprite.scene.add.sprite(
			position.x,
			position.y,
			"fire-power",
			0
		);
		sprite.scene.physics.add.existing(effect);
		effect.setDepth(config.effectDepth);
		effect.anims.play(
			{
				key: "fire-power",
				repeat: -1,
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
		if (this.#colorTint) {
			effect.setTint(this.#colorTint);
		}

		// Move effect
		sprite.scene.tweens.add({
			targets: effect,
			x:
				this.#direction === "right"
					? activeRoom.x + activeRoom.width
					: activeRoom.x,
			duration: this.#speed,
			onComplete: () => {
				fireSound?.stop();
				effect?.destroy();
			},
		});

		const player = getPlayerOrThrow();
		if (this.#hitsWalls) {
			// Often the sprite will be right next to a wall and the effect will hit
			// the wall immediately, so we make it ignore walls for a brief moment
			// after launch.
			let allowHitWalls = false;
			sprite.scene.time.addEvent({
				delay: 1000,
				callback: () => {
					allowHitWalls = true;
				},
			});
			const landLayer = getMap().getLayer("Background");
			if (!landLayer) {
				throw new Error("Could not find bg layer for RangedFireBall");
			}
			const stuffLayer = getMap().getLayer("Stuff");
			if (!stuffLayer) {
				throw new Error("Could not find stuff layer for RangedFireBall");
			}
			sprite.scene.physics.add.collider(
				effect,
				stuffLayer.tilemapLayer,
				() => {
					makeFireExplosion(sprite.scene, effect.body.center);
					fireSound?.stop();
					effect?.destroy();
				},
				() => {
					return allowHitWalls;
				}
			);
			sprite.scene.physics.add.collider(
				effect,
				landLayer.tilemapLayer,
				() => {
					makeFireExplosion(sprite.scene, effect.body.center);
					fireSound?.stop();
					effect?.destroy();
				},
				(_, tile) => {
					return allowHitWalls && doesTileBlockFire(tile);
				}
			);
		}

		sprite.scene.physics.add.overlap(player, effect, () => {
			MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
		});

		sprite.once(Events.MonsterDying, () => {
			fireSound?.stop();
			effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			fireSound?.stop();
			effect?.destroy();
		});
	}
}

export class RangedFireBall implements Behavior {
	#speed = 50;
	#postAttackTime = 1000;
	#hitsWalls = false;
	#forceDirectionDegree: number | undefined = undefined;
	#colorTint: number | undefined;
	#count: number = 1;
	name: string;

	constructor(
		name: string,
		config?: {
			speed?: number;
			postAttackTime?: number;
			hitsWalls?: boolean;
			forceDirectionDegree?: number;
			colorTint?: number;
			count?: number;
		}
	) {
		this.name = name;
		this.#speed = config?.speed ?? this.#speed;
		this.#postAttackTime = config?.postAttackTime ?? this.#postAttackTime;
		this.#hitsWalls = config?.hitsWalls ?? this.#hitsWalls;
		this.#forceDirectionDegree = config?.forceDirectionDegree;
		this.#colorTint = config?.colorTint;
		this.#count = config?.count ?? this.#count;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		for (let i = 0; i < this.#count; i++) {
			sprite.scene.time.addEvent({
				delay: this.#postAttackTime * i,
				callback: () => {
					this.#shootFire(sprite);
				},
			});
		}
		sprite.scene.time.addEvent({
			delay: this.#postAttackTime * this.#count,
			callback: () => {
				goToNextState();
			},
		});
	}

	#shootFire(sprite: Phaser.GameObjects.Sprite): void {
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
		effect.setDepth(config.effectDepth);
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
		if (this.#colorTint) {
			effect.setTint(this.#colorTint);
		}

		const player = getPlayerOrThrow();
		if (undefined === this.#forceDirectionDegree) {
			sprite.scene.physics.moveToObject(effect, player, this.#speed);
		}
		if (undefined !== this.#forceDirectionDegree) {
			const velocity = sprite.scene.physics.velocityFromAngle(
				this.#forceDirectionDegree,
				1
			);
			effect.body.setVelocity(
				velocity.x * this.#speed,
				velocity.y * this.#speed
			);
		}

		if (this.#hitsWalls) {
			// Often the sprite will be right next to a wall and the effect will hit
			// the wall immediately, so we make it ignore walls for a brief moment
			// after launch.
			let allowHitWalls = false;
			sprite.scene.time.addEvent({
				delay: 1000,
				callback: () => {
					allowHitWalls = true;
				},
			});
			const landLayer = getMap().getLayer("Background");
			if (!landLayer) {
				throw new Error("Could not find bg layer for RangedFireBall");
			}
			const stuffLayer = getMap().getLayer("Stuff");
			if (!stuffLayer) {
				throw new Error("Could not find stuff layer for RangedFireBall");
			}
			sprite.scene.physics.add.collider(
				effect,
				stuffLayer.tilemapLayer,
				() => {
					makeFireExplosion(sprite.scene, effect.body.center);
					fireSound?.stop();
					effect?.destroy();
				},
				() => {
					return allowHitWalls;
				}
			);
			sprite.scene.physics.add.collider(
				effect,
				landLayer.tilemapLayer,
				() => {
					makeFireExplosion(sprite.scene, effect.body.center);
					fireSound?.stop();
					effect?.destroy();
				},
				(_, tile) => {
					return allowHitWalls && doesTileBlockFire(tile);
				}
			);
		}

		sprite.scene.physics.add.overlap(player, effect, () => {
			fireSound?.stop();
			MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
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

		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			fireSound?.stop();
			effect?.destroy();
		});
	}
}

export class RangedIceBall implements Behavior {
	#speed = 50;
	#postAttackTime = 1000;
	name: string;

	constructor(name: string, speed: number, postAttackTime: number) {
		this.name = name;
		this.#speed = speed;
		this.#postAttackTime = postAttackTime;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
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
		effect.setDepth(config.effectDepth);
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
		const player = getPlayerOrThrow();
		sprite.scene.physics.moveToObject(effect, player, this.#speed);

		sprite.scene.physics.add.overlap(player, effect, () => {
			sprite?.scene?.sound.stopByKey("ice");
			MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
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
				goToNextState();
			},
		});

		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			sprite?.scene?.sound?.stopByKey("ice");
			effect?.destroy();
		});
	}
}

export class WalkWithFire implements Behavior {
	#enemySpeed = 12;
	#minWalkTime = 20_000;
	#maxWalkTime = 25_000;
	#fireLifetime = 5_000;
	name: string;
	#walkSound: Sound;
	#walkBehavior: Behavior;
	#dropFireTimer: Phaser.Time.TimerEvent;

	constructor(
		name: string,
		config?: {
			speed?: number;
			minWalkTime?: number;
			maxWalkTime?: number;
			walkSound?: Sound;
		}
	) {
		this.name = name;
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
		goToNextState: BehaviorCompleteCallback,
		enemyManager: EnemyManager
	): void {
		this.#walkBehavior = new RandomlyWalk("walk-in-WalkWithFire", {
			speed: this.#enemySpeed,
			minWalkTime: this.#maxWalkTime,
			maxWalkTime: this.#maxWalkTime,
			walkSound: this.#walkSound,
		});
		this.#walkBehavior.init(sprite, () => ({}), enemyManager);

		this.#dropFireTimer = sprite.scene.time.addEvent({
			delay: 1000,
			repeat: -1,
			callback: () => {
				this.#dropFire(sprite);
			},
		});

		sprite.scene.time.addEvent({
			delay: this.#getWalkingTime(),
			callback: () => {
				this.#dropFireTimer.remove();
				goToNextState();
			},
		});
	}

	#dropFire(
		sprite: Phaser.GameObjects.Sprite
	): Phaser.GameObjects.Sprite | undefined {
		if (!isDynamicSprite(sprite)) {
			return undefined;
		}
		const effect = sprite.scene.add.sprite(
			sprite.body.center.x,
			sprite.body.center.y,
			"fire-power",
			0
		);
		sprite.scene.physics.add.existing(effect);
		effect.setDepth(config.effectDepth);
		sprite.scene.anims.create({
			key: "fire-power",
			frames: sprite.anims.generateFrameNumbers("fire-power"),
			frameRate: 50,
			showOnStart: true,
			hideOnComplete: true,
		});
		effect.anims.play(
			{
				key: "fire-power",
				repeat: -1,
			},
			true
		);
		if (!isDynamicSprite(effect)) {
			throw new Error("Could not update fire ball");
		}
		effect.setDisplaySize(effect.body.width * 0.5, effect.body.height * 0.5);
		effect.body.setSize(effect.body.width * 0.4, effect.body.height * 0.4);

		const player = getPlayerOrThrow();

		sprite.scene.physics.add.overlap(player, effect, () => {
			MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
		});

		MainEvents.once(Events.LeavingRoom, () => {
			effect?.destroy();
		});

		sprite.scene.time.addEvent({
			delay: this.#fireLifetime,
			callback: () => {
				effect?.destroy();
			},
		});

		return effect;
	}

	#getWalkingTime(): number {
		return Phaser.Math.Between(this.#minWalkTime, this.#maxWalkTime);
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		_goToNextState: BehaviorCompleteCallback,
		enemyManager: EnemyManager
	) {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		this.#walkBehavior?.update?.(sprite, () => ({}), enemyManager);
	}

	cleanUp(sprite: Phaser.GameObjects.Sprite, enemyManager: EnemyManager) {
		this.#walkBehavior?.cleanUp?.(sprite, enemyManager);
	}
}

export class IceBeam implements Behavior {
	iceMeltTime = 4000;
	attackSpeed = 150;
	name: string;

	constructor(name: string, attackSpeed: number) {
		this.name = name;
		this.attackSpeed = attackSpeed;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback,
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
		effect.setDepth(config.effectDepth);
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
		const player = getPlayerOrThrow();
		sprite.scene.physics.moveToObject(effect, player, this.attackSpeed);

		const landLayer = getMap().getLayer("Background");
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

		sprite.scene.physics.add.overlap(player, effect, () => {
			sprite.scene?.sound.stopByKey("freeze");
			MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
			effect.destroy();

			goToNextState();
		});

		sprite.once(Events.MonsterDying, () => {
			sprite.scene?.sound.stopByKey("freeze");
			effect?.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			sprite.scene?.sound.stopByKey("freeze");
			effect?.destroy();

			goToNextState();
		});
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			sprite.scene?.sound.stopByKey("freeze");
			effect?.destroy();

			goToNextState();
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
		getMap().removeTile(tile, iceTileFrame);
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
		const player = getPlayerOrThrow();
		if (sprite.scene.physics.overlapTiles(player, [tile])) {
			// Do not melt the tile we stand on.
			sprite.scene.time.addEvent({
				delay: this.iceMeltTime,
				callback: () => this.meltFrozenTile(tile, sprite, enemyManager),
			});
			return;
		}

		getMap().removeTile(tile);
		getMap().putTileAt(tile, tile.x, tile.y, true, tile.layer.name);
		const landLayer = getMap().getLayer("Background");
		if (!landLayer) {
			throw new Error("Could not find land layer for ice beam");
		}
		landLayer.tilemapLayer.setCollisionByProperty({ collides: true });
	}
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

export class SwoopAttack implements Behavior {
	name: string;
	#followTime: number | undefined;
	#awareDistance: number | undefined;
	#speed: number = 10;
	#maxSpeed: number = 30;
	#lastDistance = 0;
	walkSound: Sound;

	constructor(
		name: string,
		config?: {
			speed?: number;
			maxSpeed?: number;
			followTime?: number;
			awareDistance?: number;
		}
	) {
		this.name = name;
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
		goToNextState: BehaviorCompleteCallback
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

					goToNextState();
				},
			});
		}
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		const player = getPlayerOrThrow();
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		if (!player.body) {
			return;
		}
		if (sprite.data.get(DataKeys.Stunned)) {
			return;
		}

		const distance = Phaser.Math.Distance.BetweenPoints(
			sprite.body.center,
			player.body.center
		);
		if (this.#awareDistance) {
			if (distance > this.#awareDistance) {
				sprite.body.stop();

				goToNextState();
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
			player.body.center.x,
			player.body.center.y,
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

export class FollowPlayer implements Behavior {
	name: string;
	#followTime: number | undefined;
	#awareDistance: number | undefined;
	#stopWhenCloseDistance: number | undefined;
	#speed: number = 30;

	constructor(
		name: string,
		config?: {
			speed?: number;
			followTime?: number;
			awareDistance?: number;
			stopWhenCloseDistance?: number;
		}
	) {
		this.name = name;
		if (config?.followTime) {
			this.#followTime = config.followTime;
		}
		if (config?.awareDistance) {
			this.#awareDistance = config.awareDistance;
		}
		if (config?.speed) {
			this.#speed = config.speed;
		}
		if (config?.stopWhenCloseDistance) {
			this.#stopWhenCloseDistance = config.stopWhenCloseDistance;
		}
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}

		if (this.#followTime) {
			sprite.scene.time.addEvent({
				delay: this.#followTime,
				callback: () => {
					sprite?.body?.setVelocity(0);

					goToNextState();
				},
			});
		}
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		const player = getPlayerOrThrow();
		if (!isDynamicSprite(sprite)) {
			throw new Error("invalid sprite");
		}
		if (!player.body) {
			return;
		}
		if (sprite.data.get(DataKeys.Stunned)) {
			return;
		}

		const distance = Phaser.Math.Distance.BetweenPoints(
			sprite.body.center,
			player.body.center
		);
		if (this.#awareDistance) {
			if (distance > this.#awareDistance) {
				sprite.scene?.sound.stopByKey("water-walk");
				sprite.body.stop();

				goToNextState();
				return;
			}
		}

		// If we are extremely close we don't need to change course.
		if (this.#stopWhenCloseDistance && distance < this.#stopWhenCloseDistance) {
			sprite.scene?.sound.stopByKey("water-walk");
			sprite.body.stop();

			goToNextState();
			return;
		}
		if (distance < 10) {
			return;
		}

		sprite.scene.physics.moveTo(
			sprite,
			player.body.center.x,
			player.body.center.y,
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

function getWalkingDirectionUpDown(
	sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
): SpriteDirection {
	const previousDirection: SpriteDirection | undefined =
		sprite.data.get("direction");
	let direction = Phaser.Math.Between(0, 1) === 1 ? SpriteUp : SpriteDown;
	if (previousDirection !== undefined) {
		while (direction === previousDirection) {
			direction = Phaser.Math.Between(0, 1) === 1 ? SpriteUp : SpriteDown;
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
	#beingDestroyed = false;

	constructor(
		scene: Phaser.Scene,
		sprite: Phaser.GameObjects.Sprite,
		x: number,
		y: number,
		texture: string,
		initialFrame: number,
		speed: number
	) {
		super(scene, x, y, texture, initialFrame);
		this.#speed = speed;
		this.init(sprite);
		this.addToDisplayList();
		this.addToUpdateList();
	}

	init(sprite: Phaser.GameObjects.Sprite): void {
		this.scene.anims.create({
			key: "green-ball",
			frames: this.anims.generateFrameNumbers("green-ball"),
			frameRate: 50,
			showOnStart: true,
			hideOnComplete: true,
			yoyo: true,
		});
		this.scene.physics.add.existing(this);
		this.setDepth(config.effectDepth);
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

		const player = getPlayerOrThrow();
		this.scene.physics.add.overlap(player, this, () => {
			this.scene?.sound?.stopByKey("fire-loop");
			MainEvents.emit(Events.EnemyHitPlayer, { source: sprite, damage: 1 });
			this.destroy();
		});
		MainEvents.once(Events.LeavingRoom, () => {
			this.destroy();
		});

		const sword = getPhysicsSpriteOrThrow("sword");
		this.scene.physics.add.overlap(sword, this, () => {
			if (!sword.data.get(DataKeys.SwordAttackActive)) {
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
			effect.setDepth(config.effectDepth);
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
		const player = getPlayerOrThrow();
		this.scene?.physics.moveToObject(this, player, this.#speed);
	}
}

export class ThrowRocks implements Behavior {
	#speed = 500;
	#delayBeforeEnd = 1000;
	#delayBetweenRocks = 600;
	#isEnding = false;
	#rockCount = 3;
	#sprite: Phaser.GameObjects.Sprite;
	#rocksCreated: Phaser.GameObjects.Sprite[] = [];
	#enemyManager: EnemyManager;
	name: string;

	constructor(
		name: string,
		config: {
			speed: number;
			rockCount: number;
			delayBeforeEnd: number;
			delayBetweenRocks: number;
		}
	) {
		this.name = name;
		this.#speed = config.speed;
		this.#rockCount = config.rockCount;
		this.#delayBeforeEnd = config.delayBeforeEnd;
		this.#delayBetweenRocks = config.delayBetweenRocks;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		_: BehaviorCompleteCallback,
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
		const player = getPlayerOrThrow();
		this.#sprite.anims.play("throwrock");
		const rock = this.#sprite.scene.add.sprite(
			player.body.center.x,
			player.body.center.y,
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

		const player = getPlayerOrThrow();
		if (this.#sprite.scene?.physics.overlap(player, tile)) {
			MainEvents.emit(Events.EnemyHitPlayer, {
				source: this.#sprite,
				damage: 1,
			});
		}
		this.#sprite.scene?.physics.add.collider(player, tile);
		this.#sprite.scene?.physics.add.collider(this.#enemyManager.enemies, tile);
	}

	waitAndEnd(goToNextState: BehaviorCompleteCallback) {
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

				goToNextState();
			},
		});
	}

	update(
		_: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		if (this.#rockCount === 0) {
			this.waitAndEnd(goToNextState);
		}
	}
}

export class Decide implements Behavior {
	name: string;
	#decider: () => void;

	constructor(
		name: string,
		config: {
			decider: () => void;
		}
	) {
		this.name = name;
		this.#decider = config.decider;
	}

	init(
		_: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		this.#decider();
		goToNextState();
	}
}

export class Sequence implements Behavior {
	name: string;
	#currentCreatorIndex: number = 0;
	#creators: Array<() => Behavior>;
	#loopIf?: () => boolean;
	#behavior: Behavior | undefined;
	#goToNextState: () => void;
	#sprite: Phaser.GameObjects.Sprite;
	#enemyManager: EnemyManager;

	constructor(
		name: string,
		config: {
			creators: Array<() => Behavior>;
			loopIf?: () => boolean;
		}
	) {
		this.name = name;
		this.#creators = config.creators;
		this.#loopIf = config.loopIf;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback,
		enemyManager: EnemyManager
	): void {
		this.#sprite = sprite;
		this.#enemyManager = enemyManager;
		this.#goToNextState = goToNextState;
		this.#progressBehaviors();
	}

	#progressBehaviors(): void {
		let creator =
			this.#currentCreatorIndex < this.#creators.length
				? this.#creators[this.#currentCreatorIndex]
				: undefined;
		this.#currentCreatorIndex += 1;
		if (!creator && this.#loopIf?.()) {
			this.#currentCreatorIndex = 0;
			creator = this.#creators[this.#currentCreatorIndex];
		}
		if (!creator) {
			this.#goToNextState();
			return;
		}
		this.#behavior = creator();
		this.#startBehavior();
	}

	#startBehavior(): void {
		if (!this.#behavior) {
			throw new Error("Behavior was not set in Sequence startBehavior");
		}
		this.#behavior.init(
			this.#sprite,
			this.#behaviorFinished.bind(this),
			this.#enemyManager
		);
	}

	#behaviorFinished(): void {
		if (!this.#behavior) {
			throw new Error("Behavior was not set in Sequence behaviorFinished");
		}
		this.#behavior.cleanUp?.(this.#sprite, this.#enemyManager);
		this.#behavior = undefined;
		this.#progressBehaviors();
	}

	update(): void {
		this.#behavior?.update?.(
			this.#sprite,
			this.#behaviorFinished.bind(this),
			this.#enemyManager
		);
	}

	cleanUp(): void {
		this.#behavior?.cleanUp?.(this.#sprite, this.#enemyManager);
		this.#creators = [];
		this.#currentCreatorIndex = 0;
	}
}

export class Condition implements Behavior {
	name: string;
	#condition: () => boolean;
	#onSuccess: () => Behavior;
	#onFailure: () => Behavior;
	#behavior: Behavior;
	#goToNextState: () => void;
	#sprite: Phaser.GameObjects.Sprite;
	#enemyManager: EnemyManager;

	constructor(
		name: string,
		config: {
			condition: () => boolean;
			onSuccess: () => Behavior;
			onFailure: () => Behavior;
		}
	) {
		this.name = name;
		this.#condition = config.condition;
		this.#onSuccess = config.onSuccess;
		this.#onFailure = config.onFailure;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback,
		enemyManager: EnemyManager
	): void {
		this.#sprite = sprite;
		this.#enemyManager = enemyManager;
		this.#goToNextState = goToNextState;
		if (this.#condition()) {
			this.#behavior = this.#onSuccess();
		} else {
			this.#behavior = this.#onFailure();
		}
		this.#startBehavior();
	}

	#startBehavior(): void {
		this.#behavior.init(
			this.#sprite,
			this.#behaviorFinished.bind(this),
			this.#enemyManager
		);
	}

	#behaviorFinished(): void {
		this.#behavior.cleanUp?.(this.#sprite, this.#enemyManager);
		this.#goToNextState();
	}

	update(): void {
		this.#behavior?.update?.(
			this.#sprite,
			this.#behaviorFinished.bind(this),
			this.#enemyManager
		);
	}

	cleanUp(): void {
		this.#behavior?.cleanUp?.(this.#sprite, this.#enemyManager);
	}
}

export class Repeat implements Behavior {
	name: string;
	#count: number;
	#currentBehaviorCount: number = 0;
	#createBehavior: () => Behavior;
	#behavior: Behavior;
	#goToNextState: () => void;
	#sprite: Phaser.GameObjects.Sprite;
	#enemyManager: EnemyManager;

	constructor(
		name: string,
		config: {
			count: number;
			createBehavior: () => Behavior;
		}
	) {
		this.name = name;
		this.#count = config.count;
		this.#createBehavior = config.createBehavior;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback,
		enemyManager: EnemyManager
	): void {
		this.#sprite = sprite;
		this.#enemyManager = enemyManager;
		this.#goToNextState = goToNextState;
		this.#behavior = this.#createBehavior();
		this.#startBehavior();
	}

	#startBehavior(): void {
		this.#behavior.init(
			this.#sprite,
			this.#behaviorFinished.bind(this),
			this.#enemyManager
		);
	}

	#behaviorFinished(): void {
		this.#currentBehaviorCount += 1;
		if (this.#currentBehaviorCount < this.#count) {
			this.#behavior.cleanUp?.(this.#sprite, this.#enemyManager);
			this.#behavior = this.#createBehavior();
			this.#startBehavior();
			return;
		}
		this.#goToNextState();
		return;
	}

	update(): void {
		this.#behavior.update?.(
			this.#sprite,
			this.#behaviorFinished.bind(this),
			this.#enemyManager
		);
	}

	cleanUp(): void {
		this.#behavior.cleanUp?.(this.#sprite, this.#enemyManager);
	}
}

export class ToggleRoomDark implements Behavior {
	name: string;
	#shouldBeDark: boolean;

	constructor(name: string, shouldBeDark: boolean) {
		this.name = name;
		this.#shouldBeDark = shouldBeDark;
	}

	init(
		_sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback
	): void {
		MainEvents.emit(
			this.#shouldBeDark ? Events.MakeRoomDark : Events.MakeRoomLight
		);
		goToNextState();
	}

	cleanUp() {
		MainEvents.emit(Events.MakeRoomLight);
	}
}
