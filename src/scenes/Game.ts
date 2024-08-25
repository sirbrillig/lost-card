import { Scene } from "phaser";
import { MainEvents } from "../MainEvents";
import { EnemyManager } from "../EnemyManager";
import { MountainMonster } from "../MountainMonster";
import { Ghost } from "../Ghost";
import { Skeleton } from "../Skeleton";
import { CloudGoblin } from "../CloudGoblin";
import { SkyBlob } from "../SkyBlob";
import { PlantBug } from "../PlantBug";
import { IceMonster } from "../IceMonster";
import { FireMonster } from "../FireMonster";
import { FireSpout } from "../FireSpout";
import { WaterDipper } from "../WaterDipper";
import { GreatGhost } from "../GreatGhost";
import { MountainBoss } from "../MountainBoss";
import { PlantSpitter } from "../PlantSpitter";
import { IceBoss } from "../IceBoss";
import { PlantBoss } from "../PlantBoss";
import { SpiritBoss } from "../SpiritBoss";
import { CloudBoss } from "../CloudBoss";
import { FireBoss } from "../FireBoss";
import {
	Powers,
	Events,
	DataKeys,
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
	hasId,
	createSpritesFromObjectLayer,
	loadSavedData,
	loadSavedRegistry,
	SaveData,
	isEnemy,
	isTileWithPropertiesObject,
	getPowerEquippedKey,
	getRegionFromRoomName,
	getRegionName,
} from "../shared";

type Sound =
	| Phaser.Sound.NoAudioSound
	| Phaser.Sound.HTML5AudioSound
	| Phaser.Sound.WebAudioSound;

export class Game extends Scene {
	debugGraphic: Phaser.GameObjects.Graphics | undefined;
	layerDebugGraphic: Phaser.GameObjects.Graphics | undefined;
	player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	sword: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	power: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	attackSprite: Phaser.GameObjects.Sprite;
	enemyManager: EnemyManager;
	enemyCollider: Phaser.Physics.Arcade.Collider;
	isGameOver: boolean = false;

	attackSound: Sound;
	destroySound: Sound;
	hitSound: Sound;
	walkSound: Sound;
	healSound: Sound;
	windSound: Sound;
	iceSound: Sound;
	rockDestroySound: Sound;
	freezeSound: Sound;
	plantSound: Sound;

	lastAttackedAt: number = 0;
	lastPowerAt: number = 0;
	lastDialogData: { heading: string; text?: string } | undefined;
	playerDirection: SpriteDirection = SpriteDown;
	enteredRoomAt: number = 0;
	isPlayerBeingKnockedBack: boolean = false;

	keyLeft: Phaser.Input.Keyboard.Key;
	keyDown: Phaser.Input.Keyboard.Key;
	keyRight: Phaser.Input.Keyboard.Key;
	keyUp: Phaser.Input.Keyboard.Key;

	keyA: Phaser.Input.Keyboard.Key;
	keyS: Phaser.Input.Keyboard.Key;
	keyD: Phaser.Input.Keyboard.Key;
	keyW: Phaser.Input.Keyboard.Key;

	keyR: Phaser.Input.Keyboard.Key;
	keyP: Phaser.Input.Keyboard.Key;

	// Config
	characterSpeed: number = 90;
	cloudCardSpeed: number = 450;
	postAttackCooldown: number = 150;
	postPowerCooldown: number = 600;
	postHitPlayerKnockback: number = 120;
	postHitEnemyKnockback: number = 50;
	postHitInvincibilityTime: number = 800;
	attackFrameRate: number = 35;
	attackDelay: number = 0;
	gotItemFreeze: number = 1000;
	windCardPushSpeed: number = 100;
	windCardPushTime: number = 100;
	enemyKnockbackTime: number = 200;
	enemyKnockBackSpeed: number = 200;
	playerKnockBackSpeed: number = 150;
	distanceToActivateTransient: number = 30;
	playerInitialHitPoints: number = 3;
	saveCooldown: number = 30000;
	preGameOverTime: number = 2500;
	roomTransitionFadeTime: number = 300;
	regionTransitionFadeTime: number = 1000;
	sceneStartFadeTime: number = 1000;
	postAppearInvincibilityTime: number = 1000;
	icePowerVelocity: number = 80;
	iceCardFrozenTime: number = 3000;
	iceMeltTime: number = 4000;
	plantCardVelocity: number = 140;
	firePowerVelocity: number = 120;
	gateCloseSpeed: number = 340;
	newRegionMessageTime: number = 1000;

	map: Phaser.Tilemaps.Tilemap;
	landLayer: Phaser.Tilemaps.TilemapLayer;
	stuffLayer: Phaser.Tilemaps.TilemapLayer;
	createdFinalDoors: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	createdDoors: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	createdSavePoints: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	createdTiles: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	createdItems: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	spawnPoints: Phaser.Types.Tilemaps.TiledObject[] = [];

	constructor() {
		super("Game");
	}

	create(saveData: SaveData | undefined) {
		this.isGameOver = false;
		this.cameras.main.fadeIn(this.sceneStartFadeTime);
		this.map = this.make.tilemap({ key: "map" });
		const tilesetTile = this.map.addTilesetImage(
			"Dungeon_Tiles",
			"dungeon_tiles"
		);
		const tilesetSprite = this.map.addTilesetImage(
			"Dungeon_Tiles_Sprites",
			"dungeon_tiles_sprites"
		);
		if (!tilesetTile || !tilesetSprite) {
			throw new Error("Could not make tileset");
		}

		const spawnPoint = this.getSpawnPoint();
		this.createPlayer(
			saveData?.playerX ?? spawnPoint.x,
			saveData?.playerY ?? spawnPoint.y
		);
		this.attackSprite = this.add.sprite(
			this.player.body.center.x,
			this.player.body.center.y,
			"character",
			"sword-up-0.png"
		);
		this.attackSprite.setDepth(4);
		this.attackSprite.setVisible(false);

		this.enemyManager = new EnemyManager(
			this,
			this.player,
			this.sword,
			this.map
		);
		this.createEnemies();

		this.landLayer = this.createTileLayer("Background", tilesetTile, 0);
		this.physics.add.collider(
			this.landLayer,
			this.player,
			(_, tile) => {
				if (!isTileWithPropertiesObject(tile) || !tile.properties.hurts) {
					return;
				}
				this.enemyHitPlayer();
			},
			(_, tile) => {
				if (
					isTileWithPropertiesObject(tile) &&
					tile.properties.affectedBySpiritCard &&
					this.isPlayerUsingPower() &&
					this.getActivePower() === "SpiritCard"
				) {
					return false;
				}
				if (this.player.data.get("isPlantCardGrappleActive")) {
					return false;
				}
				return true;
			}
		);
		this.physics.add.collider(
			this.landLayer,
			this.enemyManager.enemies,
			undefined,
			(enemy, tile) => {
				if (!isDynamicSprite(enemy)) {
					console.error(enemy);
					throw new Error("Non-sprite ran into something");
				}
				if (!isEnemy(enemy)) {
					throw new Error("Non-enemy ran into something");
				}
				return enemy.doesCollideWithTile(tile);
			}
		);
		this.stuffLayer = this.createTileLayer("Stuff", tilesetTile, 0);
		this.physics.add.collider(this.stuffLayer, this.player, undefined, () => {
			if (this.isPlayerUsingPower() && this.getActivePower() === "SpiritCard") {
				return false;
			}
			return true;
		});
		this.physics.add.collider(
			this.stuffLayer,
			this.enemyManager.enemies,
			undefined,
			(enemy, tile) => {
				if (!isDynamicSprite(enemy)) {
					console.error(enemy);
					throw new Error("Non-sprite ran into something");
				}
				if (!isEnemy(enemy)) {
					throw new Error("Non-enemy ran into something");
				}
				return enemy.doesCollideWithTile(tile);
			}
		);

		this.createDoors();
		this.createFinalDoors();
		this.createAppearingTiles();
		this.createItems();
		this.createSavePoints();

		this.physics.add.collider(
			this.createdFinalDoors,
			this.player,
			this.checkEndGame.bind(this)
		);

		// Enemies collide with doors but players can pass through them.
		this.physics.add.collider(this.createdDoors, this.enemyManager.enemies);

		MainEvents.on(Events.EnemyHitPlayer, () => {
			this.enemyHitPlayer();
		});

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
				const lastSaved = savePoint.data.get("savedAt");
				if (lastSaved && this.time.now - lastSaved < this.saveCooldown) {
					return;
				}

				isSaving = true;
				savePoint.data.set("savedAt", this.time.now);
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
			this.enemyManager.enemies,
			(player, enemy) => {
				if (!isDynamicSprite(player) || !isDynamicSprite(enemy)) {
					return;
				}
				if (enemy.data.get("isPlantCardGrappleActive")) {
					enemy?.emit(Events.MonsterStun, false);
					enemy.data.set("isPlantCardGrappleActive", false);
					this.power.anims.stop();
					this.power.visible = false;
					return;
				}
				this.enemyHitPlayer();
			},
			(_, enemy) => {
				if (!isDynamicSprite(enemy)) {
					return false;
				}
				if (enemy.data.get("isPlantCardGrappleActive")) {
					return true;
				}
				if (
					this.isPlayerUsingPower() &&
					this.getActivePower() === "SpiritCard"
				) {
					return false;
				}
				if (this.isPlayerInvincible()) {
					return false;
				}
				return enemy.visible && !enemy.data?.get("stunned");
			}
		);

