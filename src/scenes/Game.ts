import { Scene } from "phaser";
import { MainEvents } from "../MainEvents";
import { MonsterA } from "../MonsterA";
import { BossA } from "../BossA";
import {
	SpriteUp,
	SpriteRight,
	SpriteDown,
	SpriteLeft,
	SpriteDirection,
	isDynamicSprite,
	isDynamicImage,
	isTilemapTile,
	getObjectId,
	getRoomForPoint,
	hideAllRoomsExcept,
	getDoorDestinationCoordinates,
	getItemTouchingPlayer,
	getItemsInRoom,
	createVelocityForDirection,
	isPointInRoom,
} from "../shared";

export class Game extends Scene {
	cursors: Phaser.Types.Input.Keyboard.CursorKeys;
	debugGraphic: Phaser.GameObjects.Graphics | undefined;
	player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	sword: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
	enemies: Phaser.Physics.Arcade.Group;
	enemyCollider: Phaser.Physics.Arcade.Collider;
	floorText: Phaser.GameObjects.Text | undefined;

	framesSincePlayerHit: number = 0;
	framesSinceAttack: number = 0;
	lastAttackedAt: number = 0;
	framesSincePower: number = 0;
	playerDirection: SpriteDirection = SpriteDown;
	enteredRoomAt: number = 0;
	isPlayerBeingKnockedBack: boolean = false;
	playerTotalHitPoints: number = 4;
	playerHitPoints: number = 4;

	// Config
	characterSpeed: number = 90;
	postAttackCooldown: number = 200;
	postHitPlayerKnockback: number = 120;
	postHitEnemyKnockback: number = 50;
	postHitInvincibilityTime: number = 600;
	attackFrameRate: number = 30;
	attackDelay: number = 100;
	gotItemFreeze: number = 2000;
	showSwordFrame: number = 0;
	showPowerFrame: number = 3;
	windCardPushSpeed: number = 100;
	windCardPushTime: number = 150;

	map: Phaser.Tilemaps.Tilemap;
	landLayer: Phaser.Tilemaps.TilemapLayer;
	stuffLayer: Phaser.Tilemaps.TilemapLayer;
	activeRoom: Phaser.Types.Tilemaps.TiledObject | undefined;
	createdDoors: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	createdTiles: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	createdItems: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	spawnPoints: Phaser.Types.Tilemaps.TiledObject[] = [];

	constructor() {
		super("Game");
	}

