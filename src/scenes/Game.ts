import { Scene } from "phaser";
import { MonsterA } from "./MonsterA";
import { BossA } from "./BossA";
import {
	SpriteUp,
	SpriteRight,
	SpriteDown,
	SpriteLeft,
	SpriteDirection,
	invertSpriteDirection,
	isDynamicSprite,
	isDynamicImage,
	isTilemapTile,
	getObjectId,
	isHittableSprite,
	getDoorTouchingPlayer,
	getRoomForPoint,
	hideAllRoomsExcept,
	getTransientTilesInRoom,
} from "../shared";

export class Game extends Scene {
	cursors: Phaser.Types.Input.Keyboard.CursorKeys;
	player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	sword: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
	enemies: Phaser.Physics.Arcade.Group;
	characterSpeed: number = 90;

	framesSincePlayerHit: number = 0;
	framesSinceAttack: number = 0;
	postAttackCooldown: number = 200;
	lastAttackedAt: number = 0;
	framesSincePower: number = 0;
	postHitPlayerKnockback: number = 110;
	postHitEnemyKnockback: number = 50;
	postHitInvincibilityTime: number = 500;
	attackFrameRate: number = 30;
	attackDelay: number = 50;
	playerDirection: SpriteDirection = SpriteDown;

	enemyCollider: Phaser.Physics.Arcade.Collider;

	map: Phaser.Tilemaps.Tilemap;
	landLayer: Phaser.Tilemaps.TilemapLayer;
	doorsLayer: Phaser.Tilemaps.TilemapLayer;
	stuffLayer: Phaser.Tilemaps.TilemapLayer;
	activeRoom: Phaser.Types.Tilemaps.TiledObject;
	createdTiles: Phaser.Tilemaps.Tile[] = [];
	enteredRoomAt: number = 0;

	doors: Phaser.Types.Tilemaps.TiledObject[];

	constructor() {
		super("Game");
	}

	create() {
		// this.physics.world.createDebugGraphic();

		this.map = this.make.tilemap({ key: "map" });
		const tileset = this.map.addTilesetImage("Final_Tileset", "dungeon_tiles");
		if (!tileset) {
			throw new Error("Could not make tileset");
		}

		this.createPlayer();
		this.createEnemies();

		this.landLayer = this.createTileLayer("Background", tileset, 0);
		this.setTileLayerCollisions(this.landLayer, this.player);
		this.setTileLayerCollisions(this.landLayer, this.enemies);
		this.doorsLayer = this.createTileLayer("Doors", tileset, 0);
		// Enemies collide with doors but players can pass through them.
		this.setTileLayerCollisions(this.doorsLayer, this.enemies);
		this.stuffLayer = this.createTileLayer("Stuff", tileset, 0);
		this.setTileLayerCollisions(this.stuffLayer, this.player);
		this.setTileLayerCollisions(this.stuffLayer, this.enemies);

		this.enemyCollider = this.physics.add.collider(
			this.player,
			this.enemies,
			(player, enemy) => {
				if (isDynamicSprite(player) && isDynamicSprite(enemy)) {
					this.enemyHitPlayer();
				}
			}
		);

		this.physics.add.collider(this.sword, this.enemies, (_, enemy) => {
			if (!isDynamicSprite(enemy)) {
				throw new Error("Enemy sprite is not valid for hitboxing with sword");
			}
			this.playerHitEnemy(enemy);
		});

		if (!this.input.keyboard) {
			throw new Error("No keyboard controls could be found");
		}
		this.cursors = this.input.keyboard.createCursorKeys();
		this.input.keyboard.on("keydown-SPACE", () => {
			// Attack
			if (this.canPlayerAttack()) {
				this.player.body.setVelocity(0);
				this.framesSinceAttack = 40;
			}
		});
		this.input.keyboard.on("keydown-SHIFT", () => {
			// Power
			if (this.canPlayerAttack()) {
				this.player.body.setVelocity(0);
				this.framesSincePower = 50;
			}
		});

		this.setUpCamera();

		this.hideAllTransientTiles();
	}