		this.physics.add.overlap(
			this.sword,
			this.enemyManager.enemies,
			(_, enemy) => {
				if (!isDynamicSprite(enemy)) {
					throw new Error("Enemy sprite is not valid for hitboxing with sword");
				}
				this.playerHitEnemy(enemy);
			},
			() => {
				return this.sword.data.get(DataKeys.SwordAttackActive);
			}
		);
		this.physics.add.overlap(
			this.power,
			this.enemyManager.enemies,
			(_, enemy) => {
				if (!isDynamicSprite(enemy)) {
					throw new Error("Enemy sprite is not valid for hitboxing with power");
				}
				this.playerHitEnemy(enemy);
			}
		);
		this.physics.add.overlap(this.power, this.landLayer, (_, tile) => {
			if (!isTilemapTile(tile)) {
				return;
			}
			if (!this.isPlayerUsingPower() || this.getActivePower() !== "IceCard") {
				return;
			}
			this.freezeWaterTile(tile);
		});

		this.createInputs();
		this.setUpCamera();

		this.hideAllTransientTiles();
		this.hideHiddenItems();

		this.createOverlay();

		MainEvents.on(Events.StunPlayer, (setting: boolean) =>
			this.setPlayerStunned(setting)
		);

		MainEvents.on(Events.FreezePlayer, (setting: boolean) => {
			this.setPlayerFrozen(setting);
		});
	}

	showDialog(obj: { heading: string; text?: string }) {
		if (this.lastDialogData?.heading === obj.heading) {
			return;
		}
		this.lastDialogData = obj;
		this.scene.launch("Dialog", {
			heading: obj.heading,
			text: obj.text,
		});
	}

	checkEndGame() {
		if (this.getKeyCount() < 6) {
			this.showDialog({
				heading: "Golden door",
				text: "The survivors of the kingdoms are trapped behind this door but it requires six keys to open.",
			});
			return;
		}
		this.showDialog({
			heading: "You win!",
			text: "Congratulations",
		});
		this.setPlayerStunned(true);
	}

	createInputs() {
		if (!this.input.keyboard) {
			throw new Error("No keyboard controls could be found");
		}

		this.keyLeft = this.input.keyboard.addKey(
			Phaser.Input.Keyboard.KeyCodes.LEFT
		);
		this.keyDown = this.input.keyboard.addKey(
			Phaser.Input.Keyboard.KeyCodes.DOWN
		);
		this.keyRight = this.input.keyboard.addKey(
			Phaser.Input.Keyboard.KeyCodes.RIGHT
		);
		this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);

		this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
		this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
		this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
		this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

		this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
		this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

		this.input.keyboard.on("keydown-ONE", () => {
			// Cheat: show hitboxes
			if (this.debugGraphic) {
				this.debugGraphic.destroy();
				this.debugGraphic = undefined;
				this.layerDebugGraphic?.destroy();
				this.layerDebugGraphic = undefined;
			} else {
				this.debugGraphic = this.physics.world.createDebugGraphic();
				this.layerDebugGraphic = this.add.graphics();
				this.landLayer.renderDebug(this.layerDebugGraphic, {
					tileColor: null,
					collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200),
					faceColor: new Phaser.Display.Color(40, 39, 37, 255),
				});
			}
		});
		this.input.keyboard.on("keydown-TWO", () => {
			if (this.getPlayerHitPoints() <= 0) {
				return;
			}
			// Cheat: restore all HP
			this.setPlayerHitPoints(
				this.registry.get("playerTotalHitPoints") ?? this.playerInitialHitPoints
			);
		});
		this.input.keyboard.on("keydown-THREE", () => {
			// Cheat: gain all items
			this.equipSword();
			this.equipPower("WindCard");
			this.equipPower("IceCard");
			this.equipPower("PlantCard");
			this.equipPower("FireCard");
			this.equipPower("SpiritCard");
			this.equipPower("CloudCard");
			this.setPotionCount(10);
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
		this.keyP.on("down", () => {
			this.usePotion();
		});
		this.keyR.on("down", () => {
			this.usePotion();
		});
	}

	usePotion() {
		if (this.getPlayerHitPoints() <= 0) {
			return;
		}
		const potionCount = this.getPotionCount();
		if (potionCount === 0) {
			return;
		}
		// Use Potion
		const totalHitPoints =
			this.registry.get("playerTotalHitPoints") ?? this.playerInitialHitPoints;
		this.healSound.play();
		const effect = this.add.sprite(
			this.player.body.center.x + 1,
			this.player.body.center.y - 1,
			"white_fire_circle",
			0
		);
		effect.setDepth(5);
		effect.setAlpha(0.8);
		effect.anims.play("use-potion-charge");

		if (this.getPlayerHitPoints() === totalHitPoints) {
			effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
				effect.destroy();
			});
			return;
		}

		effect.anims.chain("use-potion");
		effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			const name = effect.anims.getName();
			const progress = effect.anims.getProgress();
			if (name === "use-potion" && progress === 1) {
				effect.destroy();
			}
		});

		this.setPotionCount(potionCount - 1);
		this.setPlayerHitPoints(totalHitPoints);
	}

	freezeWaterTile(tile: Phaser.Tilemaps.Tile) {
		if (!isTileWithPropertiesObject(tile) || !tile.properties.isWater) {
			return;
		}
		this.freezeSound.play();
		const iceTileFrame = 284;
		this.enemyManager.map.removeTile(tile, iceTileFrame);
		this.time.addEvent({
			delay: this.iceMeltTime,
			callback: () => this.meltFrozenTile(tile),
		});
	}

	meltFrozenTile(tile: Phaser.Tilemaps.Tile) {
		if (!isTileWithPropertiesObject(tile) || !tile.properties.isWater) {
			return;
		}
		if (this.physics.overlapTiles(this.player, [tile])) {
			// Do not melt the tile we stand on.
			this.time.addEvent({
				delay: this.iceMeltTime,
				callback: () => this.meltFrozenTile(tile),
			});
			return;
		}

		this.enemyManager.map.removeTile(tile);
		this.enemyManager.map.putTileAt(
			tile,
			tile.x,
			tile.y,
			true,
			tile.layer.name
		);
		if (
			this.enemyManager.activeRoom &&
			!isPointInRoom(tile.x, tile.y, this.enemyManager.activeRoom)
		) {
			hideAllRoomsExcept(
				this.map,
				this.enemyManager.enemies,
				[
					...this.createdItems,
					...this.createdTiles,
					...this.createdDoors,
					...this.createdFinalDoors,
					...this.createdSavePoints,
				],
				this.enemyManager.activeRoom
			);
		}
		this.landLayer.setCollisionByProperty({ collides: true });
	}

	turnOffAllLanterns() {
		this.createdSavePoints.forEach((savePoint) => {
			savePoint.setTexture("dungeon_tiles_sprites", 1322);
		});
	}

	activateAttack() {
		this.player.body.setVelocity(0);
		this.sword.data.set(DataKeys.SwordAttackActive, true);
		this.updateSwordHitbox();

		this.sword.setRotation(Phaser.Math.DegToRad(0));

		// If the animation hasn't started, start it.
		// Do not move the player hitbox when attacking; since it changes size it
		// causes accidental hits as it wiggles around. Instead we use a separate
		// sprite for the attack animation and leave the player and its hitbox
		// alone.
		this.attackSprite.setVisible(true);
		this.attackSprite.setPosition(
			this.player.body.center.x,
			this.player.body.center.y
		);
		this.player.setVisible(false);
		switch (this.playerDirection) {
			case SpriteUp:
				this.attackSprite.play("up-attack", true);
				break;
			case SpriteRight:
				this.attackSprite.play("right-attack", true);
				break;
			case SpriteDown:
				this.attackSprite.play("down-attack", true);
				break;
			case SpriteLeft:
				this.attackSprite.play("left-attack", true);
				break;
		}

		this.attackSound.play();

		this.attackSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.sword.data.set(DataKeys.SwordAttackActive, false);
			this.attackSprite.setVisible(false);
			this.player.setVisible(true);
			this.lastAttackedAt = this.time.now;
		});
	}

	activatePower() {
		this.player.body.setVelocity(0);
		this.player.anims.stop();
		this.setPlayerIdleFrame();
		this.updateSwordHitbox();
		this.playPowerAnimation();
		this.playPowerSound();
	}

	loadLastSave() {
		const saveData = loadSavedData();
		if (!saveData) {
			return;
		}
		this.scene.stop();
		this.scene.get("Overlay")?.scene.stop();
		loadSavedRegistry(this.registry, saveData);
		this.scene.restart(saveData);
	}

	saveGame() {
		localStorage.setItem("lost-card-save", JSON.stringify(this.getSaveData()));
		console.log(this.getSaveData());
		MainEvents.emit(Events.GameSaved);
	}

	getSaveData() {
		return this.registry.getAll();
	}

	getTilesetKeyByName(name: string): string | undefined {
		switch (name) {
			case "Icons":
				return "icons4";
			case "Cards":
				return "cards";
		}
	}

	createSavePoints() {
		this.createdSavePoints = createSpritesFromObjectLayer(
			this.map,
			"SavePoints",
			{
				getTilesetKeyByName: this.getTilesetKeyByName.bind(this),
			}
		).map((item) => {
			item.body.pushable = false;
			return item;
		});
	}

	createFinalDoors() {
		this.createdFinalDoors = createSpritesFromObjectLayer(
			this.map,
			"FinalDoor",
			{
				getTilesetKeyByName: this.getTilesetKeyByName.bind(this),
			}
		).map((item) => {
			item.body.pushable = false;
			return item;
		});
	}

	createDoors() {
		this.createdDoors = createSpritesFromObjectLayer(this.map, "Doors", {
			getTilesetKeyByName: this.getTilesetKeyByName.bind(this),
		}).map((item) => {
			item.body.pushable = false;
			item.body.setSize(item.body.width + 1, item.body.height + 1);
			return item;
		});
	}

	createAppearingTiles() {
		this.createdTiles = createSpritesFromObjectLayer(this.map, "Transients", {
			getTilesetKeyByName: this.getTilesetKeyByName.bind(this),
		}).map((sprite) => {
			sprite.body.setSize(sprite.body.width * 0.75, sprite.body.height * 0.75);
			return sprite;
		});
	}

	createItems() {
		this.createdItems = createSpritesFromObjectLayer(this.map, "Items", {
			filterCallback: this.shouldCreateLayerObject.bind(this),
			callback: this.recordObjectIdOnSprite.bind(this),
			getTilesetKeyByName: this.getTilesetKeyByName.bind(this),
		});
	}

	shouldCreateLayerObject(
		layerObject: Phaser.Types.Tilemaps.TiledObject
	): boolean {
		if (!layerObject.id) {
			return true;
		}
		const itemsRemoved: Array<number> = this.registry.get("itemsRemoved") ?? [];
		return !itemsRemoved.includes(layerObject.id);
	}

	recordObjectIdOnSprite(
		layerObject: Phaser.Types.Tilemaps.TiledObject,
		sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	): void {
		sprite.data.set("objectId", layerObject.id);
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
		this.lastDialogData = undefined;
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

		camera.startFollow(this.player);

		this.enemyManager.activeRoom = room;
		this.enteredRoomAt = this.time.now;
		hideAllRoomsExcept(
			this.map,
			this.enemyManager.enemies,
			[
				...this.createdItems,
				...this.createdTiles,
				...this.createdDoors,
				...this.createdFinalDoors,
				...this.createdSavePoints,
			],
			room
		);

		this.createEnemiesInRoom();

		this.closeGatePillars();
	}

	openGatePillars() {
		// Note: make sure there's only one per room
		const gatePillar = this.createdTiles.find(
			(tile) =>
				tile.name === "GatePillar" &&
				tile.visible === true &&
				!tile.data.get("openGate")
		);
		if (!gatePillar) {
			return;
		}
		const gatePosition = new Phaser.Math.Vector2(gatePillar.x, gatePillar.y);
		gatePillar.data.set("openGate", true);
		this.createdTiles
			.filter((tile) => tile.name === "GateWall" && tile.visible === true)
			.forEach((tile) => {
				if (!tile.data.get("originalPosition")) {
					const tilePosition = new Phaser.Math.Vector2(tile.x, tile.y);
					tile.data.set("originalPosition", tilePosition);
				}
				this.tweens.killTweensOf(tile);
				this.tweens.add({
					targets: tile,
					x: gatePosition.x,
					y: gatePosition.y,
					duration: this.gateCloseSpeed * 2,
				});
			});
	}

	updateGatePillars() {
		const gatePillar = this.createdTiles.find(
			(tile) => tile.name === "GatePillar" && tile.visible === true
		);
		if (!gatePillar) {
			return;
		}
		const gatePosition = new Phaser.Math.Vector2(gatePillar.x, gatePillar.y);
		const distance = Phaser.Math.Distance.BetweenPoints(
			gatePosition,
			this.player.body.center
		);
		if (distance > 60) {
			this.openGatePillars();
			return;
		}
		this.closeGatePillars();
	}

	closeGatePillars() {
		const gatePillar = this.createdTiles.find(
			(tile) => tile.name === "GatePillar" && tile.data?.get("openGate")
		);
		if (!gatePillar) {
			return;
		}
		gatePillar.data.set("openGate", false);
		this.createdTiles
			.filter((tile) => tile.name === "GateWall")
			.forEach((tile) => {
				const tilePosition = tile.data.get("originalPosition");
				if (tilePosition) {
					this.tweens.killTweensOf(tile);
					this.tweens.add({
						targets: tile,
						x: tilePosition.x,
						y: tilePosition.y,
						duration: this.gateCloseSpeed,
					});
				}
			});
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

		const room = getRoomForPoint(this.map, destinationX, destinationY);
		if (room.name === this.enemyManager.activeRoom?.name) {
			return;
		}

		const previousRegion = this.enemyManager.activeRoom
			? getRegionFromRoomName(this.enemyManager.activeRoom.name)
			: undefined;
		const newRegion = getRegionFromRoomName(room.name);
		const isRegionTransition = previousRegion !== newRegion;
		const fadeTime = isRegionTransition
			? this.regionTransitionFadeTime
			: this.roomTransitionFadeTime;

		console.log("moving player to point", destinationX, destinationY);
		this.setPlayerStunned(true);
		this.cameras.main.fadeOut(
			fadeTime,
			0,
			0,
			0,
			(_: unknown, progress: number) => {
				if (progress === 1) {
					if (isRegionTransition) {
						this.scene.launch("Dialog", {
							heading: getRegionName(newRegion),
							hideAfter: this.newRegionMessageTime,
						});
					}

					this.movePlayerToPoint(destinationX, destinationY);
					this.setPlayerStunned(false);
					this.cameras.main.fadeIn(fadeTime);
				}
			}
		);
	}

	checkForGameOver() {
		if (this.getPlayerHitPoints() <= 0 && !this.isGameOver) {
			this.setPlayerInvincible(true);
			this.player.stop();
			this.player.body.setVelocity(0);
			this.enemyCollider.active = false;
			this.time.addEvent({
				delay: this.preGameOverTime,
				callback: () => {
					this.gameOver();
				},
			});
		}
	}

	update() {
		this.checkForGameOver();
		this.enemyManager.enemies.getChildren().forEach((enemy) => {
			if (!isDynamicSprite(enemy)) {
				return;
			}
			if (enemy.data.get("isPlantCardGrappleActive")) {
				const distance = Phaser.Math.Distance.BetweenPoints(
					enemy.body.center,
					this.player.body.center
				);
				if (distance < 30) {
					enemy.emit(Events.MonsterStun, false);
					enemy.data.set("isPlantCardGrappleActive", false);
					this.power.anims.stop();
					this.power.visible = false;
				}
			}

			// Note that enemies should avoid rendering if they are not active!
			enemy.update();
		});
		this.updatePlayer();
		this.updateRoom();
		this.updateGatePillars();
	}

	updateRoom() {
		this.checkForPowerHitTiles();
		this.updateAppearingTiles();
	}

	destroyCreatedTile(tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		console.log("destroying tile", tile);
		this.cameras.main.shake(200, 0.004);

		this.rockDestroySound.play();
		tile.setOrigin(0.6, 0.5);
		tile.anims.play("explode", true);
		tile.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.createdTiles = this.createdTiles.filter((tileA) => tileA !== tile);
			this.stuffLayer.removeTileAtWorldXY(tile.x, tile.y);
			tile.destroy();
		});
	}

	checkForPowerHitTiles() {
		if (!this.isPlayerUsingPower()) {
			return;
		}

		this.createdTiles.forEach((tile) => {
			if (this.physics.overlap(this.power, tile)) {
				if (!tile.visible) {
					return;
				}
				if (!tile.x || !tile.y) {
					return;
				}
				switch (this.getActivePower()) {
					case "WindCard":
						this.checkForWindCardHitTile(tile);
						break;
					case "PlantCard":
						this.checkForPlantCardHitTile(tile);
						break;
					case "FireCard":
						this.checkForFireCardHitTile(tile);
						break;
				}
			}
		});
	}

	checkForPlantCardHitTile(
		tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	) {
		const isAffectedByPower = tile.data.get("affectedByPlantCard");
		if (!isAffectedByPower) {
			return;
		}
		if (
			this.player.data.get("isPlantCardGrappleActive") ||
			this.power.anims.isPaused
		) {
			return;
		}
		console.log("hit item with plant card", tile);

		// The plant card moves you next to the target, over any land obstacle
		this.player.data.set("isPlantCardGrappleActive", true);
		this.physics.moveToObject(this.player, tile, this.plantCardVelocity);
		this.power.anims.pause();
		this.power.body.stop();
	}

	checkForWindCardHitTile(
		tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	) {
		const isAffectedByPower = tile.data.get("affectedByWindCard");
		if (!isAffectedByPower) {
			return;
		}
		if (tile.data.get("beingPushed")) {
			return;
		}
		tile.data.set("beingPushed", true);
		console.log("hit item with wind card", tile);

		// The wind card pushes tiles.
		const velocity = createVelocityForDirection(
			this.windCardPushSpeed,
			this.playerDirection
		);
		tile.body.setVelocity(velocity.x, velocity.y);
		this.time.addEvent({
			delay: this.windCardPushTime,
			callback: () => {
				// Tile might have been destroyed before this happens
				if (tile.body?.setVelocity) {
					console.log("hit item complete");
					tile.body.setVelocity(0, 0);
					tile.data.set("beingPushed", false);
				}
			},
		});
	}

	checkForFireCardHitTile(
		tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	) {
		const isAffectedByPower = tile.data.get("affectedByFireCard");
		if (!isAffectedByPower) {
			return;
		}
		console.log("hit item with fire card", tile);

		// The fire card destroys tiles.
		this.createdTiles = this.createdTiles.filter((x) => x !== tile);
		tile.destroy();

		this.power.anims.stop();
		this.power.setVisible(false);

		const effect = this.add.sprite(tile.x, tile.y, "fire-power-right", 0);
		effect.setDepth(5);
		effect.anims.play("fire-power-right", true);
		effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect.destroy();
		});
	}

	updateAppearingTiles() {
		const transientTiles = this.enemyManager.activeRoom
			? getItemsInRoom(this.createdTiles, this.enemyManager.activeRoom)
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
			const playerPosition = new Phaser.Math.Vector2(
				this.player.x,
				this.player.y
			);
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
		this.time.addEvent({
			delay: previewBeforeAppear,
			callback: () => {
				tile.alpha = 1;
				tile.data.set("hidden", false);
				tile.body.pushable = false;
				this.physics.add.collider(this.player, tile, () => {
					if (this.player.data.get("isPlantCardGrappleActive")) {
						console.log("end plant card");
						// In case we were being pulled by the PlantCard
						this.player.data.set("isPlantCardGrappleActive", false);
						this.power.anims.stop();
						this.power.visible = false;
					}
					if (tile.name === "TutorialSign") {
						this.showDialog({
							heading: "The door is shut",
							text: "Once, cards of power protected the kingdoms, but the cards have been lost. Monsters have sealed the people behind this door.",
						});
					}
					if (tile.name === "MapSign") {
						this.showDialog({
							heading: "View the map",
							text: "Press TAB or M to pause and view the map.",
						});
					}
					if (tile.name === "SwordSign") {
						this.showDialog({
							heading: "Get a weapon",
							text: "It would be unwise to face the monsters unarmed. Visit the armory south of the throne room.",
						});
					}
				});
				this.physics.add.collider(
					this.enemyManager.enemies,
					tile,
					(_, enemy) => {
						if (!isDynamicSprite(enemy)) {
							return;
						}
						if (tile.body.velocity.x === 0 && tile.body.velocity.y === 0) {
							return;
						}
						console.log("hit enemy with rock");
						this.sendHitToEnemy(enemy);
					},
					(tile, enemy) => {
						if (!isDynamicSprite(enemy)) {
							console.error(enemy);
							throw new Error("Non-sprite ran into something");
						}
						if (!isEnemy(enemy)) {
							console.error(enemy);
							throw new Error("Non-enemy ran into something");
						}
						return enemy.doesCollideWithTile(tile);
					}
				);
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
			},
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
		const item = this.createdItems.find((item) => {
			if (!this.enemyManager.activeRoom) {
				return false;
			}
			return (
				item.name === name &&
				isPointInRoom(item.x, item.y, this.enemyManager.activeRoom)
			);
		});
		if (!item) {
			return;
		}
		if (!item.data.get("hidden")) {
			return;
		}
		const effect = this.add.sprite(
			item.body.center.x,
			item.body.center.y,
			"character_appear",
			0
		);
		effect.setDepth(5);
		effect.anims.play("white_fire_circle", true);
		effect.anims.chain("appear");
		effect.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => {
			const name = effect.anims.getName();
			const progress = effect.anims.getProgress();
			if (name === "appear" && progress > 0.8) {
				item.data.set("hidden", false);
				item.setVisible(true);
				item.setActive(true);
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
				case "Potion":
					this.pickUpPotion();
					break;
				case "PlantCard":
					this.pickUpCard(touchingItem.name);
					break;
				case "WindCard":
					this.pickUpCard(touchingItem.name);
					break;
				case "IceCard":
					this.pickUpCard(touchingItem.name);
					break;
				case "FireCard":
					this.pickUpCard(touchingItem.name);
					break;
				case "SpiritCard":
					this.pickUpCard(touchingItem.name);
					break;
				case "CloudCard":
					this.pickUpCard(touchingItem.name);
					break;
				case "Heart":
					this.pickUpHeart();
					break;
				case "Key":
					this.pickUpKey();
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
		const itemsRemoved = this.registry.get("itemsRemoved") ?? [];
		const itemObject = this.map.findObject("Items", (obj) => {
			if (!hasId(obj)) {
				return false;
			}
			if (obj.id === itemToRemove.data.get("objectId")) {
				return true;
			}
			return false;
		});
		if (!itemObject) {
			return;
		}
		itemsRemoved.push(itemObject.id);
		this.registry.set("itemsRemoved", itemsRemoved);
		itemToRemove.destroy();
	}

	getPlayerHitPoints(): number {
		return this.registry.get("playerHitPoints") ?? this.playerInitialHitPoints;
	}

	setPlayerHitPoints(hitPoints: number) {
		this.registry.set("playerHitPoints", hitPoints);
	}

	setKeyCount(count: number) {
		this.registry.set(DataKeys.KeyCount, count);
	}

	getKeyCount(): number {
		return this.registry.get(DataKeys.KeyCount) ?? 0;
	}

	pickUpKey() {
		this.setKeyCount(this.getKeyCount() + 1);
		this.showDialog({
			heading: "A Key",
			text: "Collect six of these to open the Golden door.",
		});
	}

	pickUpHeart() {
		let playerTotalHitPoints =
			this.registry.get("playerTotalHitPoints") ?? this.playerInitialHitPoints;
		playerTotalHitPoints += 1;
		this.registry.set("playerTotalHitPoints", playerTotalHitPoints);
		this.setPlayerHitPoints(playerTotalHitPoints);
	}

	playCardAnimation(card: Powers) {
		// Face right
		this.playerDirection = SpriteRight;
		this.setPlayerIdleFrame();
		this.updatePowerHitboxPosition();
		this.power.setRotation(Phaser.Math.DegToRad(0));

		// Play power animation
		switch (card) {
			case "IceCard":
				this.power.setVelocity(this.icePowerVelocity, 0);
				this.power.anims.play("ice-power-right", true);
				break;
			case "SpiritCard":
				this.power.anims.play("spirit-power", true);
				this.power.setAlpha(0.5);
				this.player.setAlpha(0.5);
				this.power.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
					this.power.setAlpha(1);
					this.player.setAlpha(1);
				});
				break;
			case "CloudCard":
				this.power.anims.play("cloud-power", true);
				break;
			case "FireCard":
				this.power.setVelocity(this.firePowerVelocity, 0);
				this.power.anims.play("fire-power-right", true);
				break;
			case "PlantCard":
				this.power.anims.play("plant-power-right", true);
				break;
			case "WindCard":
				this.power.anims.play("wind-power-right", true);
				break;
		}
	}

	getCardNameForPower(card: Powers): string {
		switch (card) {
			case "IceCard":
				return "Ice Card";
			case "PlantCard":
				return "Plant Card";
			case "SpiritCard":
				return "Spirit Card";
			case "WindCard":
				return "Wind Card";
			case "FireCard":
				return "Fire Card";
			case "CloudCard":
				return "Cloud Card";
		}
	}

	pickUpCard(card: Powers) {
		this.equipPower(card);
		this.playCardAnimation(card);
		this.setPlayerInvincible(true);
		this.setPlayerStunned(true);
		this.time.addEvent({
			delay: this.gotItemFreeze,
			callback: () => {
				this.showDialog({
					heading: this.getCardNameForPower(card),
					text: "Press SHIFT to use the power.\r\nPress [ or ] to change the active power.",
				});
				this.setPlayerInvincible(false);
				this.setPlayerStunned(false);
			},
		});
	}

	pickUpPotion() {
		const playerTotalHitPoints =
			this.registry.get("playerTotalHitPoints") ?? this.playerInitialHitPoints;
		this.setPlayerHitPoints(playerTotalHitPoints);

		this.setPotionCount(this.getPotionCount() + 1);

		if (this.registry.get("seenPotionDialog")) {
			return;
		}

		this.showDialog({
			heading: "A potion!",
			text: "Press P or R to use a potion and restore your health.",
		});
		this.registry.set("seenPotionDialog", true);
	}

	pickUpSword() {
		this.equipSword();
		this.player.anims.play("down-attack", true);
		this.setPlayerInvincible(true);
		this.setPlayerStunned(true);
		this.time.addEvent({
			delay: this.gotItemFreeze,
			callback: () => {
				this.showDialog({
					heading: "You found a sword!",
					text: "Press SPACE to swing.",
				});
				this.setPlayerInvincible(false);
				this.setPlayerStunned(false);
			},
		});
	}

	movePlayerToPoint(x: number, y: number) {
		this.player.setPosition(x, y);
		const room = getRoomForPoint(this.map, this.player.x, this.player.y);
		console.log("moving camera to room", room);
		this.moveCameraToRoom(room);
	}

	getPlayerSpeed(): number {
		return this.characterSpeed;
	}

	updateSwordHitboxForAttack() {
		// Add hitbox for sword in direction of sprite
		const swordWidth = 36; // for down/up
		const swordHeight = 22; // for down/up
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
		if (["SpiritCard", "CloudCard"].includes(this.getActivePower() as string)) {
			return [0, 0];
		}
		const xOffset = (() => {
			if (this.playerDirection === SpriteLeft) {
				return -20;
			}
			if (this.playerDirection === SpriteRight) {
				return 20;
			}
			return 0;
		})();
		const yOffset = (() => {
			if (this.playerDirection === SpriteUp) {
				return -20;
			}
			if (this.playerDirection === SpriteDown) {
				return 20;
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

	updatePowerHitboxPosition() {
		if (
			this.isPlayerUsingPower() &&
			!["SpiritCard"].includes(this.getActivePower() as string)
		) {
			// We don't want to touch the power hitbox if a power is already animating.
			return;
		}

		const width = (() => {
			if (["SpiritCard"].includes(this.getActivePower() as string)) {
				return 12;
			}
			if (this.getActivePower() === "FireCard") {
				return 12;
			}
			if (
				this.playerDirection === SpriteLeft ||
				this.playerDirection === SpriteRight
			) {
				return 24;
			}
			return 10;
		})();
		const height = (() => {
			if (["SpiritCard"].includes(this.getActivePower() as string)) {
				return 12;
			}
			if (this.getActivePower() === "FireCard") {
				return 12;
			}
			if (
				this.playerDirection === SpriteUp ||
				this.playerDirection === SpriteDown
			) {
				return 24;
			}
			return 10;
		})();

		this.power.body.setSize(width, height);

		const [xOffset, yOffset] = this.getPowerOffset();
		this.power.x = this.player.body.center.x + xOffset;
		this.power.y = this.player.body.center.y + yOffset;
	}

	// This will be true once the player starts their attack flow. However, there
	// are frames of the attack where the sword does not threaten anyone. To know
	// if the sword is active, use `isPlayerSwordActive()` instead.
	isPlayerAttacking() {
		return (
			this.attackSprite?.anims?.getName().includes("attack") &&
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
		this.power.body.debugShowBody = false;
		this.sword.body.debugShowVelocity = false;
		this.power.body.debugShowVelocity = false;
		this.sword.setVelocity(0);

		// We update the sword/power hitbox on every frame even when not in use to
		// make sure it stays in position relative to the player; otherwise the
		// hitbox appears briefly at its old location.
		if (!this.isPlayerSwordActive() && !this.isPlayerUsingPower()) {
			this.sword.setVisible(false);
			this.power.setVisible(false);
			this.updateSwordHitboxForAttack();
			this.updatePowerHitboxPosition();
			return;
		}

		if (this.isPlayerSwordActive()) {
			this.sword.body.debugShowBody = true;
			this.sword.body.debugShowVelocity = true;
			return;
		}
		if (this.isPlayerUsingPower()) {
			this.power.body.debugShowBody = true;
			this.power.body.debugShowVelocity = true;
			return;
		}
	}

	createOverlay() {
		if (!this.registry.has("playerTotalHitPoints")) {
			this.registry.set("playerTotalHitPoints", this.playerInitialHitPoints);
		}
		if (!this.registry.has("playerHitPoints")) {
			this.setPlayerHitPoints(this.playerInitialHitPoints);
		}
		this.scene.launch("Overlay");
	}

	preload() {
		this.attackSound = this.sound.add("attack", { loop: false });
		this.windSound = this.sound.add("wind", { loop: false });
		this.walkSound = this.sound.add("walk", { loop: false, rate: 1.5 });
		this.iceSound = this.sound.add("ice", { loop: false });
		this.rockDestroySound = this.sound.add("rock-destroy", { loop: false });
		this.freezeSound = this.sound.add("freeze", { loop: false });
		this.plantSound = this.sound.add("plant", { loop: false });
		this.healSound = this.sound.add("heal", { loop: false });
		this.hitSound = this.sound.add("hit", { loop: false });
		this.destroySound = this.sound.add("destroy", { loop: false });

		const anims = this.anims;
		anims.create({
			key: "appear",
			frames: anims.generateFrameNumbers("character_appear"),
			frameRate: 20,
			showOnStart: true,
			hideOnComplete: true,
		});
		anims.create({
			key: "use-potion-charge",
			frames: anims.generateFrameNumbers("healing-1", {
				frames: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5],
			}),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
		});
		anims.create({
			key: "use-potion",
			frames: anims.generateFrameNumbers("healing-2", { start: 11, end: 0 }),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
		});
		anims.create({
			key: "white_fire_circle",
			frames: anims.generateFrameNumbers("white_fire_circle"),
			frameRate: 20,
			repeat: 2,
			showOnStart: true,
			hideOnComplete: true,
		});
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
			key: "idle-down",
			frames: anims.generateFrameNames("character", {
				prefix: "idle-down-",
				suffix: ".png",
				end: 4,
			}),
			frameRate: 7,
			repeat: -1,
		});
		anims.create({
			key: "idle-up",
			frames: anims.generateFrameNames("character", {
				prefix: "idle-up-",
				suffix: ".png",
				end: 4,
			}),
			frameRate: 7,
			repeat: -1,
		});
		anims.create({
			key: "idle-left",
			frames: anims.generateFrameNames("character", {
				prefix: "idle-left-",
				suffix: ".png",
				end: 4,
			}),
			frameRate: 7,
			repeat: -1,
		});

		anims.create({
			key: "down-walk",
			frames: anims.generateFrameNames("character", {
				prefix: "run-down-",
				suffix: ".png",
				end: 7,
			}),
			frameRate: 14,
			repeat: -1,
		});
		anims.create({
			key: "up-walk",
			frames: anims.generateFrameNames("character", {
				prefix: "run-up-",
				suffix: ".png",
				end: 7,
			}),
			frameRate: 14,
			repeat: -1,
		});
		anims.create({
			key: "left-walk",
			frames: anims.generateFrameNames("character", {
				prefix: "run-left-",
				suffix: ".png",
				end: 7,
			}),
			frameRate: 14,
			repeat: -1,
		});

		anims.create({
			key: "down-attack",
			frames: anims.generateFrameNames("character", {
				prefix: "sword-down-",
				suffix: ".png",
				end: 9,
			}),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "right-attack",
			frames: anims.generateFrameNames("character", {
				prefix: "sword-right-",
				suffix: ".png",
				end: 9,
			}),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "up-attack",
			frames: anims.generateFrameNames("character", {
				prefix: "sword-up-",
				suffix: ".png",
				end: 9,
			}),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "left-attack",
			frames: anims.generateFrameNames("character", {
				prefix: "sword-left-",
				suffix: ".png",
				end: 9,
			}),
			frameRate: this.attackFrameRate,
			repeat: 0,
			delay: this.attackDelay,
			showBeforeDelay: true,
		});

		anims.create({
			key: "plant-power-right",
			frames: anims.generateFrameNumbers("plant-power"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
			yoyo: true,
		});
		anims.create({
			key: "ice-power-right",
			frames: anims.generateFrameNumbers("ice-power"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
		});
		anims.create({
			key: "fire-power-right",
			frames: anims.generateFrameNumbers("fire-power"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
		});
		anims.create({
			key: "cloud-power",
			frames: anims.generateFrameNumbers("cloud-power"),
			frameRate: 55,
			showOnStart: true,
			hideOnComplete: true,
		});
		anims.create({
			key: "spirit-power",
			frames: anims.generateFrameNumbers("spirit-power"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
			repeat: 2,
		});
		anims.create({
			key: "wind-power-right",
			frames: anims.generateFrameNumbers("wind-power"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
		});
	}

	getSpawnPoint(): { x: number; y: number } {
		const spawnPoint = this.map.findObject(
			"MetaObjects",
			(obj) => obj.name === "Start Point"
		);
		const tempSpawnPoint = this.map.findObject(
			"MetaObjects",
			(obj) => obj.name === "Temp Start"
		);
		return {
			x: tempSpawnPoint?.x ?? spawnPoint?.x ?? 400,
			y: tempSpawnPoint?.y ?? spawnPoint?.y ?? 350,
		};
	}

	createPlayer(x: number, y: number): void {
		this.player = this.physics.add.sprite(x, y, "character", "idle-down-0.png");
		this.player.setDataEnabled();
		this.player.setDebugBodyColor(0x00ff00);
		this.player.setSize(7, 10);
		this.player.setOrigin(0, 0.5);
		this.player.setOffset(
			this.player.body.offset.x,
			this.player.body.offset.y + 5
		);
		this.player.setDepth(1);
		this.sword = this.physics.add.sprite(
			this.player.x,
			this.player.y,
			"wind-power",
			4
		);
		this.sword.setDataEnabled();
		this.sword.setDebugBodyColor(0x00fff0);
		this.sword.setDepth(4);
		this.sword.setPushable(false);

		this.power = this.physics.add.sprite(
			this.player.x,
			this.player.y,
			"wind-power",
			4
		);
		this.power.setDebugBodyColor(0x00fff0);
		this.power.setDepth(4);

		this.updateSwordHitbox();

		this.player.setCollideWorldBounds(true);
		this.makePlayerAppear();
	}

	makePlayerAppear() {
		this.setPlayerInvincible(true);
		this.setPlayerStunned(true);
		this.player.setVisible(false);
		const effect = this.add.sprite(
			this.player.body.center.x - 4,
			this.player.body.center.y + this.player.body.height / 2,
			"white_fire_circle",
			0
		);
		effect.setOrigin(0, 0.5);
		effect.setDepth(5);
		effect.anims.play("white_fire_circle", true);
		effect.anims.chain("appear");
		effect.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => {
			const name = effect.anims.getName();
			const progress = effect.anims.getProgress();
			if (name === "appear" && progress > 0.8) {
				this.setPlayerStunned(false);
				this.player.setVisible(true);
				this.time.addEvent({
					delay: this.postAppearInvincibilityTime,
					callback: () => {
						this.setPlayerInvincible(false);
					},
				});
			}
		});
	}

	createEnemies(): void {
		this.spawnPoints =
			this.map.filterObjects("Creatures", () => {
				return true;
			}) ?? [];
	}

	createEnemiesInRoom() {
		this.spawnPoints.forEach((point) => {
			if (
				point.x === undefined ||
				point.y === undefined ||
				!this.enemyManager.activeRoom
			) {
				return;
			}
			const isEnemyInRoom = isPointInRoom(
				point.x,
				point.y,
				this.enemyManager.activeRoom
			);
			if (!isEnemyInRoom) {
				return;
			}

			console.log("creating monster at", point.x, point.y);
			const enemyType = point.name;
			switch (enemyType) {
				case "MountainMonster": {
					const monster = new MountainMonster(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					this.enemyManager.enemies.add(monster);
					break;
				}
				case "Skeleton": {
					const monster = new Skeleton(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					this.enemyManager.enemies.add(monster);
					break;
				}
				case "Ghost": {
					const monster = new Ghost(this, this.enemyManager, point.x, point.y);
					this.enemyManager.enemies.add(monster);
					break;
				}
				case "GreatGhost": {
					const monster = new GreatGhost(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					this.enemyManager.enemies.add(monster);
					monster.once("defeated", () => {
						this.showHiddenItem("SpiritCard");
					});
					break;
				}
				case "SkyBlob": {
					const monster = new SkyBlob(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					this.enemyManager.enemies.add(monster);
					break;
				}
				case "CloudGoblin": {
					const monster = new CloudGoblin(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					this.enemyManager.enemies.add(monster);
					break;
				}
				case "PlantBug": {
					const monster = new PlantBug(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					this.enemyManager.enemies.add(monster);
					break;
				}
				case "WaterDipper": {
					const monster = new WaterDipper(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					monster.once("defeated", () => {
						this.showHiddenItem("IceCard");
					});
					this.enemyManager.enemies.add(monster);
					break;
				}
				case "IceMonster": {
					const monster = new IceMonster(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					this.enemyManager.enemies.add(monster);
					break;
				}
				case "FireSpout": {
					const monster = new FireSpout(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					this.enemyManager.enemies.add(monster);
					break;
				}
				case "PlantSpitter": {
					const monster = new PlantSpitter(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					this.enemyManager.enemies.add(monster);
					break;
				}
				case "FireMonster": {
					const monster = new FireMonster(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					this.enemyManager.enemies.add(monster);
					break;
				}
				case "MountainBoss": {
					if (this.wasBossDefeated("MountainBoss")) {
						break;
					}
					const boss = new MountainBoss(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("MountainBoss");
						this.showHiddenItem("WindCard");
						this.showHiddenItem("Heart");
						this.showHiddenItem("Key");
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				case "IceBoss": {
					if (this.wasBossDefeated("IceBoss")) {
						break;
					}
					const boss = new IceBoss(this, this.enemyManager, point.x, point.y);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("IceBoss");
						this.showHiddenItem("Heart");
						this.showHiddenItem("Key");
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				case "CloudBoss": {
					if (this.wasBossDefeated("CloudBoss")) {
						break;
					}
					const boss = new CloudBoss(this, this.enemyManager, point.x, point.y);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("CloudBoss");
						this.showHiddenItem("Heart");
						this.showHiddenItem("Key");
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				case "SpiritBoss": {
					if (this.wasBossDefeated("SpiritBoss")) {
						break;
					}
					const boss = new SpiritBoss(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("SpiritBoss");
						this.showHiddenItem("Heart");
						this.showHiddenItem("Key");
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				case "PlantBoss": {
					if (this.wasBossDefeated("PlantBoss")) {
						break;
					}
					const boss = new PlantBoss(this, this.enemyManager, point.x, point.y);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("PlantBoss");
						this.showHiddenItem("Heart");
						this.showHiddenItem("Key");
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				case "FireBoss": {
					if (this.wasBossDefeated("FireBoss")) {
						break;
					}
					const boss = new FireBoss(this, this.enemyManager, point.x, point.y);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("FireBoss");
						this.showHiddenItem("Heart");
						this.showHiddenItem("Key");
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				default:
					throw new Error(`Unknown enemy type "${enemyType}"`);
			}

			this.spawnPoints = this.spawnPoints.filter((pointB) => pointB !== point);
		});

		// It seems that we may need to do this again when enemies changes?
		this.physics.add.collider(this.createdDoors, this.enemyManager.enemies);

		MainEvents.on(Events.MonsterDefeated, () => {
			this.destroySound.play();
		});
	}

	wasBossDefeated(name: string) {
		const defeated = this.registry.get(DataKeys.DefeatedBosses) ?? [];
		return defeated.includes(name);
	}

	markBossDefeated(name: string) {
		const defeated = this.registry.get(DataKeys.DefeatedBosses) ?? [];
		defeated.push(name);
		this.registry.set(DataKeys.DefeatedBosses, defeated);
	}

	playerHitEnemy(
		enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	): void {
		// If the player is not in the attack animation, do nothing. Also do
		// nothing if the player is in the warmup for the attack or the cooldown.
		if (this.isPlayerSwordActive()) {
			this.sendHitToEnemy(enemy);
		}
		if (this.isPlayerUsingPower() && this.getActivePower() === "WindCard") {
			this.pushEnemy(enemy);
		}
		if (this.isPlayerUsingPower() && this.getActivePower() === "IceCard") {
			this.freezeEnemy(enemy);
		}
		if (this.isPlayerUsingPower() && this.getActivePower() === "PlantCard") {
			this.pullEnemy(enemy);
		}
		if (this.isPlayerUsingPower() && this.getActivePower() === "FireCard") {
			this.sendHitToEnemy(enemy);
			this.power.anims.stop();
			this.power.setVisible(false);
			const effect = this.add.sprite(
				enemy.body.center.x,
				enemy.body.center.y,
				"fire-power-right",
				0
			);
			effect.setDepth(5);
			effect.anims.play("fire-power-right", true);
			effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
				effect.destroy();
			});
		}
	}

	freezeEnemy(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		if (
			enemy.data.get(DataKeys.Hittable) &&
			enemy.data.get(DataKeys.Freezable)
		) {
			this.freezeSound.play();
			enemy.emit(Events.MonsterStun, true);
			enemy.setTint(0x0000ff);
			this.time.addEvent({
				delay: this.iceCardFrozenTime,
				callback: () => {
					enemy?.emit(Events.MonsterStun, false);
					enemy?.clearTint();
				},
			});
		}
	}

	pushEnemy(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		if (enemy.data.get(DataKeys.Pushable) === true) {
			// We can't use MonsterStun event here because it is too slow.
			enemy.data.set(DataKeys.Stunned, true);
			this.knockBack(
				enemy.body,
				this.enemyKnockbackTime,
				this.enemyKnockBackSpeed,
				this.playerDirection,
				() => {
					enemy?.data?.set(DataKeys.Stunned, false);
				}
			);
		}
	}

	pullEnemy(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		if (enemy.data.get(DataKeys.Hittable) !== true) {
			return;
		}
		if (enemy.data.get("isPlantCardGrappleActive")) {
			return;
		}
		console.log("pulling monster");
		// We can't use MonsterStun event here because it is too slow.
		enemy.data.set(DataKeys.Stunned, true);
		enemy.body.stop();
		enemy.data.set("isPlantCardGrappleActive", true);

		this.physics.moveToObject(enemy, this.player, this.plantCardVelocity);
		this.power.body.stop();
	}

	sendHitToEnemy(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		if (enemy.data.get(DataKeys.Hittable) !== true) {
			return;
		}
		if (!this.hitSound.isPlaying) {
			this.hitSound.play();
		}
		this.cameras.main.shake(200, 0.004);
		enemy.emit(Events.MonsterHit);

		// Knock the player back a bit when they hit an enemy.
		this.knockBack(
			this.player.body,
			this.postHitEnemyKnockback,
			this.playerKnockBackSpeed,
			invertSpriteDirection(this.playerDirection),
			() => {}
		);

		// Knock back monster when they are hit.
		this.pushEnemy(enemy);
	}

	gameOver() {
		if (!this.scene.isActive()) {
			return;
		}
		console.log("game over!");
		this.isGameOver = true;
		this.cameras.main.fadeOut(1000, 0, 0, 0, (_: unknown, progress: number) => {
			if (progress === 1) {
				this.scene.stop();
				this.scene.get("Overlay")?.scene.stop();
				this.scene.start("GameOver");
			}
		});
	}

	enemyHitPlayer(): void {
		if (this.isPlayerBeingHit() || this.isPlayerInvincible()) {
			return;
		}
		this.hitSound.play();

		this.enemyCollider.active = false;
		this.cameras.main.shake(300, 0.009);
		this.cameras.main.zoomTo(1.5, 600, "Linear", false, (_, progress) => {
			if (progress === 1) {
				this.time.addEvent({
					delay: 0,
					callback: () => {
						if (this.getPlayerHitPoints() > 0) {
							this.cameras.main.zoomTo(1, 400, "Linear", true);
						}
					},
				});
			}
		});
		this.setPlayerHitPoints(this.getPlayerHitPoints() - 1);

		if (this.getPlayerHitPoints() <= 0) {
			return;
		}

		this.time.addEvent({
			delay: this.postHitInvincibilityTime,
			callback: () => {
				if (this.getPlayerHitPoints() > 0) {
					this.setPlayerBeingHit(false);
					this.enemyCollider.active = true;
				}
			},
		});

		this.isPlayerBeingKnockedBack = true;
		this.knockBack(
			this.player.body,
			this.postHitPlayerKnockback,
			this.playerKnockBackSpeed,
			invertSpriteDirection(this.playerDirection),
			() => {
				this.isPlayerBeingKnockedBack = false;
			}
		);

		this.setPlayerBeingHit(true);
	}

	knockBack(
		body: Phaser.Physics.Arcade.Body,
		time: number,
		speed: number,
		direction: SpriteDirection,
		completeCallback?: () => void
	) {
		this.time.addEvent({
			delay: time,
			callback: () => {
				body.stop();
				completeCallback?.();
			},
		});

		body.stop();
		switch (direction) {
			case SpriteUp:
				body.setVelocityY(-speed);
				break;
			case SpriteRight:
				body.setVelocityX(speed);
				break;
			case SpriteDown:
				body.setVelocityY(speed);
				break;
			case SpriteLeft:
				body.setVelocityX(-speed);
				break;
		}
	}

	getTimeSinceLastAttack(): number {
		return this.time.now - this.lastAttackedAt;
	}

	getTimeSinceLastPower(): number {
		return this.time.now - this.lastPowerAt;
	}

	canPlayerAttack(): boolean {
		return (
			this.getPlayerHitPoints() > 0 &&
			this.doesPlayerHaveSword() &&
			!this.isPlayerFrozen() &&
			!this.isPlayerStunned() &&
			!this.isPlayerAttacking() &&
			this.getTimeSinceLastAttack() > this.postAttackCooldown &&
			!this.isPlayerUsingPower()
		);
	}

	getPotionCount(): number {
		return this.registry.get(DataKeys.PotionCount) ?? 0;
	}

	setPotionCount(count: number) {
		this.registry.set(DataKeys.PotionCount, count);
	}

	equipSword(): void {
		this.registry.set("hasSword", true);
	}

	equipPower(power: Powers): void {
		this.registry.set(getPowerEquippedKey(power), true);
		this.setActivePower(power);
		MainEvents.emit(Events.PowerEquipped);
	}

	canPlayerUsePower(): boolean {
		return (
			this.getPlayerHitPoints() > 0 &&
			this.doesPlayerHavePower() &&
			!this.isPlayerFrozen() &&
			!this.isPlayerStunned() &&
			!this.isPlayerAttacking() &&
			this.getTimeSinceLastPower() > this.postPowerCooldown &&
			!this.isPlayerUsingPower()
		);
	}

	doesPlayerHavePower(): boolean {
		return (
			this.registry.get("hasWindCard") === true ||
			this.registry.get("hasIceCard") === true ||
			this.registry.get("hasFireCard") === true ||
			this.registry.get("hasSpiritCard") === true ||
			this.registry.get("hasCloudCard") === true ||
			this.registry.get("hasPlantCard") === true
		);
	}

	doesPlayerHaveSword(): boolean {
		return this.registry.get("hasSword") === true;
	}

	setPlayerFrozen(setting: boolean) {
		this.player.data?.set("freezePlayer", setting);
		if (setting === true) {
			this.freezeSound.play();
			this.player.body.stop();
			this.player.stop();
		}
	}

	setPlayerStunned(setting: boolean) {
		this.player.data?.set("stunPlayer", setting);
		this.player.body.setVelocity(0);
	}

	setPlayerInvincible(setting: boolean) {
		this.player.data?.set("invinciblePlayer", setting);
	}

	isPlayerInvincible(): boolean {
		return this.player.data?.get("invinciblePlayer");
	}

	isPlayerFrozen(): boolean {
		return this.player.data.get("freezePlayer") === true;
	}

	isPlayerStunned(): boolean {
		return this.player.data.get("stunPlayer") === true;
	}

	isPlayerBeingHit(): boolean {
		return this.player.data?.get("playerGotHit");
	}

	setPlayerBeingHit(setting: boolean): void {
		this.player.data?.set("playerGotHit", setting);
	}

	isPlayerUsingPower(): boolean {
		return (
			this.power?.anims?.getName().includes("power") &&
			this.power.visible === true &&
			this.power.anims.hasStarted
		);
	}

	getActivePower(): Powers | undefined {
		return this.registry.get(DataKeys.ActivePower);
	}

	setActivePower(power: Powers): void {
		this.registry.set(DataKeys.ActivePower, power);
	}

	playPowerSound() {
		switch (this.getActivePower()) {
			case "WindCard":
				this.windSound.play();
				break;
			case "IceCard":
				this.iceSound.play();
				break;
			case "PlantCard":
				this.plantSound.play();
				break;
		}
	}

	playPowerAnimation(): void {
		this.lastPowerAt = this.time.now;
		this.power.setVelocity(0);
		this.power.setFlipX(false);
		this.power.setAlpha(1);
		this.player.setAlpha(1);
		switch (this.playerDirection) {
			case SpriteUp:
				switch (this.getActivePower()) {
					case "PlantCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, -this.plantCardVelocity);
						this.power.anims.play("plant-power-right", true);
						this.power.setFlipX(true);
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						this.player.setVelocity(0, -this.cloudCardSpeed);
						this.player.anims.play("up-walk");
						break;
					case "SpiritCard":
						this.power.anims.play("spirit-power", true);
						this.power.setAlpha(0.5);
						this.player.setAlpha(0.5);
						this.power.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
							this.power.setAlpha(1);
							this.player.setAlpha(1);
						});
						break;
					case "FireCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, -this.firePowerVelocity);
						this.power.anims.play("fire-power-right", true);
						this.power.setFlipX(true);
						break;
					case "IceCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, -this.icePowerVelocity);
						this.power.anims.play("ice-power-right", true);
						this.power.setFlipX(true);
						break;
					case "WindCard":
						this.power.setRotation(Phaser.Math.DegToRad(-90));
						this.power.anims.play("wind-power-right", true);
						break;
				}
				break;
			case SpriteRight:
				this.power.setRotation(Phaser.Math.DegToRad(0));
				switch (this.getActivePower()) {
					case "PlantCard":
						this.power.setVelocity(this.plantCardVelocity, 0);
						this.power.anims.play("plant-power-right", true);
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						this.player.setVelocity(this.cloudCardSpeed, 0);
						this.player.anims.play("left-walk");
						this.player.setFlipX(true);
						break;
					case "SpiritCard":
						this.power.anims.play("spirit-power", true);
						this.power.setAlpha(0.5);
						this.player.setAlpha(0.5);
						this.power.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
							this.power.setAlpha(1);
							this.player.setAlpha(1);
						});
						break;
					case "FireCard":
						this.power.setVelocity(this.firePowerVelocity, 0);
						this.power.anims.play("fire-power-right", true);
						break;
					case "IceCard":
						this.power.setVelocity(this.icePowerVelocity, 0);
						this.power.anims.play("ice-power-right", true);
						break;
					case "WindCard":
						this.power.anims.play("wind-power-right", true);
						break;
				}
				break;
			case SpriteDown:
				switch (this.getActivePower()) {
					case "PlantCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, this.plantCardVelocity);
						this.power.anims.play("plant-power-right", true);
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						this.player.setVelocity(0, this.cloudCardSpeed);
						this.player.anims.play("down-walk");
						break;
					case "SpiritCard":
						this.power.anims.play("spirit-power", true);
						this.power.setAlpha(0.5);
						this.player.setAlpha(0.5);
						this.power.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
							this.power.setAlpha(1);
							this.player.setAlpha(1);
						});
						break;
					case "FireCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, this.firePowerVelocity);
						this.power.anims.play("fire-power-right", true);
						break;
					case "IceCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, this.icePowerVelocity);
						this.power.anims.play("ice-power-right", true);
						break;
					case "WindCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.anims.play("wind-power-right", true);
						break;
				}
				break;
			case SpriteLeft:
				this.power.setRotation(Phaser.Math.DegToRad(0));
				switch (this.getActivePower()) {
					case "PlantCard":
						this.power.setVelocity(-this.plantCardVelocity, 0);
						this.power.anims.play("plant-power-right", true);
						this.power.setFlipX(true);
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						this.player.setVelocity(-this.cloudCardSpeed, 0);
						this.player.anims.play("left-walk");
						break;
					case "SpiritCard":
						this.power.anims.play("spirit-power", true);
						this.power.setAlpha(0.5);
						this.player.setAlpha(0.5);
						this.power.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
							this.power.setAlpha(1);
							this.player.setAlpha(1);
						});
						break;
					case "FireCard":
						this.power.setVelocity(-this.firePowerVelocity, 0);
						this.power.anims.play("fire-power-right", true);
						this.power.setFlipX(true);
						break;
					case "IceCard":
						this.power.setVelocity(-this.icePowerVelocity, 0);
						this.power.anims.play("ice-power-right", true);
						this.power.setFlipX(true);
						break;
					case "WindCard":
						this.power.setRotation(Phaser.Math.DegToRad(-180));
						this.power.anims.play("wind-power-right", true);
						break;
				}
				break;
		}
	}

	canPlayerMove(): boolean {
		if (this.isPlayerAttacking() || this.isPlayerBeingKnockedBack) {
			return false;
		}
		if (
			this.isPlayerUsingPower() &&
			!["SpiritCard"].includes(this.getActivePower() as string)
		) {
			return false;
		}
		if (this.isPlayerStunned()) {
			return false;
		}
		if (this.isPlayerFrozen()) {
			return false;
		}
		if (this.getPlayerHitPoints() <= 0) {
			return false;
		}
		return true;
	}

	isPressingLeft(): boolean {
		return this.keyLeft.isDown || this.keyA.isDown;
	}

	isPressingRight(): boolean {
		return this.keyRight.isDown || this.keyD.isDown;
	}

	isPressingUp(): boolean {
		return this.keyUp.isDown || this.keyW.isDown;
	}

	isPressingDown(): boolean {
		return this.keyDown.isDown || this.keyS.isDown;
	}

	updatePlayerMovement(): void {
		if (!this.canPlayerMove()) {
			return;
		}

		this.player.body.setVelocity(0);

		// Set velocity based on key press
		if (this.isPressingLeft()) {
			this.player.body.setVelocityX(-this.getPlayerSpeed());
			this.playerDirection = SpriteLeft;
		} else if (this.isPressingRight()) {
			this.player.body.setVelocityX(this.getPlayerSpeed());
			this.playerDirection = SpriteRight;
		}
		if (this.isPressingUp()) {
			this.player.body.setVelocityY(-this.getPlayerSpeed());
			this.playerDirection = SpriteUp;
		} else if (this.isPressingDown()) {
			this.player.body.setVelocityY(this.getPlayerSpeed());
			this.playerDirection = SpriteDown;
		}

		this.player.body.velocity.normalize().scale(this.getPlayerSpeed());

		// Set animation based on direction (if multiple, just pick one)
		if (this.isPressingLeft()) {
			this.player.setFlipX(false);
			this.player.anims.play("left-walk", true);
			this.playWalkSound();
		} else if (this.isPressingRight()) {
			this.player.setFlipX(true);
			this.player.anims.play("left-walk", true);
			this.playWalkSound();
		} else if (this.isPressingUp()) {
			this.player.anims.play("up-walk", true);
			this.playWalkSound();
		} else if (this.isPressingDown()) {
			this.player.anims.play("down-walk", true);
			this.playWalkSound();
		} else {
			this.walkSound.stop();
			this.setPlayerIdleFrame();
		}
	}

	playWalkSound() {
		if (this.walkSound.isPlaying) {
			return;
		}
		this.walkSound.play();
	}

	getPlayerTint(): number {
		if (this.getPlayerHitPoints() === 0) {
			return 0xff0000;
		}
		if (this.isPlayerBeingHit()) {
			return 0xff0000;
		}
		if (this.isPlayerFrozen()) {
			return 0x0000ff;
		}
		return 0;
	}

	updatePlayerTint() {
		const tint = this.getPlayerTint();
		if (tint) {
			this.player.setTint(tint);
		} else {
			this.player.clearTint();
		}
	}

	updatePlayer(): void {
		this.updatePlayerTint();
		this.registry.set("playerX", this.player.x);
		this.registry.set("playerY", this.player.y);

		this.updateSwordHitbox();
		this.updatePowerHitboxPosition();
		this.updatePlayerMovement();

		const isMoving =
			this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0;
		if (isMoving) {
			this.maybeChangeRoom();
			this.maybePickUpItem();
		}
	}

	setPlayerIdleFrame() {
		// If the player stops moving, stop animations and reset the image to an idle frame in the correct direction.
		this.player.setFlipX(false);
		switch (this.playerDirection) {
			case SpriteLeft:
				this.player.anims.play("idle-left", true);
				return;
			case SpriteRight:
				this.player.setFlipX(true);
				this.player.anims.play("idle-left", true);
				return;
			case SpriteUp:
				this.player.anims.play("idle-up", true);
				return;
			case SpriteDown:
				this.player.anims.play("idle-down", true);
				return;
		}
	}
}
