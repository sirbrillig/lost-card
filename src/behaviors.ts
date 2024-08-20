import {
	SpriteDirection,
	invertSpriteDirection,
	isTilemapTile,
	isDynamicSprite,
	isTileWithPropertiesObject,
	SpriteUp,
	SpriteDown,
	SpriteLeft,
	SpriteRight,
	Events,
	DataKeys,
	getTilesInRoom,
	createVelocityForDirection,
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
	#maxSpawnedEnemies: number = 18;
	#enemiesToSpawn: number = 6;
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

		for (let x = 0; x < this.#enemiesToSpawn; x++) {
			this.#addEnemy(sprite, enemyManager);
		}

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
	#minWalkTime = 800;
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

		const direction = getWalkingDirection(sprite);
		this.#walkInDirection(sprite, direction);

		sprite.scene.time.addEvent({
			delay: this.#getWalkingTime(),
			callback: () => {
				sprite?.body?.setVelocity(0);
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

		const previousDirection: SpriteDirection | undefined =
			sprite.data.get("direction");
		let direction = Phaser.Math.Between(0, 1) === 1 ? SpriteLeft : SpriteRight;
		if (previousDirection !== undefined) {
			direction = invertSpriteDirection(previousDirection);
		}
		sprite.data.set("direction", direction);
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

export class RangedIceBall<AllStates extends string>
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
				repeat: 3,
			},
			true
		);
		if (!isDynamicSprite(effect)) {
			throw new Error("Could not update ice ball");
		}
		effect.setDisplaySize(effect.body.width * 0.8, effect.body.height * 0.8);
		effect.body.setSize(effect.body.width * 0.5, effect.body.height * 0.5);
		sprite.scene.physics.moveToObject(effect, enemyManager.player, 120);

		sprite.scene.physics.add.overlap(enemyManager.player, effect, () => {
			MainEvents.emit(Events.EnemyHitPlayer, true);
			effect.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
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

export class WalkWithFire<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	name: AllStates;
	#effect: Phaser.GameObjects.Sprite;
	#enemySpeed = 50;

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
		const direction = getWalkingDirection(sprite);
		this.#walkInDirection(sprite, direction);

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
			MainEvents.emit(Events.EnemyHitPlayer, true);
			this.#effect.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		});

		sprite.once(Events.MonsterDying, () => {
			this.#effect?.destroy();
		});
		this.#effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.#effect.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
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
			25
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
			MainEvents.emit(Events.EnemyHitPlayer, true);
			effect.destroy();
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
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

	freezeWaterTile(
		tile: Phaser.Tilemaps.Tile,
		sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
		enemyManager: EnemyManager
	) {
		if (!isTileWithPropertiesObject(tile) || !tile.properties.isWater) {
			return;
		}
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
