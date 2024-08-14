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
	isTilemapTile,
	getObjectId,
	getRoomForPoint,
	hideAllRoomsExcept,
	getDoorDestinationCoordinates,
	getItemTouchingPlayer,
	getItemsInRoom,
	createVelocityForDirection,
	isPointInRoom,
	invertSpriteDirection,
} from "../shared";

export class Game extends Scene {
	cursors: Phaser.Types.Input.Keyboard.CursorKeys;
	debugGraphic: Phaser.GameObjects.Graphics | undefined;
	player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	sword: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	attackSprite: Phaser.GameObjects.Sprite;
	enemies: Phaser.Physics.Arcade.Group;
	enemyCollider: Phaser.Physics.Arcade.Collider;
	floorText: Phaser.GameObjects.Text | undefined;

	framesSincePlayerHit: number = 0;
	lastAttackedAt: number = 0;
	framesSincePower: number = 0;
	playerDirection: SpriteDirection = SpriteDown;
	enteredRoomAt: number = 0;
	isPlayerBeingKnockedBack: boolean = false;
	playerTotalHitPoints: number = 4;
	playerHitPoints: number = 4;

	// Config
	characterSpeed: number = 90;
	postAttackCooldown: number = 150;
	postHitPlayerKnockback: number = 120;
	postHitEnemyKnockback: number = 50;
	postHitInvincibilityTime: number = 600;
	attackFrameRate: number = 35;
	attackDelay: number = 8;
	gotItemFreeze: number = 1500;
	windCardPushSpeed: number = 100;
	windCardPushTime: number = 100;
	knockBackSpeed: number = 180;
	distanceToActivateTransient: number = 30;

	map: Phaser.Tilemaps.Tilemap;
	landLayer: Phaser.Tilemaps.TilemapLayer;
	stuffLayer: Phaser.Tilemaps.TilemapLayer;
	activeRoom: Phaser.Types.Tilemaps.TiledObject | undefined;
	createdDoors: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	createdSavePoints: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
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
		this.attackSprite = this.add.sprite(
			this.player.x,
			this.player.y,
			"character-attack-up",
			0
		);
		this.attackSprite.setDepth(4);
		this.attackSprite.setVisible(false);

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
		this.createSavePoints();

		// Enemies collide with doors but players can pass through them.
		this.setTileLayerCollisions(this.createdDoors, this.enemies);