	createTileLayer(
		layerName: string,
		tileset: Phaser.Tilemaps.Tileset,
		depth: number
	): Phaser.Tilemaps.TilemapLayer {
		const layer = this.map.createLayer(layerName, tileset, 0, 0);
		if (!layer) {
			throw new Error("Could not open tileset layers");
		}
		layer.setDepth(depth);
		layer.setCollisionByProperty({ collides: true });
		return layer;
	}

	setTileLayerCollisions(
		layer: Phaser.Tilemaps.TilemapLayer,
		sprite: Phaser.Types.Physics.Arcade.ArcadeColliderType
	) {
		this.physics.add.collider(sprite, layer);
	}

	setUpCamera(): void {
		this.cameras.main.setBackgroundColor("black");

		// Focus the camera on the room that the player currently is in.
		const tileWidth = 16;
		const tileHeight = 16;
		const room = getRoomForPoint(
			this.map,
			this.player.x + tileWidth,
			this.player.y + tileHeight
		);
		this.moveCameraToRoom(room);

		this.doors =
			this.map.filterObjects("MetaObjects", (obj) => {
				if (!isTilemapTile(obj)) {
					return false;
				}
				const destinationId = obj.properties.find(
					(prop: { name: string }) => prop.name === "doorto"
				)?.value;
				if (!destinationId) {
					return false;
				}
				return true;
			}) ?? [];
	}

	moveCameraToRoom(room: Phaser.Types.Tilemaps.TiledObject) {
		const camera = this.cameras.main;
		const zoomLevel = 6;
		camera.setZoom(zoomLevel);

		// This size is in-game pixels (corresponding to the tiles in the scene) that will be zoomed.
		if (
			room.x === undefined ||
			room.y === undefined ||
			!room.height ||
			!room.width
		) {
			throw new Error("Cannot move camera: Room has no position or size");
		}
		const roomWidth = room.width;
		const roomHeight = room.height;
		camera.setBounds(room.x, room.y, roomWidth, roomHeight);
		camera.useBounds = false;

		camera.startFollow(this.player);

		this.activeRoom = room;
		this.enteredRoomAt = this.time.now;
		hideAllRoomsExcept(this.map, this.enemies, room);
	}

	handleCollideDoor(door: Phaser.Types.Tilemaps.TiledObject) {
		const destinationId = door.properties.find(
			(prop: { name: string }) => prop.name === "doorto"
		)?.value;
		if (!destinationId) {
			throw new Error("Hit door without destination id");
		}
		const destinationTile = this.map.findObject(
			"MetaObjects",
			(obj: unknown) => getObjectId(obj) === destinationId
		);
		if (!destinationTile) {
			throw new Error("Hit door without destination tile");
		}
		console.log("moving to tile", destinationTile);

		const destinationDirection = destinationTile.properties.find(
			(prop: { name: string }) => prop.name === "doordirection"
		)?.value;
		if (destinationDirection === undefined) {
			throw new Error("Door has no destination direction");
		}

		// if the player enters a door, teleport them just past the corresponding door
		const [destinationX, destinationY] = this.getDoorDestinationCoordinates(
			destinationTile,
			invertSpriteDirection(destinationDirection)
		);
		console.log("moving player to point", destinationX, destinationY);
		this.movePlayerToPoint(destinationX, destinationY);

		// if the player enters a door, move the camera to that room
		const room = getRoomForPoint(this.map, this.player.x, this.player.y);
		console.log("moving camera to room", room);
		this.moveCameraToRoom(room);
	}

	getDoorDestinationCoordinates(
		destinationTile: Phaser.Types.Tilemaps.TiledObject,
		destinationDirection: SpriteDirection
	): [number, number] {
		if (destinationTile.x == undefined || destinationTile.y === undefined) {
			throw new Error("Destination tile has no position");
		}
		// If the player enters a door, teleport them just past the corresponding
		// door. That way they won't trigger the door on the other side and end up
		// in a loop.
		const destinationX = (() => {
			if (destinationDirection === SpriteLeft) {
				return destinationTile.x - 6;
			}
			if (destinationDirection === SpriteRight) {
				return destinationTile.x + 18;
			}
			return destinationTile.x + 8;
		})();
		const destinationY = (() => {
			if (destinationDirection === SpriteUp) {
				return destinationTile.y - 18;
			}
			if (destinationDirection === SpriteDown) {
				return destinationTile.y + 6;
			}
			return destinationTile.y - 6;
		})();
		return [destinationX, destinationY];
	}