	create() {
		this.map = this.make.tilemap({ key: "map" });
		const tilesetTile = this.map.addTilesetImage(
			"Dungeon_Tiles",
			"dungeon_tiles"
		);
		const tilesetSprite = this.map.addTilesetImage(
			"Dungeon_Tiles_Sprites",
			"dungeon_tiles_sprites"
		);
		console.log(this.map.tilesets);
		if (!tilesetTile || !tilesetSprite) {
			throw new Error("Could not make tileset");
		}

		this.createPlayer();
		this.createEnemies();

		this.landLayer = this.createTileLayer("Background", tilesetTile, 0);
		this.setTileLayerCollisions(this.landLayer, this.player);
		this.setTileLayerCollisions(this.landLayer, this.enemies);
		this.stuffLayer = this.createTileLayer("Stuff", tilesetTile, 0);
		this.setTileLayerCollisions(this.stuffLayer, this.player);
		this.setTileLayerCollisions(this.stuffLayer, this.enemies);

		this.createDoors();
		this.createAppearingTiles();
		this.createItems();

		// Enemies collide with doors but players can pass through them.
		this.setTileLayerCollisions(this.createdDoors, this.enemies);

		this.enemyCollider = this.physics.add.collider(
			this.player,
			this.enemies,
			(player, enemy) => {
				if (isDynamicSprite(player) && isDynamicSprite(enemy)) {
					this.enemyHitPlayer();
				}
			},
			(_, enemy) => {
				if (isDynamicSprite(enemy)) {
					return enemy.visible;
				}
				return false;
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
		this.input.keyboard.on("keydown-D", () => {
			if (this.debugGraphic) {
				this.debugGraphic.destroy();
				this.debugGraphic = undefined;
			} else {
				this.debugGraphic = this.physics.world.createDebugGraphic();
			}
		});
		this.input.keyboard.on("keydown-P", () => {
			this.equipSword();
			this.equipWindCard();
		});
		this.input.keyboard.on("keydown-SPACE", () => {
			// Attack
			if (this.canPlayerAttack()) {
				this.player.body.setVelocity(0);
				this.framesSinceAttack = 40;
				this.updateSwordHitbox();
			}
		});
		this.input.keyboard.on("keydown-SHIFT", () => {
			// Power
			if (this.canPlayerUsePower()) {
				this.player.body.setVelocity(0);
				this.framesSincePower = 50;
				this.updateSwordHitbox();
			}
		});

		this.setUpCamera();

		this.hideAllTransientTiles();
		this.hideHiddenItems();

		this.createOverlay();
	}

	createDoors() {
		this.createdDoors = this.map
			.createFromObjects("Doors", [{ name: "Door" }])
			.map((item) => this.physics.world.enableBody(item))
			.map((item) => item.setDataEnabled())
			.filter(isDynamicSprite)
			.map((item) => {
				item.body.pushable = false;
				return item;
			});
	}

	createAppearingTiles() {
		this.createdTiles = this.map
			.createFromObjects("Transients", [
				{
					name: "Rock",
				},
			])
			.map((item) => this.physics.world.enableBody(item))
			.map((item) => item.setDataEnabled())
			.filter(isDynamicSprite);
	}

	createItems() {
		this.createdItems = this.map
			.createFromObjects("Items", [
				{
					name: "Sword",
				},
				{
					name: "WindCard",
				},
				{
					name: "Heart",
				},
			])
			.map((item) => this.physics.world.enableBody(item))
			.map((item) => item.setDataEnabled())
			.filter(isDynamicSprite);
	}

	createTileLayer(
		layerName: string,
		tileset: Phaser.Tilemaps.Tileset,
		depth: number
	): Phaser.Tilemaps.TilemapLayer {
		const layer = this.map.createLayer(layerName, tileset, 0, 0);
		if (!layer) {
			throw new Error(`Could not open tileset layers for '${layerName}'`);
		}
		layer.setDepth(depth);
		layer.setCollisionByProperty({ collides: true });
		return layer;
	}

	setTileLayerCollisions(
		layer: Phaser.Types.Physics.Arcade.ArcadeColliderType,
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
	}

	moveCameraToRoom(room: Phaser.Types.Tilemaps.TiledObject) {
		this.clearFloorText();
		const camera = this.cameras.main;

		if (
			room.x === undefined ||
			room.y === undefined ||
			!room.height ||
			!room.width
		) {
			throw new Error("Cannot move camera: Room has no position or size");
		}
		this.physics.world.setBounds(room.x, room.y, room.width, room.height);
		camera.setBounds(room.x, room.y, room.width, room.height);
		camera.useBounds = false;

		camera.startFollow(this.player);

		this.activeRoom = room;
		this.enteredRoomAt = this.time.now;
		hideAllRoomsExcept(
			this.map,
			this.enemies,
			[...this.createdItems, ...this.createdTiles, ...this.createdDoors],
			room
		);

		this.createEnemiesInRoom();
	}

	handleCollideDoor(door: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		const destinationId = door.data.get("doorto");
		if (!destinationId) {
			throw new Error("Hit door without destination id");
		}

		const destinationTile = this.map.findObject(
			"Doors",
			(obj: unknown) => getObjectId(obj) === destinationId
		);
		if (!destinationTile) {
			throw new Error("Hit door without destination tile");
		}
		console.log("moving to tile", destinationTile, "through door", door);

		const destinationDirection = door.data.get("doordirection");
		if (destinationDirection === undefined) {
			throw new Error("Door has no destination direction");
		}
		console.log("moving through door in direction", destinationDirection);

		// if the player enters a door, teleport them just past the corresponding door
		const [destinationX, destinationY] = getDoorDestinationCoordinates(
			destinationTile,
			destinationDirection
		);
		console.log("moving player to point", destinationX, destinationY);
		this.movePlayerToPoint(destinationX, destinationY);

		// if the player enters a door, move the camera to that room
		const room = getRoomForPoint(this.map, this.player.x, this.player.y);
		console.log("moving camera to room", room);
		this.moveCameraToRoom(room);
	}

	update() {
		this.enemies.getChildren().forEach((enemy) => {
			if (!isDynamicSprite(enemy)) {
				return;
			}
			// Note that enemies should avoid rendering if they are not active!
			enemy.update();
		});
		this.updatePlayer();
		this.updateRoom();
	}

	updateRoom() {
		this.checkForPowerHitTiles();
		this.updateAppearingTiles();
	}

	destroyCreatedTile(tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		console.log("destroying tile", tile);
		this.cameras.main.shake(200, 0.004);
		this.createdTiles = this.createdTiles.filter((tileA) => tileA !== tile);
		this.stuffLayer.removeTileAtWorldXY(tile.x, tile.y);
		tile.destroy();
	}

	checkForPowerHitTiles() {
		this.createdTiles.forEach((tile) => {
			if (this.physics.overlap(this.sword, tile)) {
				if (!tile.visible) {
					return;
				}
				if (!this.isPlayerUsingPower()) {
					return;
				}
				const isAffectedByPower = tile.data.get("affectedByWindCard");
				if (!isAffectedByPower) {
					return;
				}
				if (!tile.x || !tile.y) {
					return;
				}
				console.log("hit item", tile);

				// The wind card pushes tiles.
				const velocity = createVelocityForDirection(
					this.windCardPushSpeed,
					this.playerDirection
				);
				tile.body.setVelocity(velocity.x, velocity.y);
				setTimeout(() => {
					// Tile might have been destroyed before this happens
					if (tile.body?.setVelocity) {
						tile.body.setVelocity(0, 0);
					}
				}, this.windCardPushTime);
			}
		});
	}

	updateAppearingTiles() {
		const transientTiles = this.activeRoom
			? getItemsInRoom(this.createdTiles, this.activeRoom)
			: [];
		const appearingTiles = transientTiles.filter((tile) => {
			return tile.data.get("msAfterApproach") !== undefined;
		});

		appearingTiles.forEach((tile) => {
			const msAfterApproach: number = tile.data.get("msAfterApproach");
			const previewBeforeAppear: number =
				tile.data.get("previewBeforeAppear") ?? 0;

			const timeSinceApproach = this.time.now - this.enteredRoomAt;
			if (timeSinceApproach < msAfterApproach) {
				return;
			}
			if (tile.visible) {
				return;
			}
			tile.setVisible(true);

			console.log("adding tile", tile);
			tile.alpha = 0.4;
			setTimeout(() => {
				tile.alpha = 1;
				tile.data.set("hidden", false);
				tile.body.pushable = false;
				this.physics.add.collider(this.player, tile);
				this.physics.add.collider(this.enemies, tile, (_, enemy) => {
					if (!isDynamicSprite(enemy)) {
						return;
					}
					if (tile.body.velocity.x === 0 && tile.body.velocity.y === 0) {
						return;
					}
					console.log("hit enemy with rock");
					this.sendHitToEnemy(enemy);
				});
				this.physics.add.collider(this.stuffLayer, tile);
				// Allow destroying rocks by pushing into walls so you can't block
				// yourself in a room.
				this.physics.add.collider(this.landLayer, tile, () => {
					console.log("hit wall with rock");
					this.destroyCreatedTile(tile);
				});
				this.physics.add.collider(this.createdDoors, tile, () => {
					console.log("hit wall with rock");
					this.destroyCreatedTile(tile);
				});

				if (this.physics.overlap(this.player, tile)) {
					console.log("hit player with tile");
					this.enemyHitPlayer();
				}

				this.createdTiles.push(tile);
			}, previewBeforeAppear);
		});
	}

	hideHiddenItems() {
		this.createdItems.forEach((item) => {
			if (item.data.get("hidden")) {
				item.setVisible(false);
				item.setActive(false);
			}
		});
	}

	showHiddenItem(name: string) {
		this.createdItems.forEach((item) => {
			if (item.name === name) {
				if (item.data.get("hidden")) {
					item.data.set("hidden", false);
					item.setVisible(true);
					item.setActive(true);
				}
			}
		});
	}

	hideAllTransientTiles() {
		this.createdTiles.forEach((item) => {
			item.setVisible(false);
			item.data.set("hidden", true);
		});
	}

	maybeChangeRoom() {
		const touchingDoor = getItemTouchingPlayer(this.createdDoors, this.player);
		if (touchingDoor) {
			this.handleCollideDoor(touchingDoor);
		}
	}

	maybePickUpItem() {
		const touchingItem = getItemTouchingPlayer(this.createdItems, this.player);
		if (touchingItem && touchingItem.active) {
			console.log("touched item", touchingItem);
			switch (touchingItem.name) {
				case "Sword":
					this.pickUpSword();
					break;
				case "WindCard":
					this.pickUpWindCard();
					break;
				case "Heart":
					this.pickUpHeart();
					break;
				default:
					return;
			}
			this.removeItem(touchingItem);
		}
	}

	removeItem(itemToRemove: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		this.createdItems = this.createdItems.filter(
			(item) => item !== itemToRemove
		);
		itemToRemove.destroy();
	}

	pickUpHeart() {
		this.playerTotalHitPoints += 1;
		MainEvents.emit("setTotalHearts", this.playerTotalHitPoints);
		this.playerHitPoints += 1;
		MainEvents.emit("setActiveHearts", this.playerHitPoints);
	}

	pickUpWindCard() {
		this.equipWindCard();
		this.player.anims.play("character-down-walk", true);
		this.player.setFrame(this.showPowerFrame);
		this.registry.set("freezePlayer", true);
		setTimeout(() => {
			this.registry.set("freezePlayer", false);
			this.setFloorText("Press SHIFT");
		}, this.gotItemFreeze);
	}

	pickUpSword() {
		this.equipSword();
		this.player.anims.play("character-down-walk", true);
		this.player.setFrame(this.showSwordFrame);
		this.registry.set("freezePlayer", true);
		setTimeout(() => {
			this.registry.set("freezePlayer", false);
			this.setFloorText("Press SPACE");
		}, this.gotItemFreeze);
	}

	clearFloorText() {
		this.floorText?.destroy();
	}

	setFloorText(text: string) {
		if (
			this.activeRoom?.x === undefined ||
			this.activeRoom?.y === undefined ||
			!this.activeRoom.height ||
			!this.activeRoom.width
		) {
			console.log(this.activeRoom);
			throw new Error("Room has no dimensions when setting text");
		}
		this.floorText = this.add
			.text(
				this.activeRoom.x + this.activeRoom.width / 2,
				this.activeRoom.y + this.activeRoom.height / 2,
				text,
				{}
			)
			.setOrigin(0.5, 0.5)
			.setFontSize(10)
			.setFontStyle("bold")
			.setFontFamily("Arial")
			.setBackgroundColor("#000");
	}

	movePlayerToPoint(x: number, y: number) {
		this.player.setPosition(x, y);
	}

	getPlayerSpeed(): number {
		return this.characterSpeed;
	}

	updateSwordHitboxForAttack() {
		// Add hitbox for sword in direction of sprite
		const swordWidth = 18; // for down/up
		const swordHeight = 12; // for down/up
		const width = (() => {
			if (
				this.playerDirection === SpriteLeft ||
				this.playerDirection === SpriteRight
			) {
				return swordHeight;
			}
			return swordWidth;
		})();
		const height = (() => {
			if (
				this.playerDirection === SpriteUp ||
				this.playerDirection === SpriteDown
			) {
				return swordHeight;
			}
			return swordWidth;
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

	// This will be true once the player starts their attack flow. However, there
	// are frames of the attack where the sword does not threaten anyone. To know
	// if the sword is active, use `isPlayerSwordActive()` instead.
	isPlayerAttacking() {
		return (
			this.framesSinceAttack > 0 &&
			this.player.anims.getName().includes("attack")
		);
	}

	isPlayerSwordActive() {
		return this.isPlayerAttacking() && this.player.anims.hasStarted;
	}

	updateSwordHitbox() {
		this.sword.body.debugShowBody = false;
		this.sword.body.setVelocity(0);
		this.updateSwordHitboxForAttack();
		if (this.isPlayerSwordActive()) {
			this.sword.body.debugShowBody = true;
			return;
		}
		if (this.isPlayerUsingPower()) {
			this.updateSwordHitboxForPower();
			this.sword.body.debugShowBody = true;
			return;
		}
	}

	createOverlay() {
		this.scene.launch("Overlay");
		MainEvents.emit("setTotalHearts", this.playerHitPoints);
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
		this.enemies = this.physics.add.group();

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

		this.spawnPoints =
			// FIXME: just make a whole layer for monsters
			this.map.filterObjects("MetaObjects", (obj) => {
				if (!isTilemapTile(obj)) {
					return false;
				}
				const isMonster = obj.properties?.find(
					(prop: { name: string }) => prop.name === "isMonster"
				)?.value;
				return isMonster === true;
			}) ?? [];
	}

	createEnemiesInRoom() {
		this.spawnPoints.forEach((point) => {
			if (point.x === undefined || point.y === undefined || !this.activeRoom) {
				return;
			}
			const isEnemyInRoom = isPointInRoom(point.x, point.y, this.activeRoom);
			if (!isEnemyInRoom) {
				return;
			}

			console.log("creating monster at", point.x, point.y);
			const isBoss = point.properties.find(
				(prop: { name: string }) => prop.name === "isBoss"
			);
			if (isBoss) {
				this.createBoss(point.x, point.y);
			} else {
				this.createEnemy(point.x, point.y);
			}

			this.spawnPoints = this.spawnPoints.filter((pointB) => pointB !== point);
		});

		// It seems that we may need to do this again when enemies changes?
		this.setTileLayerCollisions(this.createdDoors, this.enemies);
	}

	createEnemy(x: number, y: number) {
		new MonsterA(this, x, y, (enemy) => {
			this.enemies.add(enemy);
		});
	}

	createBoss(x: number, y: number) {
		const boss = new BossA(this, x, y, (enemy) => {
			this.enemies.add(enemy);
		});
		boss.once(Phaser.GameObjects.Events.DESTROY, () => {
			this.showHiddenItem("WindCard");
		});
	}

	playerHitEnemy(
		enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	): void {
		// If the player is not in the attack animation, do nothing. Also do
		// nothing if the player is in the warmup for the attack or the cooldown.
		if (!this.isPlayerSwordActive()) {
			return;
		}

		this.sendHitToEnemy(enemy);
	}

	sendHitToEnemy(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		if (enemy.data.get("hittable") === true) {
			this.knockBack(this.player.body, this.postHitEnemyKnockback);
			this.cameras.main.shake(200, 0.004);
			enemy.emit("hit");
		} else {
			console.log("enemy not hittable", enemy, enemy.data.get("hittable"));
		}
	}

	gameOver() {
		console.log("game over!");
		this.cameras.main.fadeOut(1000, 0, 0, 0, (_: unknown, progress: number) => {
			if (progress === 1) {
				this.scene.pause();
				this.scene.launch("GameOver");
			}
		});
	}

	enemyHitPlayer(): void {
		if (this.framesSincePlayerHit > 0) {
			return;
		}
		console.log("player got hit!");

		this.enemyCollider.active = false;
		this.cameras.main.shake(300, 0.008);
		this.player.tint = 0xff0000;
		this.playerHitPoints -= 1;
		MainEvents.emit("setActiveHearts", this.playerHitPoints);

		if (this.playerHitPoints <= 0) {
			this.gameOver();
			return;
		}

		setTimeout(() => {
			this.player.clearTint();
			this.framesSincePlayerHit = 0;
			this.enemyCollider.active = true;
		}, this.postHitInvincibilityTime);

		this.knockBack(this.player.body, this.postHitPlayerKnockback);

		this.framesSincePlayerHit = 200;
	}

	knockBack(body: Phaser.Physics.Arcade.Body, time: number) {
		const direction = this.playerDirection;
		const bounceSpeed = this.getPlayerSpeed() * 2;
		this.isPlayerBeingKnockedBack = true;

		setTimeout(() => {
			body.setVelocityX(0);
			body.setVelocityY(0);
			this.isPlayerBeingKnockedBack = false;
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
			this.doesPlayerHaveSword() &&
			!this.isPlayerFrozen() &&
			this.framesSinceAttack === 0 &&
			this.getTimeSinceLastAttack() > this.postAttackCooldown &&
			this.framesSincePower === 0
		);
	}

	equipSword(): void {
		this.registry.set("hasSword", true);
	}

	equipWindCard(): void {
		this.registry.set("hasWindCard", true);
	}

	canPlayerUsePower(): boolean {
		return this.canPlayerAttack() && this.doesPlayerHavePower();
	}

	doesPlayerHavePower(): boolean {
		return this.registry.get("hasWindCard") === true;
	}

	doesPlayerHaveSword(): boolean {
		return this.registry.get("hasSword") === true;
	}

	isPlayerFrozen(): boolean {
		return this.registry.get("freezePlayer") === true;
	}

	isPlayerBeingHit(): boolean {
		return this.framesSincePlayerHit > 0;
	}

	updatePlayerBeingHit(): void {
		this.framesSincePlayerHit -= 1;
		this.player.setVisible(this.framesSincePlayerHit % 2 === 0 ? true : false);
	}

	updatePlayerAttackAnimation() {
		if (this.isPlayerAttacking()) {
			this.framesSinceAttack -= 1;
			if (this.framesSinceAttack === 0) {
				this.lastAttackedAt = this.time.now;
			}
		}

		// If the animation hasn't started, start it.
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
		}

		// If the animation completes, stop the attack.
		if (this.isPlayerAttacking() && this.player.anims.getProgress() === 1) {
			this.framesSinceAttack = 0;
			this.lastAttackedAt = this.time.now;
		}
	}

	isPlayerUsingPower(): boolean {
		return this.framesSincePower > 0;
	}

	updatePlayerPowerAnimation(): void {
		if (this.isPlayerUsingPower()) {
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
		}
	}

	updatePlayerMovement(): void {
		if (
			this.isPlayerAttacking() ||
			this.isPlayerUsingPower() ||
			this.isPlayerBeingKnockedBack
		) {
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
		} else if (this.cursors.right.isDown) {
			this.player.anims.play("character-right-walk", true);
			this.playerDirection = SpriteRight;
		} else if (this.cursors.down.isDown) {
			this.player.anims.play("character-down-walk", true);
			this.playerDirection = SpriteDown;
		} else if (this.cursors.up.isDown) {
			this.player.anims.play("character-up-walk", true);
			this.playerDirection = SpriteUp;
		} else {
			this.setPlayerIdleFrame();
		}

		const isMoving =
			this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0;
		if (isMoving) {
			this.maybeChangeRoom();
			this.maybePickUpItem();
		}
	}

	updatePlayer(): void {
		this.data.set(
			"playerPosition",
			new Phaser.Math.Vector2(this.player.x, this.player.y)
		);
		this.updateSwordHitbox();

		if (this.isPlayerBeingHit()) {
			this.updatePlayerBeingHit();
		} else {
			this.player.setVisible(true);
		}

		if (this.isPlayerFrozen()) {
			this.player.stop();
			this.player.body.setVelocity(0);
			console.log("player frozen");
			return;
		}

		if (this.playerHitPoints <= 0) {
			this.player.stop();
			this.player.body.setVelocity(0);
			this.enemyCollider.active = false;
			return;
		}

		this.updatePlayerAttackAnimation();

		this.updatePlayerPowerAnimation();

		this.updatePlayerMovement();
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
