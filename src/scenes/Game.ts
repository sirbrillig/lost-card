import { Scene } from "phaser";
import { MonsterA } from "./MonsterA";
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
	getDirectionOfSpriteMovement,
} from "../shared";

export class Game extends Scene {
	cursors: Phaser.Types.Input.Keyboard.CursorKeys;
	player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	sword: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
	enemies: Phaser.Physics.Arcade.Group;
	characterSpeed: number = 80;
	enemySpeed: number = 40;

	framesSincePlayerHit: number = 0;
	framesSinceAttack: number = 0;
	playerDirection: SpriteDirection = SpriteDown;

	map: Phaser.Tilemaps.Tilemap;
	landLayer: Phaser.Tilemaps.TilemapLayer;
	doorsLayer: Phaser.Tilemaps.TilemapLayer;
	stuffLayer: Phaser.Tilemaps.TilemapLayer;

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

		this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
			if (isDynamicSprite(player) && isDynamicSprite(enemy)) {
				this.enemyHitPlayer(player, enemy);
			}
		});

		this.physics.add.overlap(this.sword, this.enemies, (_, enemy) => {
			if (!isDynamicSprite(enemy)) {
				throw new Error("Enemy sprite is not valid for hitboxing with sword");
			}
			this.playerHitEnemy(enemy);
		});

		this.physics.add.overlap(this.player, this.enemies, (_, enemy) => {
			if (!isDynamicSprite(enemy)) {
				throw new Error("Enemy sprite is not valid for hitboxing with sword");
			}
			this.playerHitEnemy(enemy);
		});

		if (!this.input.keyboard) {
			throw new Error("No keyboard controls could be found");
		}
		this.cursors = this.input.keyboard.createCursorKeys();

		this.setUpCamera();
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
		this.physics.add.collider(sprite, layer);
	}

	setUpCamera(): void {
		// Focus the camera on the room that the player currently is in.
		const tileWidth = 16;
		const tileHeight = 16;
		const room = this.getRoomForPoint(
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

		this.hideAllRoomsExcept(room);
	}

	hideAllRoomsExcept(activeRoom: Phaser.Types.Tilemaps.TiledObject) {
		const rooms = this.getRooms();
		rooms.forEach((room) => {
			const tiles = this.getTilesInRoom(room);
			if (activeRoom.id === room.id) {
				// show room
				tiles.forEach((tile) => {
					tile.visible = true;
				});
				this.getEnemiesInRoom(room).forEach((enemy) => {
					enemy.setActive(true);
					enemy.setVisible(true);
				});
			} else {
				// hide room
				tiles.forEach((tile) => {
					tile.visible = false;
				});
				this.getEnemiesInRoom(room).forEach((enemy) => {
					enemy.setActive(false);
					enemy.setVisible(false);
				});
			}
		});
	}

	getEnemiesInRoom(
		room: Phaser.Types.Tilemaps.TiledObject
	): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] {
		return this.enemies
			.getChildren()
			.filter((enemy) => {
				if (!isDynamicSprite(enemy)) {
					return false;
				}
				return this.isEnemyInRoom(enemy, room);
			})
			.reduce((typedEnemies, enemy) => {
				if (!isDynamicSprite(enemy)) {
					return typedEnemies;
				}
				typedEnemies.push(enemy);
				return typedEnemies;
			}, [] as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]);
	}

	isEnemyInRoom(
		enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
		room: Phaser.Types.Tilemaps.TiledObject
	): boolean {
		return this.isPointInRoom(enemy.body.x, enemy.body.y, room);
	}

	getTilesInRoom(room: Phaser.Types.Tilemaps.TiledObject) {
		const tiles: Phaser.Tilemaps.Tile[] = [];
		this.map.getTileLayerNames().forEach(
			(layer) =>
				this.map
					.getTilesWithinWorldXY(
						room.x ?? 0,
						room.y ?? 0,
						room.width ?? 0,
						room.height ?? 0,
						undefined,
						undefined,
						layer
					)
					?.forEach((tile) => {
						tiles.push(tile);
					})
		);
		return tiles;
	}

	isMetaObjectRoom(obj: Phaser.GameObjects.GameObject): boolean {
		if (!isTilemapTile(obj)) {
			return false;
		}
		const roomName = obj.properties.find(
			(prop: { name: string }) => prop.name === "room"
		)?.value;
		if (!roomName) {
			return false;
		}
		return true;
	}

	getRooms(): Phaser.Types.Tilemaps.TiledObject[] {
		return (
			this.map.filterObjects("MetaObjects", (obj) =>
				this.isMetaObjectRoom(obj)
			) ?? []
		);
	}

	isPointInRoom(
		x: number,
		y: number,
		room: Phaser.Types.Tilemaps.TiledObject
	): boolean {
		if (
			room.x !== undefined &&
			room.y !== undefined &&
			room.width &&
			room.height &&
			x >= room.x &&
			x <= room.x + room.width &&
			y >= room.y &&
			y <= room.y + room.height
		) {
			return true;
		}
		return false;
	}

	getRoomForPoint(x: number, y: number): Phaser.Types.Tilemaps.TiledObject {
		const room = this.getRooms().find((room) => {
			if (this.isPointInRoom(x, y, room)) {
				return room;
			}
		});
		if (!room) {
			throw new Error(`No room found for position ${x},${y}`);
		}
		return room;
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
		const room = this.getRoomForPoint(this.player.x, this.player.y);
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
	}

	maybeChangeRoom() {
		const touchingDoor = this.doors.find((door) => {
			if (
				door.x === undefined ||
				door.y === undefined ||
				!door.height ||
				!door.width
			) {
				throw new Error("Door has no position");
			}
			// Note: for reasons I don't understand, door.x and door.y are the
			// lower-left corner of the tile so we have to adjust them to get the
			// upper-left coordinates.
			const doorX = door.x;
			const doorY = door.y - door.height;
			if (
				this.player.x >= doorX &&
				this.player.x < doorX + door.width &&
				this.player.y >= doorY &&
				this.player.y < doorY + door.height
			) {
				return true;
			}
			return false;
		});
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

	updateSwordHitbox() {
		this.sword.body.setVelocity(0);
		if (this.framesSinceAttack > 0) {
			this.physics.world.add(this.sword.body);
			// Add hitbox for sword in direction of sprite

			const width = (() => {
				if (
					this.playerDirection === SpriteLeft ||
					this.playerDirection === SpriteRight
				) {
					return 15;
				}
				return 30;
			})();
			const height = (() => {
				if (
					this.playerDirection === SpriteUp ||
					this.playerDirection === SpriteDown
				) {
					return 15;
				}
				return 30;
			})();

			const xOffset = (() => {
				if (this.playerDirection === SpriteLeft) {
					return -10;
				}
				if (this.playerDirection === SpriteRight) {
					return 10;
				}
				return 0;
			})();
			const yOffset = (() => {
				if (this.playerDirection === SpriteUp) {
					return -10;
				}
				if (this.playerDirection === SpriteDown) {
					return 10;
				}
				return 0;
			})();

			this.sword.body.setSize(width, height);

			const playerX = this.player.x;
			const playerY = this.player.y;
			this.sword.x = playerX + xOffset;
			this.sword.y = playerY + yOffset;
			return;
		}
		this.physics.world.remove(this.sword.body);
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

		const attackFrameRate = 10;
		anims.create({
			key: "character-down-attack",
			frames: anims.generateFrameNumbers("character", {
				start: 0,
				end: 3,
			}),
			frameRate: attackFrameRate,
			repeat: 0,
		});
		anims.create({
			key: "character-right-attack",
			frames: anims.generateFrameNumbers("character", {
				start: 8,
				end: 11,
			}),
			frameRate: attackFrameRate,
			repeat: 0,
		});
		anims.create({
			key: "character-up-attack",
			frames: anims.generateFrameNumbers("character", {
				start: 12,
				end: 15,
			}),
			frameRate: attackFrameRate,
			repeat: 0,
		});
		anims.create({
			key: "character-left-attack",
			frames: anims.generateFrameNumbers("character", {
				start: 4,
				end: 7,
			}),
			frameRate: attackFrameRate,
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
				const enemy = this.createEnemy(point.x, point.y);
				const isBoss = point.properties.find(
					(prop: { name: string }) => prop.name === "isBoss"
				);
				if (isBoss) {
					enemy.setScale(3);
				}
			}
		});
	}

	createEnemy(x: number, y: number) {
		const enemy = new MonsterA(this, x, y);
		this.enemies.add(enemy);
		return enemy;
	}

	playerHitEnemy(
		enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	): void {
		if (this.framesSincePlayerHit > 0) {
			return;
		}

		if (this.framesSinceAttack === 0) {
			return;
		}

		enemy.destroy();
	}

	enemyHitPlayer(
		player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
		enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	): void {
		if (this.framesSincePlayerHit > 0) {
			return;
		}

		// Bounce the player off the enemy in a random direction perpendicular to
		// the movement of the enemy so we don't get hit again immediately.
		const enemyDirection = getDirectionOfSpriteMovement(enemy.body);
		const direction = Phaser.Math.Between(0, 1);
		const bounceSpeed = this.getPlayerSpeed() * 4;
		const bounceVelocity = direction === 1 ? bounceSpeed : -bounceSpeed;
		switch (enemyDirection) {
			case SpriteUp:
				player.body.setVelocityX(bounceVelocity);
				break;
			case SpriteRight:
				player.body.setVelocityY(bounceVelocity);
				break;
			case SpriteDown:
				player.body.setVelocityX(bounceVelocity);
				break;
			case SpriteLeft:
				player.body.setVelocityY(bounceVelocity);
				break;
		}

		this.framesSincePlayerHit = 10;
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

		this.player.body.setVelocity(0);
		this.player.setVisible(true);

		if (this.framesSinceAttack > 0) {
			this.framesSinceAttack -= 1;

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

			// If the animation completes, stop the attack.
			if (this.player.anims.getProgress() === 1) {
				this.framesSinceAttack = 0;
			}

			return;
		}
		if (this.cursors.space.isDown && this.framesSinceAttack === 0) {
			this.framesSinceAttack = 40;
			return;
		}

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
				this.player.setFrame(20);
				return;
			case SpriteRight:
				this.player.setFrame(24);
				return;
			case SpriteUp:
				this.player.setFrame(28);
				return;
			case SpriteDown:
				this.player.setFrame(16);
				return;
		}
	}
}