	update() {
		this.enemies.getChildren().forEach((enemy) => {
			enemy.update();
		});
		this.updatePlayer();
		this.updateRoom();
	}

	updateRoom() {
		this.checkForPowerHitTiles();
		this.updateAppearingTiles();
	}

	checkForPowerHitTiles() {
		this.createdTiles.forEach((tile) => {
			if (this.physics.overlapTiles(this.sword, [tile])) {
				if (!tile.visible) {
					return;
				}
				if (this.framesSincePower === 0) {
					return;
				}
				if (!isTilemapTile(tile)) {
					return;
				}
				const isAffectedByPower =
					tile.properties?.find(
						(prop: { name: string }) => prop.name === "affectedByWindCard"
					)?.value ?? 0;
				if (!isAffectedByPower) {
					return;
				}
				if (!tile.x || !tile.y) {
					return;
				}
				console.log("hit item", tile);
				this.createdTiles = this.createdTiles.filter((tileA) => tileA !== tile);
				this.stuffLayer.removeTileAtWorldXY(tile.pixelX, tile.pixelY);
				tile.destroy();
			}
		});
	}

	updateAppearingTiles() {
		const transientTiles = getTransientTilesInRoom(this.map, this.activeRoom);
		const appearingTiles = transientTiles.filter((tile) => {
			if (!isTilemapTile(tile)) {
				return false;
			}
			return tile.properties?.some(
				(prop: { name: string }) => prop.name === "msAfterApproach"
			);
		});

		appearingTiles.forEach((tile) => {
			if (!isTilemapTile(tile)) {
				return false;
			}
			const msAfterApproach: number =
				tile.properties?.find(
					(prop: { name: string }) => prop.name === "msAfterApproach"
				)?.value ?? 0;
			const previewBeforeAppear: number =
				tile.properties?.find(
					(prop: { name: string }) => prop.name === "previewBeforeAppear"
				)?.value ?? 0;

			const timeSinceApproach = this.time.now - this.enteredRoomAt;
			if (timeSinceApproach < msAfterApproach) {
				return;
			}

			if (tile.visible) {
				return;
			}
			tile.visible = true;
			if (!tile.gid || !tile.x || !tile.y) {
				return;
			}

			const tileAdded = this.stuffLayer.putTileAtWorldXY(
				tile.gid,
				tile.x + tile.width / 2,
				tile.y
			);
			tileAdded.properties = tile.properties;

			console.log("adding tile", tileAdded, "from", tile);
			tileAdded.alpha = 0.4;
			setTimeout(() => {
				tileAdded.alpha = 1;

				tileAdded.setCollision(true, true, true, true);
				if (this.physics.overlapTiles(this.player, [tileAdded])) {
					console.log("hit player with tile");
					this.enemyHitPlayer();
				}

				this.createdTiles.push(tileAdded);
			}, previewBeforeAppear);
		});
	}

	hideAllTransientTiles() {
		const layerName = "Transients";
		const layer = this.map.getObjectLayer(layerName);
		const appearingTiles =
			layer?.objects.filter((tile) => {
				if (!isTilemapTile(tile)) {
					return false;
				}
				return tile.properties?.some(
					(prop: { name: string }) => prop.name === "msAfterApproach"
				);
			}) ?? [];
		appearingTiles.forEach((tile) => {
			tile.visible = false;
		});
	}

	maybeChangeRoom() {
		const touchingDoor = getDoorTouchingPlayer(this.doors, this.player);
		if (touchingDoor) {
			this.handleCollideDoor(touchingDoor);
		}
	}

	movePlayerToPoint(x: number, y: number) {
		this.player.setPosition(x, y);
	}

	getPlayerSpeed(): number {
		return this.characterSpeed;
	}

	updateSwordHitboxForAttack() {
		// Add hitbox for sword in direction of sprite
		const width = (() => {
			if (
				this.playerDirection === SpriteLeft ||
				this.playerDirection === SpriteRight
			) {
				return 6;
			}
			return 12;
		})();
		const height = (() => {
			if (
				this.playerDirection === SpriteUp ||
				this.playerDirection === SpriteDown
			) {
				return 6;
			}
			return 12;
		})();

		this.sword.body.setSize(width, height);

		const [xOffset, yOffset] = this.getSwordOffset();
		this.sword.x = this.player.x + xOffset;
		this.sword.y = this.player.y + yOffset;
		this.physics.world.add(this.sword.body);
	}