		let isSaving = false;
		this.physics.add.collider(
			this.player,
			this.createdSavePoints,
			(_, savePoint) => {
				if (!isDynamicSprite(savePoint)) {
					return;
				}
				if (isSaving) {
					return;
				}

				isSaving = true;
				this.turnOffAllLanterns();
				const effect = this.add.sprite(
					savePoint.x,
					savePoint.y,
					"light-lantern",
					0
				);
				effect.anims.play("light-lantern", true);
				savePoint.setTexture("dungeon_tiles_sprites", 1323);
				effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
					isSaving = false;
					effect.destroy();
				});
				this.saveGame();
			}
		);

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
					return enemy.visible && !enemy.data?.get("stunned");
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
		this.input.keyboard.on("keydown-S", () => {
			this.saveGame();
		});
		this.input.keyboard.on("keydown-L", () => {
			this.loadLastSave();
		});
		this.input.keyboard.on("keydown-SPACE", () => {
			// Attack
			if (this.canPlayerAttack()) {
				this.activateAttack();
			}
		});
		this.input.keyboard.on("keydown-SHIFT", () => {
			// Power
			if (this.canPlayerUsePower()) {
				this.activatePower();
			}
		});

		this.setUpCamera();

		this.hideAllTransientTiles();
		this.hideHiddenItems();

		this.createOverlay();

		MainEvents.on("freezePlayer", (setting: boolean) =>
			this.setPlayerFrozen(setting)
		);
	}

	setPlayerFrozen(setting: boolean) {
		this.registry.set("freezePlayer", setting);
	}

	turnOffAllLanterns() {
		this.createdSavePoints.forEach((savePoint) => {
			savePoint.setTexture("dungeon_tiles_sprites", 1322);
		});
	}

	activateAttack() {
		console.log("attack beginning");
		this.player.body.setVelocity(0);
		this.updateSwordHitbox();

		this.sword.setRotation(Phaser.Math.DegToRad(0));

		// If the animation hasn't started, start it.
		// Do not move the player hitbox when attacking; since it changes size it
		// causes accidental hits as it wiggles around. Instead we use a separate
		// sprite for the attack animation and leave the player and its hitbox
		// alone.
		this.attackSprite.setVisible(true);
		this.attackSprite.setPosition(this.player.x, this.player.y);
		this.player.setVisible(false);
		switch (this.playerDirection) {
			case SpriteUp:
				this.attackSprite.play("character-up-attack", true);
				break;
			case SpriteRight:
				this.attackSprite.play("character-right-attack", true);
				break;
			case SpriteDown:
				this.attackSprite.play("character-down-attack", true);
				break;
			case SpriteLeft:
				this.attackSprite.play("character-left-attack", true);
				break;
		}

		this.attackSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			console.log("attack complete");
			this.attackSprite.setVisible(false);
			this.player.setVisible(true);
			this.lastAttackedAt = this.time.now;
		});
	}

	activatePower() {
		this.player.body.setVelocity(0);
		// This number is not important; the attack time is dictated by the
		// animation. This is just used to count how long it goes for.
		this.framesSincePower = 400;
		this.updateSwordHitbox();
	}

	loadLastSave() {
		// FIXME: Clean up old stuff first
		// this.scene.restart();
		// FIXME: reset level otherwise like enemy positions etc, but not picked-up items
		const rawSaveData = localStorage.getItem("lost-card-save");
		if (!rawSaveData) {
			console.log("no save data");
			return;
		}
		const saveData = JSON.parse(rawSaveData);
		if (saveData?.playerX === undefined || saveData.playerY === undefined) {
			console.log("no save point found for save data");
			return;
		}
		if (saveData.hasSword) {
			this.equipSword();
		}
		if (saveData.hasWindCard) {
			this.equipWindCard();
		}
		this.movePlayerToPoint(saveData.playerX, saveData.playerY);
	}

	saveGame() {
		localStorage.setItem("lost-card-save", JSON.stringify(this.getSaveData()));
		console.log("game saved");
	}

	getSaveData() {
		return {
			playerX: this.player.x,
			playerY: this.player.y,
			...this.registry.getAll(),
		};
	}

	createSavePoints() {
		this.createdSavePoints = this.map
			.createFromObjects("SavePoints", {})
			.map((item) => this.physics.world.enableBody(item))
			.map((item) => item.setDataEnabled())
			.filter(isDynamicSprite)
			.map((item) => {
				item.body.pushable = false;
				return item;
			});
	}

	createDoors() {
		this.createdDoors = this.map
			.createFromObjects("Doors", [{ name: "Door" }])
			.map((item) => this.physics.world.enableBody(item))
			.map((item) => item.setDataEnabled())
			.filter(isDynamicSprite)
			.map((item) => {
				item.body.pushable = false;
				item.body.setSize(item.body.width + 1, item.body.height + 1);
				return item;
			});
	}

	createAppearingTiles() {
		this.createdTiles = this.map
			.createFromObjects("Transients", [{}])
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
			[
				...this.createdItems,
				...this.createdTiles,
				...this.createdDoors,
				...this.createdSavePoints,
			],
			room
		);

		this.createEnemiesInRoom();
	}

	handleCollideDoor(door: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		const destinationId = door.data.get("doorto");
		if (!destinationId) {
			throw new Error("Hit door without destination id");
		}

		const destinationDirection = door.data.get("doordirection");
		if (destinationDirection === undefined) {
			throw new Error("Door has no destination direction");
		}
		console.log("moving through door in direction", destinationDirection);

		if (this.playerDirection !== destinationDirection) {
			console.log("hit door in wrong direction");
			return;
		}

		const destinationTile = this.map.findObject(
			"Doors",
			(obj: unknown) => getObjectId(obj) === destinationId
		);
		if (!destinationTile) {
			throw new Error("Hit door without destination tile");
		}
		console.log("moving to tile", destinationTile, "through door", door);

		// if the player enters a door, teleport them just past the corresponding door
		const [destinationX, destinationY] = getDoorDestinationCoordinates(
			destinationTile,
			destinationDirection
		);
		console.log("moving player to point", destinationX, destinationY);
		this.movePlayerToPoint(destinationX, destinationY);
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

		tile.setOrigin(0.6, 0.5);
		tile.anims.play("explode", true);
		tile.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.createdTiles = this.createdTiles.filter((tileA) => tileA !== tile);
			this.stuffLayer.removeTileAtWorldXY(tile.x, tile.y);
			tile.destroy();
		});
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
				if (tile.data.get("beingPushed")) {
					return;
				}
				tile.data.set("beingPushed", true);
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
						console.log("hit item complete");
						tile.body.setVelocity(0, 0);
						tile.data.set("beingPushed", false);
					}
				}, this.windCardPushTime);
			}
		});
	}

	updateAppearingTiles() {
		const transientTiles = this.activeRoom
			? getItemsInRoom(this.createdTiles, this.activeRoom)
			: [];

		// Don't consider tiles which are already visible.
		const appearingTiles = transientTiles.filter(
			(tile) => tile.visible === false
		);

		appearingTiles.forEach((tile) => {
			const msAfterApproach: number = tile.data.get("msAfterApproach") ?? 0;
			let firstApproachedTime: number =
				tile.data.get("firstApproachedTime") ?? 0;

			// If the tile has no msAfterApproach, then it should appear immediately.
			if (msAfterApproach < 100) {
				this.showTransientTile(tile);
				return;
			}

			const tilePosition = new Phaser.Math.Vector2(tile.body.x, tile.body.y);
			const playerPosition: Phaser.Math.Vector2 =
				this.data.get("playerPosition");
			const distanceToActivate: number =
				this.data.get("distanceToActivate") ?? this.distanceToActivateTransient;

			// If you haven't gotten close to the tile, do nothing.
			if (tilePosition.distance(playerPosition) > distanceToActivate) {
				return;
			}

			// Record the time when you get close to it.
			if (!firstApproachedTime) {
				firstApproachedTime = this.time.now;
				tile.data.set("firstApproachedTime", firstApproachedTime);
			}

			// If the time since you've gotten close is greater than the time it
			// should appear, make it appear.
			const timeSinceApproach = this.time.now - firstApproachedTime;
			if (timeSinceApproach < msAfterApproach) {
				return;
			}
			this.showTransientTile(tile);
		});
	}

	showTransientTile(tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		const previewBeforeAppear: number =
			tile.data.get("previewBeforeAppear") ?? 0;
		tile.setVisible(true);
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
			this.physics.add.collider(this.landLayer, tile, (collideTile) => {
				if (!isDynamicSprite(collideTile)) {
					return;
				}
				if (collideTile.data.get("beingPushed")) {
					console.log("hit wall with rock");
					this.destroyCreatedTile(tile);
				}
			});
			this.physics.add.collider(this.createdDoors, tile, (_, collideTile) => {
				if (!isDynamicSprite(collideTile)) {
					return;
				}
				if (collideTile.data.get("beingPushed")) {
					console.log("hit door with rock");
					this.destroyCreatedTile(tile);
				}
			});

			if (this.physics.overlap(this.player, tile)) {
				console.log("hit player with tile");
				this.enemyHitPlayer();
			}

			this.createdTiles.push(tile);
		}, previewBeforeAppear);
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

		// Face right
		this.playerDirection = SpriteRight;
		this.setPlayerIdleFrame();

		// Play power animation
		this.updateSwordHitboxForPower();
		this.sword.setRotation(Phaser.Math.DegToRad(0));
		this.sword.anims.play("character-right-power", true);

		this.setPlayerFrozen(true);
		setTimeout(() => {
			this.setPlayerFrozen(false);
			// FIXME: replace this with sprite font
			this.setFloorText("Press SHIFT");
		}, this.gotItemFreeze);
	}

	pickUpSword() {
		this.equipSword();
		this.player.anims.play("character-down-attack", true);
		this.setPlayerFrozen(true);
		setTimeout(() => {
			this.setPlayerFrozen(false);
			// FIXME: replace this with sprite font
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

		// if the player enters a door, move the camera to that room
		const room = getRoomForPoint(this.map, this.player.x, this.player.y);
		if (room !== this.activeRoom) {
			console.log("moving camera to room", room);
			this.moveCameraToRoom(room);
		}
	}

	getPlayerSpeed(): number {
		return this.characterSpeed;
	}

	updateSwordHitboxForAttack() {
		// Add hitbox for sword in direction of sprite
		const swordWidth = 34; // for down/up
		const swordHeight = 20; // for down/up
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
		this.sword.x = this.player.body.center.x + xOffset;
		this.sword.y = this.player.body.center.y + yOffset;
	}

	getPowerOffset() {
		const xOffset = (() => {
			if (this.playerDirection === SpriteLeft) {
				return -18;
			}
			if (this.playerDirection === SpriteRight) {
				return 18;
			}
			return 0;
		})();
		const yOffset = (() => {
			if (this.playerDirection === SpriteUp) {
				return -18;
			}
			if (this.playerDirection === SpriteDown) {
				return 18;
			}
			return 0;
		})();
		return [xOffset, yOffset];
	}

	getSwordOffset() {
		const xOffset = (() => {
			if (this.playerDirection === SpriteLeft) {
				return -this.player.body.height;
			}
			if (this.playerDirection === SpriteRight) {
				return this.player.body.height;
			}
			return 0;
		})();
		const yOffset = (() => {
			if (this.playerDirection === SpriteUp) {
				return -this.player.body.height;
			}
			if (this.playerDirection === SpriteDown) {
				return this.player.body.height;
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
				return 20;
			}
			return 10;
		})();
		const height = (() => {
			if (
				this.playerDirection === SpriteUp ||
				this.playerDirection === SpriteDown
			) {
				return 20;
			}
			return 10;
		})();

		this.sword.body.setSize(width, height);
		const [xOffset, yOffset] = this.getPowerOffset();

		this.sword.x = this.player.x + xOffset;
		this.sword.y = this.player.y + yOffset;
	}

	// This will be true once the player starts their attack flow. However, there
	// are frames of the attack where the sword does not threaten anyone. To know
	// if the sword is active, use `isPlayerSwordActive()` instead.
	isPlayerAttacking() {
		return (
			this.attackSprite?.anims.getName().includes("attack") &&
			this.attackSprite.visible === true
		);
	}

	// Similar to `isPlayerAttacking()` but that is true any time the attack flow
	// animation has started and does not consider the warmup part of the
	// animation. This function will return true only when the sword is
	// threatening damage.
	isPlayerSwordActive() {
		return this.isPlayerAttacking() && this.attackSprite.anims.hasStarted;
	}

	updateSwordHitbox() {
		this.sword.body.debugShowBody = false;
		this.sword.body.setVelocity(0);

		// We update the sword hitbox on every frame even when not in use to make
		// sure it stays in position relative to the player; otherwise the hitbox
		// appears briefly at its old location.
		if (!this.isPlayerSwordActive() && !this.isPlayerUsingPower()) {
			this.sword.setVisible(false);
			this.updateSwordHitboxForAttack();
			return;
		}

		if (this.isPlayerSwordActive()) {
			this.updateSwordHitboxForAttack();
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
			"character-idle-down",
			0
		);
		this.player.setDebugBodyColor(0x00ff00);
		this.player.setDisplaySize(13, 24);
		this.player.setSize(8, 14);
		this.player.setDepth(1);
		this.sword = this.physics.add.sprite(
			this.player.x,
			this.player.y,
			"character-power-right",
			4
		);
		this.sword.setDebugBodyColor(0x00fff0);
		this.sword.setDepth(4);
		this.updateSwordHitbox();

		const anims = this.anims;
		anims.create({
			key: "explode",
			frames: anims.generateFrameNumbers("monster_explode1"),
			frameRate: 20,
		});
		anims.create({
			key: "light-lantern",
			frames: anims.generateFrameNumbers("light-lantern"),
			frameRate: 24,
		});

		anims.create({
			key: "character-idle-down",
			frames: anims.generateFrameNumbers("character-idle-down"),
			frameRate: 7,
			repeat: -1,
		});
		anims.create({
			key: "character-idle-up",
			frames: anims.generateFrameNumbers("character-idle-up"),
			frameRate: 7,
			repeat: -1,
		});
		anims.create({
			key: "character-idle-right",
			frames: anims.generateFrameNumbers("character-idle-right"),
			frameRate: 7,
			repeat: -1,
		});
		anims.create({
			key: "character-idle-left",
			frames: anims.generateFrameNumbers("character-idle-left"),
			frameRate: 7,
			repeat: -1,
		});

		anims.create({
			key: "character-down-walk",
			frames: anims.generateFrameNumbers("character-run-down"),
			frameRate: 14,
			repeat: -1,
		});
		anims.create({
			key: "character-right-walk",
			frames: anims.generateFrameNumbers("character-run-right", {
				start: 7,
				end: 0,
			}),
			frameRate: 14,
			repeat: -1,
		});
		anims.create({
			key: "character-up-walk",
			frames: anims.generateFrameNumbers("character-run-up"),
			frameRate: 14,
			repeat: -1,
		});
		anims.create({
			key: "character-left-walk",
			frames: anims.generateFrameNumbers("character-run-left"),
			frameRate: 14,
			repeat: -1,
		});

		anims.create({
			key: "character-down-attack",
			frames: anims.generateFrameNumbers("character-attack-down"),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "character-right-attack",
			frames: anims.generateFrameNumbers("character-attack-right"),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "character-up-attack",
			frames: anims.generateFrameNumbers("character-attack-up"),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "character-left-attack",
			frames: anims.generateFrameNumbers("character-attack-left"),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});

		anims.create({
			key: "character-right-power",
			frames: anims.generateFrameNumbers("character-power-right"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
		});
		anims.create({
			key: "character-left-power",
			frames: anims.generateFrameNumbers("character-power-left", {
				frames: [5, 4, 3, 2, 1, 0, 11, 10, 9, 8, 7, 6],
			}),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
		});
		this.player.setCollideWorldBounds(true);
	}

	createEnemies(): void {
		this.enemies = this.physics.add.group();

		this.spawnPoints =
			this.map.filterObjects("Creatures", (obj) => {
				if (!isTilemapTile(obj)) {
					return false;
				}
				return true;
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
		if (this.isPlayerSwordActive()) {
			this.sendHitToEnemy(enemy);
		}
		if (this.isPlayerUsingPower()) {
			this.pushEnemy(enemy);
		}
	}

	pushEnemy(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		if (enemy.data.get("hittable") === true) {
			enemy.data.set("stunned", true);
			this.knockBack(
				enemy.body,
				this.windCardPushTime,
				this.playerDirection,
				() => {
					// Enemy might be gone before stun ends
					enemy?.data?.set("stunned", false);
				}
			);
		}
	}

	sendHitToEnemy(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		if (enemy.data.get("hittable") === true) {
			this.cameras.main.shake(200, 0.004);
			enemy.emit("hit");

			// Knock the player back a bit when they hit an enemy.
			this.knockBack(
				this.player.body,
				this.postHitEnemyKnockback,
				invertSpriteDirection(this.playerDirection),
				() => {}
			);
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

		this.isPlayerBeingKnockedBack = true;
		this.knockBack(
			this.player.body,
			this.postHitPlayerKnockback,
			invertSpriteDirection(this.playerDirection),
			() => {
				this.isPlayerBeingKnockedBack = false;
			}
		);

		this.framesSincePlayerHit = 200;
	}

	knockBack(
		body: Phaser.Physics.Arcade.Body,
		time: number,
		direction: SpriteDirection,
		completeCallback: () => void
	) {
		const bounceSpeed = this.knockBackSpeed;

		setTimeout(() => {
			body.setVelocityX(0);
			body.setVelocityY(0);
			completeCallback();
		}, time);

		body.setVelocityX(0);
		body.setVelocityY(0);
		switch (direction) {
			case SpriteUp:
				body.setVelocityY(-bounceSpeed);
				break;
			case SpriteRight:
				body.setVelocityX(bounceSpeed);
				break;
			case SpriteDown:
				body.setVelocityY(bounceSpeed);
				break;
			case SpriteLeft:
				body.setVelocityX(-bounceSpeed);
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
			!this.isPlayerAttacking() &&
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
		return (
			this.doesPlayerHavePower() &&
			!this.isPlayerFrozen() &&
			!this.isPlayerAttacking() &&
			this.getTimeSinceLastAttack() > this.postAttackCooldown &&
			this.framesSincePower === 0
		);
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
		// FIXME this needs to end on visible
		// this.player.setVisible(this.framesSincePlayerHit % 2 === 0 ? true : false);
	}

	isPlayerUsingPower(): boolean {
		return this.framesSincePower > 0;
	}

	updatePlayerPowerAnimation(): void {
		if (this.isPlayerUsingPower()) {
			this.framesSincePower -= 1;
			switch (this.playerDirection) {
				case SpriteUp:
					// We just rotate the sideways powers for up/down
					this.sword.setRotation(Phaser.Math.DegToRad(90));
					this.sword.anims.play("character-left-power", true);
					break;
				case SpriteRight:
					this.sword.setRotation(Phaser.Math.DegToRad(0));
					this.sword.anims.play("character-right-power", true);
					break;
				case SpriteDown:
					// We just rotate the sideways powers for up/down
					this.sword.setRotation(Phaser.Math.DegToRad(90));
					this.sword.anims.play("character-right-power", true);
					break;
				case SpriteLeft:
					this.sword.setRotation(Phaser.Math.DegToRad(0));
					this.sword.anims.play("character-left-power", true);
					break;
			}

			// If the animation completes, stop the attack.
			if (this.sword.anims.getProgress() === 1) {
				this.framesSincePower = 0;
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

		if (this.isPlayerBeingHit()) {
			this.updatePlayerBeingHit();
		}

		if (this.isPlayerFrozen()) {
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

		this.updateSwordHitbox();
		this.updatePlayerPowerAnimation();
		this.updatePlayerMovement();
	}

	setPlayerIdleFrame() {
		// If the player stops moving, stop animations and reset the image to an idle frame in the correct direction.
		switch (this.playerDirection) {
			case SpriteLeft:
				this.player.anims.play("character-idle-left", true);
				return;
			case SpriteRight:
				this.player.anims.play("character-idle-right", true);
				return;
			case SpriteUp:
				this.player.anims.play("character-idle-up", true);
				return;
			case SpriteDown:
				this.player.anims.play("character-idle-down", true);
				return;
		}
	}
}