	getSwordOffset() {
		const xOffset = (() => {
			if (this.playerDirection === SpriteLeft) {
				return -8;
			}
			if (this.playerDirection === SpriteRight) {
				return 8;
			}
			return 0;
		})();
		const yOffset = (() => {
			if (this.playerDirection === SpriteUp) {
				return -8;
			}
			if (this.playerDirection === SpriteDown) {
				return 8;
			}
			return 0;
		})();
		return [xOffset, yOffset];
	}

	updateSwordHitboxForPower() {
		// Add hitbox for sword in direction of sprite

		const width = (() => {
			if (
				this.playerDirection === SpriteLeft ||
				this.playerDirection === SpriteRight
			) {
				return 10;
			}
			return 5;
		})();
		const height = (() => {
			if (
				this.playerDirection === SpriteUp ||
				this.playerDirection === SpriteDown
			) {
				return 10;
			}
			return 5;
		})();

		this.sword.body.setSize(width, height);
		const [xOffset, yOffset] = this.getSwordOffset();

		this.sword.x = this.player.x + xOffset;
		this.sword.y = this.player.y + yOffset;
	}

	isPlayerAttacking() {
		return (
			this.framesSinceAttack > 0 &&
			this.player.anims.hasStarted &&
			this.player.anims.getName().includes("attack")
		);
	}

	updateSwordHitbox() {
		this.sword.body.debugShowBody = false;
		this.sword.body.setVelocity(0);
		this.updateSwordHitboxForAttack();
		if (this.isPlayerAttacking()) {
			this.sword.body.debugShowBody = true;
			return;
		}
		if (this.framesSincePower > 0) {
			this.updateSwordHitboxForPower();
			this.sword.body.debugShowBody = true;
			return;
		}
	}

	createPlayer(): void {
		const spawnPoint = this.map.findObject(
			"MetaObjects",
			(obj) => obj.name === "Start Point"
		);
		this.player = this.physics.add.sprite(
			spawnPoint?.x ?? 400,
			spawnPoint?.y ?? 350,
			"character",
			0
		);
		this.player.setDisplaySize(24, 24);
		this.player.setSize(this.player.width * 0.35, this.player.height * 0.35);
		this.player.setDepth(1);
		const sword = this.physics.add.existing(
			this.add.rectangle(400, 350, 20, 20)
		);
		if (!isDynamicImage(sword)) {
			throw new Error("Sword hitbox is not the right kind of object");
		}
		this.sword = sword;
		this.physics.world.add(this.sword.body);
		this.updateSwordHitbox();

		const anims = this.anims;
		anims.create({
			key: "character-down-walk",
			frames: anims.generateFrameNumbers("character", { start: 16, end: 19 }),
			frameRate: 10,
			repeat: -1,
		});
		anims.create({
			key: "character-right-walk",
			frames: anims.generateFrameNumbers("character", { start: 24, end: 27 }),
			frameRate: 10,
			repeat: -1,
		});
		anims.create({
			key: "character-up-walk",
			frames: anims.generateFrameNumbers("character", { start: 28, end: 31 }),
			frameRate: 10,
			repeat: -1,
		});
		anims.create({
			key: "character-left-walk",
			frames: anims.generateFrameNumbers("character", { start: 20, end: 23 }),
			frameRate: 10,
			repeat: -1,
		});

		anims.create({
			key: "character-down-attack",
			frames: anims.generateFrameNumbers("character", {
				start: 0,
				end: 3,
			}),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "character-right-attack",
			frames: anims.generateFrameNumbers("character", {
				start: 8,
				end: 11,
			}),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "character-up-attack",
			frames: anims.generateFrameNumbers("character", {
				start: 12,
				end: 15,
			}),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "character-left-attack",
			frames: anims.generateFrameNumbers("character", {
				start: 4,
				end: 7,
			}),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});

		anims.create({
			key: "character-down-power",
			frames: anims.generateFrameNumbers("character", {
				start: 2,
				end: 0,
			}),
			frameRate: 1,
			repeat: 0,
		});
		anims.create({
			key: "character-right-power",
			frames: anims.generateFrameNumbers("character", {
				start: 9,
				end: 9,
			}),
			frameRate: 1,
			repeat: 0,
		});
		anims.create({
			key: "character-up-power",
			frames: anims.generateFrameNumbers("character", {
				start: 14,
				end: 14,
			}),
			frameRate: 1,
			repeat: 0,
		});
		anims.create({
			key: "character-left-power",
			frames: anims.generateFrameNumbers("character", {
				start: 5,
				end: 5,
			}),
			frameRate: 1,
			repeat: 0,
		});
		this.player.setCollideWorldBounds(true);
	}

	createEnemies(): void {
		this.anims.create({
			key: "logman-down-walk",
			frames: this.anims.generateFrameNumbers("logman", { start: 0, end: 3 }),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "logman-right-walk",
			frames: this.anims.generateFrameNumbers("logman", { start: 12, end: 15 }),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "logman-up-walk",
			frames: this.anims.generateFrameNumbers("logman", { start: 6, end: 9 }),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "logman-left-walk",
			frames: this.anims.generateFrameNumbers("logman", { start: 18, end: 21 }),
			frameRate: 10,
			repeat: -1,
		});

		this.enemies = this.physics.add.group();
		const spawnPoints = this.map.filterObjects("MetaObjects", (obj) => {
			if (!isTilemapTile(obj)) {
				return false;
			}
			const isMonster = obj.properties?.find(
				(prop: { name: string }) => prop.name === "isMonster"
			)?.value;
			return isMonster === true;
		});
		spawnPoints?.forEach((point) => {
			if (point.x !== undefined && point.y !== undefined) {
				console.log("creating monster at", point.x, point.y);
				const isBoss = point.properties.find(
					(prop: { name: string }) => prop.name === "isBoss"
				);
				if (isBoss) {
					this.createBoss(point.x, point.y);
				} else {
					this.createEnemy(point.x, point.y);
				}
			}
		});
	}

	createEnemy(x: number, y: number) {
		new MonsterA(this, x, y, (enemy) => {
			this.enemies.add(enemy);
		});
	}

	createBoss(x: number, y: number) {
		new BossA(this, x, y, (enemy) => {
			this.enemies.add(enemy);
		});
	}

	playerHitEnemy(
		enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	): void {
		// If the player is not in the attack animation, do nothing. Also do nothing if the player is in the warmup for the attack or the cooldown.
		if (!this.isPlayerAttacking()) {
			return;
		}

		if (isHittableSprite(enemy) && enemy.isHittable()) {
			this.knockBack(this.player.body, this.postHitEnemyKnockback);
			this.cameras.main.shake(200, 0.0001);
			enemy.hit();
		}
	}

	enemyHitPlayer(): void {
		if (this.framesSincePlayerHit > 0) {
			return;
		}

		this.enemyCollider.active = false;
		this.cameras.main.shake(300, 0.0001);
		this.player.tint = 0xff0000;
		setTimeout(() => {
			this.player.clearTint();
			this.framesSincePlayerHit = 0;
			this.enemyCollider.active = true;
		}, this.postHitInvincibilityTime);

		this.knockBack(this.player.body, this.postHitPlayerKnockback);

		console.log("player got hit!");
		this.framesSincePlayerHit = 200;
	}

	knockBack(body: Phaser.Physics.Arcade.Body, time: number) {
		const direction = this.playerDirection;
		const bounceSpeed = this.getPlayerSpeed() * 2;

		setTimeout(() => {
			body.setVelocityX(0);
			body.setVelocityY(0);
		}, time);

		body.setVelocityX(0);
		body.setVelocityY(0);
		switch (direction) {
			case SpriteUp:
				body.setVelocityY(bounceSpeed);
				break;
			case SpriteRight:
				body.setVelocityX(-bounceSpeed);
				break;
			case SpriteDown:
				body.setVelocityY(-bounceSpeed);
				break;
			case SpriteLeft:
				body.setVelocityX(bounceSpeed);
				break;
		}
	}

	getTimeSinceLastAttack(): number {
		return this.time.now - this.lastAttackedAt;
	}

	canPlayerAttack(): boolean {
		return (
			this.framesSinceAttack === 0 &&
			this.getTimeSinceLastAttack() > this.postAttackCooldown &&
			this.framesSincePower === 0
		);
	}

	isPlayerFrozen(): boolean {
		return this.registry.get("freezePlayer") === true;
	}

	updatePlayer(): void {
		this.updateSwordHitbox();

		if (this.framesSincePlayerHit > 0) {
			this.framesSincePlayerHit -= 1;
			this.player.setVisible(
				this.framesSincePlayerHit % 2 === 0 ? true : false
			);
			return;
		}

		this.player.setVisible(true);

		if (this.isPlayerFrozen()) {
			this.player.body.setVelocity(0);
			console.log("player frozen");
			return;
		}

		if (this.framesSinceAttack > 0) {
			this.framesSinceAttack -= 1;
			if (this.framesSinceAttack === 0) {
				this.lastAttackedAt = this.time.now;
			}
		}

		if (
			this.framesSinceAttack > 0 &&
			!this.player.anims.getName().includes("attack")
		) {
			const playerDirection = this.playerDirection;
			switch (playerDirection) {
				case SpriteUp:
					this.player.anims.play("character-up-attack", true);
					break;
				case SpriteRight:
					this.player.anims.play("character-right-attack", true);
					break;
				case SpriteDown:
					this.player.anims.play("character-down-attack", true);
					break;
				case SpriteLeft:
					this.player.anims.play("character-left-attack", true);
					break;
			}

			return;
		}

		// If the animation completes, stop the attack.
		if (this.framesSinceAttack > 0 && this.player.anims.getProgress() === 1) {
			this.framesSinceAttack = 0;
			this.lastAttackedAt = this.time.now;
			return;
		}

		if (this.framesSinceAttack > 0) {
			return;
		}

		if (this.framesSincePower > 0) {
			this.framesSincePower -= 1;
			const playerDirection = this.playerDirection;
			switch (playerDirection) {
				case SpriteUp:
					this.player.anims.play("character-up-power", true);
					break;
				case SpriteRight:
					this.player.anims.play("character-right-power", true);
					break;
				case SpriteDown:
					this.player.anims.play("character-down-power", true);
					break;
				case SpriteLeft:
					this.player.anims.play("character-left-power", true);
					break;
			}
			return;
		}

		this.player.body.setVelocity(0);
		if (this.cursors.left.isDown) {
			this.player.body.setVelocityX(-this.getPlayerSpeed());
		} else if (this.cursors.right.isDown) {
			this.player.body.setVelocityX(this.getPlayerSpeed());
		}
		if (this.cursors.up.isDown) {
			this.player.body.setVelocityY(-this.getPlayerSpeed());
		} else if (this.cursors.down.isDown) {
			this.player.body.setVelocityY(this.getPlayerSpeed());
		}

		this.player.body.velocity.normalize().scale(this.getPlayerSpeed());

		if (this.cursors.left.isDown) {
			this.player.anims.play("character-left-walk", true);
			this.playerDirection = SpriteLeft;
			this.maybeChangeRoom();
		} else if (this.cursors.right.isDown) {
			this.player.anims.play("character-right-walk", true);
			this.playerDirection = SpriteRight;
			this.maybeChangeRoom();
		} else if (this.cursors.down.isDown) {
			this.player.anims.play("character-down-walk", true);
			this.playerDirection = SpriteDown;
			this.maybeChangeRoom();
		} else if (this.cursors.up.isDown) {
			this.player.anims.play("character-up-walk", true);
			this.playerDirection = SpriteUp;
			this.maybeChangeRoom();
		} else {
			this.setPlayerIdleFrame();
		}
	}

	setPlayerIdleFrame() {
		// If the player stops moving, stop animations and reset the image to an idle frame in the correct direction.
		this.player.anims.stop();
		switch (this.playerDirection) {
			case SpriteLeft:
				this.player.anims.play("character-left-walk", true);
				this.player.setFrame(20);
				return;
			case SpriteRight:
				this.player.anims.play("character-right-walk", true);
				this.player.setFrame(24);
				return;
			case SpriteUp:
				this.player.anims.play("character-up-walk", true);
				this.player.setFrame(28);
				return;
			case SpriteDown:
				this.player.anims.play("character-down-walk", true);
				this.player.setFrame(16);
				return;
		}
	}
}
