import { Scene } from "phaser";
import { soundKeys, musicKeys } from "../lib/sound";
import { config } from "../lib/config";
import { MainEvents } from "../lib/MainEvents";
import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "../monsters/BaseMonster";
import {
	Auras,
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
	getTilesInRoom,
	getRooms,
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
	Region,
	Sound,
	isPointInRegion,
	hasXandY,
	getButtonNames,
	vibrate,
	auraOrder,
	isAuraActive,
	getAuraDescription,
	getCardNameForPower,
	getActiveAuras,
	activateAura,
	knockBack,
	addVisitedRoom,
	saveGameKey,
	getDataFromRegistry,
	saveDataToRegistry,
	savePlayerPositionToRegistry,
	getPlayerCoordinates,
	getSavedDataPlayerPosition,
	isSpriteInsideSolidTile,
	createShadowSprite,
	isSprite,
	MapMetaKeys,
	getPropertiesFromPoint,
	isPlayerInMetaArea,
	getDoorsInRoom,
	areMonstersInRoom,
	LockableDoorSpriteIndices,
} from "../lib/shared";
import { MonsterCreator } from "../lib/MonsterCreator";
import {
	SpriteComponent,
	MapComponent,
	ItemComponent,
	getMap,
	setActiveRoom,
	getActiveRoom,
	getPlayerOrThrow,
	getSpriteOrThrow,
} from "../lib/components";

export class Game extends Scene {
	debugGraphic: Phaser.GameObjects.Graphics | undefined;
	layerDebugGraphic: Phaser.GameObjects.Graphics | undefined;
	power: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	healEffect: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | undefined;
	statusIcon: Phaser.GameObjects.Sprite | undefined;
	statusBounce: Phaser.Tweens.Tween | undefined;
	attackSprite: Phaser.GameObjects.Sprite;
	enemyManager: EnemyManager;
	monsterCreator: MonsterCreator;
	enemyCollider: Phaser.Physics.Arcade.Collider;
	maskGraphics: Phaser.GameObjects.Graphics;
	mask: Phaser.Display.Masks.GeometryMask;
	plantCardSegments: Phaser.GameObjects.Image[] = [];

	backgroundMusic: Sound | undefined;
	attackSound: Sound;
	destroySound: Sound;
	hitSound: Sound;
	walkSound: Sound;
	saveSound: Sound;
	healSound: Sound;
	windSound: Sound;
	iceSound: Sound;
	holyLoopSound: Sound;
	appearSound: Sound;
	rockDestroySound: Sound;
	freezeSound: Sound;
	plantSound: Sound;

	isGameOver: boolean = false;
	isMaskActive: boolean = false;
	hasPlayerMovedSinceAppearing: boolean = false;
	lastAttackedAt: number = 0;
	lastPowerAt: number = 0;
	lastDialogData: { heading: string; text?: string } | undefined;
	playerDirection: SpriteDirection = SpriteDown;
	enteredRoomAt: number = 0;
	isPlayerBeingKnockedBack: boolean = false;
	isPlayerCheatInvincible: boolean = false;
	isPlayerAppearingInvincible: boolean = false;
	isPlayerBeingHitInvincible: boolean = false;
	heartCardTimer: Phaser.Time.TimerEvent | undefined;
	cachedTilesInRoom: Phaser.Tilemaps.Tile[] | undefined;

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

	landLayer: Phaser.Tilemaps.TilemapLayer;
	hiddenRoomLayer: Phaser.Tilemaps.TilemapLayer;
	aboveLayer: Phaser.Tilemaps.TilemapLayer;
	stuffLayer: Phaser.Tilemaps.TilemapLayer;
	createdFinalDoors: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	createdDoors: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	createdSavePoints: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	createdTiles: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	spawnPoints: Phaser.Types.Tilemaps.TiledObject[] = [];

	constructor() {
		super("Game");
	}

	create(saveData: SaveData | undefined) {
		this.hasPlayerMovedSinceAppearing = false;
		this.lastAttackedAt = 0;
		this.lastPowerAt = 0;
		this.playerDirection = SpriteDown;
		this.enteredRoomAt = 0;
		this.isPlayerBeingKnockedBack = false;
		this.isPlayerCheatInvincible = false;
		this.isPlayerAppearingInvincible = false;
		this.isPlayerBeingHitInvincible = false;
		this.isGameOver = false;

		this.cameras.main.fadeIn(config.sceneStartFadeTime);
		const map = this.make.tilemap({ key: "map" });
		MapComponent.set("map", map);
		const tilesetTile = map.addTilesetImage("Dungeon_Tiles", "dungeon_tiles");
		const tilesetSprite = map.addTilesetImage(
			"Dungeon_Tiles_Sprites",
			"dungeon_tiles_sprites"
		);
		if (!tilesetTile || !tilesetSprite) {
			throw new Error("Could not make tileset");
		}

		this.setUpVisibilityMask();

		const spawnPoint = this.getSpawnPoint();
		const tempSpawnPoint = this.getTempSpawnPoint();
		const playerCoordinates = (() => {
			if (tempSpawnPoint) {
				return tempSpawnPoint;
			}
			if (saveData) {
				return getPlayerCoordinates(saveData, map);
			}
			return spawnPoint;
		})();
		this.createPlayer(
			playerCoordinates?.x ?? spawnPoint.x,
			playerCoordinates?.y ?? spawnPoint.y
		);
		const player = getPlayerOrThrow();
		this.attackSprite = this.add.sprite(
			player.body.center.x,
			player.body.center.y,
			"character",
			"sword-up-0.png"
		);
		this.attackSprite.setDepth(4);
		this.attackSprite.setVisible(false);

		this.enemyManager = new EnemyManager(this);
		this.monsterCreator = new MonsterCreator(
			this,
			this.enemyManager,
			this.saveGame.bind(this)
		);

		MainEvents.on(
			Events.MonsterDying,
			(monster: { body: { center: { x: number; y: number } } }) => {
				if (
					this.getPotionTotalCount() === 0 ||
					this.getPotionCount() === this.getPotionTotalCount()
				) {
					return;
				}
				const randomNumber = Phaser.Math.Between(1, 100);
				if (randomNumber <= config.chanceToDropPotion) {
					this.addPotionVialAt(monster.body.center.x, monster.body.center.y);
				}
			}
		);

		this.landLayer = this.createTileLayer("Background", tilesetTile, 0);
		this.hiddenRoomLayer = this.createTileLayer("HiddenRooms", tilesetTile, 0);

		// Handle tiles that hurt the player
		this.physics.add.collider(
			this.landLayer,
			player,
			(_, tile) => {
				if (!isTileWithPropertiesObject(tile)) {
					return;
				}
				if (tile.properties.hurts) {
					this.enemyHitPlayer();
				}
				if (tile.properties.deadly) {
					this.enemyHitPlayer({ damage: 10 });
				}
			},
			(_, tile) => {
				if (
					isTileWithPropertiesObject(tile) &&
					(tile.properties.isWater || tile.properties.isLava) &&
					isAuraActive(this.registry, "FishCard")
				) {
					return false;
				}
				if (
					isTileWithPropertiesObject(tile) &&
					tile.properties.affectedBySpiritCard &&
					this.isPlayerUsingPower() &&
					this.getActivePower() === "SpiritCard"
				) {
					return false;
				}
				if (player.data.get("isPlantCardGrappleActive")) {
					return false;
				}
				return true;
			}
		);
		this.physics.add.collider(
			this.hiddenRoomLayer,
			player,
			(_, tile) => {
				if (!isTileWithPropertiesObject(tile)) {
					return;
				}
				if (tile.properties.hurts) {
					this.enemyHitPlayer();
				}
				if (tile.properties.deadly) {
					this.enemyHitPlayer({ damage: 10 });
				}
			},
			(_, tile) => {
				if (
					isTileWithPropertiesObject(tile) &&
					(tile.properties.isWater || tile.properties.isLava) &&
					isAuraActive(this.registry, "FishCard")
				) {
					return false;
				}
				if (
					isTileWithPropertiesObject(tile) &&
					tile.properties.affectedBySpiritCard &&
					this.isPlayerUsingPower() &&
					this.getActivePower() === "SpiritCard"
				) {
					return false;
				}
				if (player.data.get("isPlantCardGrappleActive")) {
					return false;
				}
				return true;
			}
		);

		this.physics.add.collider(
			this.hiddenRoomLayer,
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
		this.aboveLayer = this.createTileLayer("Above", tilesetTile, 10);
		this.stuffLayer = this.createTileLayer("Stuff", tilesetTile, 0);
		this.physics.add.collider(this.stuffLayer, player, undefined, () => {
			if (this.isPlayerUsingPower() && this.getActivePower() === "SpiritCard") {
				return false;
			}
			if (player.data.get("isPlantCardGrappleActive")) {
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

		this.physics.add.collider(this.createdFinalDoors, player, (tile) => {
			this.checkFinalDoor(tile);
		});

		// Enemies collide with doors but players can pass through them.
		this.physics.add.collider(this.createdDoors, this.enemyManager.enemies);

		MainEvents.on(Events.EnemyHitPlayer, () => {
			this.enemyHitPlayer();
		});

		MainEvents.on(Events.ConfusePlayer, () => {
			if (this.isPlayerInvincible() || this.isPlayerHiddenInvincible()) {
				return;
			}
			this.makePlayerConfused();
		});

		let isSaving = false;
		this.physics.add.collider(
			player,
			this.createdSavePoints,
			(_, savePoint) => {
				if (!isDynamicSprite(savePoint)) {
					return;
				}
				if (isSaving) {
					return;
				}
				const lastSaved = savePoint.data.get("savedAt");
				if (lastSaved && this.time.now - lastSaved < config.saveCooldown) {
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
				this.saveSound.play();
				this.saveGame();
			}
		);

		this.enemyCollider = this.physics.add.collider(
			player,
			this.enemyManager.enemies,
			(player, enemy) => {
				if (!isDynamicSprite(player) || !isDynamicSprite(enemy)) {
					return;
				}
				if (enemy.data.get("isPlantCardGrappleActive")) {
					enemy?.emit(Events.MonsterStun, false);
					enemy.data.set("isPlantCardGrappleActive", false);
					this.#endPowerUse();
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
				if (this.isPlayerInvincible() || this.isPlayerHiddenInvincible()) {
					return false;
				}
				if (!enemy.visible || !enemy.active) {
					return false;
				}
				// Dying enemies should be stunned but that doesn't appear to be true
				// here for some reason so we check isDying and isStunned here also.
				if ("isDying" in enemy && enemy.isDying) {
					return false;
				}
				if ("isStunned" in enemy && enemy.isStunned) {
					return false;
				}
				if (enemy.data?.get(DataKeys.Stunned)) {
					return false;
				}
				if (enemy.data?.get(DataKeys.IsHarmless)) {
					return false;
				}
				return true;
			}
		);

		this.physics.add.overlap(
			getSpriteOrThrow("sword"),
			this.enemyManager.enemies,
			(_, enemy) => {
				if (!isDynamicSprite(enemy)) {
					throw new Error("Enemy sprite is not valid for hitboxing with sword");
				}
				this.playerHitEnemy(enemy);
			},
			() => {
				return getSpriteOrThrow("sword").data.get(DataKeys.SwordAttackActive);
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
		this.physics.add.overlap(this.power, this.hiddenRoomLayer, (_, tile) => {
			if (!isTilemapTile(tile)) {
				return;
			}
			if (!this.isPlayerUsingPower() || this.getActivePower() !== "IceCard") {
				return;
			}
			this.freezeWaterTile(tile);
		});
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
			if (
				setting === true &&
				(this.isPlayerInvincible() || this.isPlayerHiddenInvincible())
			) {
				return;
			}
			this.setPlayerFrozen(setting);
		});

		this.recordSecretRoomsTotal();
	}

	setUpVisibilityMask() {
		this.maskGraphics = this.add.graphics();
		this.maskGraphics.setDepth(-1);
		this.mask = this.maskGraphics.createGeometryMask();
	}

	getMaskableObjects(): Array<
		| Phaser.Tilemaps.TilemapLayer
		| Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
		| Phaser.Physics.Arcade.Sprite
		| Phaser.GameObjects.Sprite
	> {
		return [
			this.landLayer,
			this.stuffLayer,
			this.hiddenRoomLayer,
			...this.createdDoors,
			...this.createdTiles,
			...ItemComponent.values(),
			...this.enemyManager.enemies.getChildren().filter(isSprite),
		];
	}

	enableMask() {
		this.isMaskActive = true;
		this.getMaskableObjects().forEach((obj) => {
			obj.setMask(this.mask);
		});
	}

	disableMask() {
		this.isMaskActive = false;
		this.getMaskableObjects().forEach((obj) => {
			obj.clearMask();
		});
	}

	updateVisibilityMask() {
		this.maskGraphics.clear();
		if (!this.isMaskActive) {
			return;
		}
		const player = getPlayerOrThrow();
		this.maskGraphics.fillCircle(
			player.body.center.x,
			player.body.center.y,
			config.visibilityMaskRadius
		);
	}

	restartStatusBounce() {
		this.statusBounce?.destroy();
		if (!this.statusIcon) {
			return;
		}
		this.statusBounce = this.tweens.add({
			targets: this.statusIcon,
			y: "+=6",
			ease: "Exponential.InOut",
			yoyo: true,
			repeat: -1,
			duration: 400,
		});
	}

	makePlayerConfused() {
		if (this.isPlayerConfused()) {
			return;
		}
		this.setPlayerConfused(true);
		this.statusIcon?.destroy();
		const player = getPlayerOrThrow();
		const statusIcon = this.add.sprite(
			player.body.center.x + 1,
			player.body.center.y - 1,
			"status-icons",
			3
		);
		this.statusIcon = statusIcon;
		this.statusIcon.setDepth(5);
		this.updateStatusIcon();
		this.time.addEvent({
			repeat: 0,
			delay: config.playerConfusedTime,
			callback: () => {
				this.setPlayerConfused(false);
				this.statusBounce?.destroy();
				this.statusIcon?.destroy();
			},
		});
	}

	recordSecretRoomsTotal() {
		const secretRoomsCount = getRooms(getMap()).filter((room) =>
			room.name.includes("Secret")
		).length;
		saveDataToRegistry(this.registry, "SecretRoomsTotal", secretRoomsCount);
	}

	playMusicForRegion(region: Region) {
		this.backgroundMusic?.stop();
		this.backgroundMusic = this.getMusicForRegion(region);
		this.backgroundMusic?.play();
	}

	getMusicForRegion(region: Region) {
		switch (region) {
			case "MK":
				return this.sound.add(musicKeys.mountainKingdom, {
					loop: true,
					volume: 0.5,
				});
			case "IK":
				return this.sound.add(musicKeys.iceKingdom, {
					loop: true,
					volume: 0.9,
				});
			case "FK":
				return this.sound.add(musicKeys.fireKingdom, {
					loop: true,
					volume: 0.8,
				});
			case "SK":
				return this.sound.add(musicKeys.spiritKingdom, {
					loop: true,
					volume: 0.7,
				});
			case "PK":
				return this.sound.add(musicKeys.plantKingdom, {
					loop: true,
					volume: 0.6,
				});
			case "CK":
				return this.sound.add(musicKeys.cloudKingdom, {
					loop: true,
					volume: 0.7,
				});
			case "FB":
				return this.sound.add(musicKeys.finalBoss, {
					loop: true,
					volume: 0.7,
				});
		}
	}

	showNotice(text: string, hideAfter: number) {
		this.scene.launch("Dialog", {
			heading: text,
			hideAfter,
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

	checkFinalDoor(
		door: Phaser.Tilemaps.Tile | Phaser.Types.Physics.Arcade.GameObjectWithBody
	) {
		if (this.isPlayerStunned()) {
			return;
		}
		if (this.getKeyCount() < 6) {
			this.showDialog({
				heading: "Golden door",
				text: `The survivors of the kingdoms are trapped behind this door but it requires six keys to open. You have ${this.getKeyCount()} keys.`,
			});
			return;
		}

		if (!("name" in door)) {
			throw new Error("Final door has no name");
		}

		if ("name" in door && door.name !== "FinalDoor") {
			return;
		}

		this.sound.stopAll();
		const destinationTile = getMap().findObject(
			"FinalDoor",
			(obj: unknown) => getObjectId(obj) === config.finalBossDoorInside
		);
		if (!destinationTile) {
			throw new Error("Hit door without destination tile");
		}
		const destinationDirection = SpriteDown;
		const [destinationX, destinationY] = getDoorDestinationCoordinates(
			destinationTile,
			destinationDirection
		);
		const fadeTime = config.roomTransitionFadeTime;
		this.setPlayerStunned(true);
		this.setPlayerHiddenInvincible(true);
		this.cameras.main.fadeOut(
			fadeTime,
			0,
			0,
			0,
			(_: unknown, progress: number) => {
				if (progress === 1) {
					this.respawnRegion(getRegionFromRoomName("FB"));
					this.movePlayerToPoint(destinationX, destinationY);
					this.playMusicForRegion(getRegionFromRoomName("FB"));
					this.setPlayerHiddenInvincible(false);
					this.setPlayerStunned(false);
					this.cameras.main.fadeIn(fadeTime);
				}
			}
		);
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

		this.setUpControls();
		this.setUpDebugMode();
	}

	setUpControls() {
		if (!this.input.keyboard) {
			throw new Error("No keyboard controls could be found");
		}
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

		this.input.gamepad?.on("down", () => {
			if (this.input.gamepad?.pad1?.A) {
				if (this.canPlayerAttack()) {
					this.activateAttack();
				}
			}
			if (this.input.gamepad?.pad1?.X) {
				if (this.canPlayerUsePower()) {
					this.activatePower();
				}
			}
			if (this.input.gamepad?.pad1?.Y) {
				this.usePotion();
			}
		});
	}

	setUpDebugMode() {
		if (!this.input.keyboard) {
			throw new Error("No keyboard controls could be found");
		}
		const cheatCode = "lostcard";
		let successfulCheatCode = "";
		let isCheatMode = false;
		this.input.keyboard.on("keydown", (data: { key: string }) => {
			if (cheatCode.startsWith(successfulCheatCode + data.key)) {
				successfulCheatCode = successfulCheatCode + data.key;
				if (cheatCode === successfulCheatCode) {
					this.appearSound.play();
					this.showNotice("Debug mode", 1500);
					isCheatMode = true;
				}
			} else {
				successfulCheatCode = "";
			}
		});

		this.input.keyboard.on("keydown-ONE", () => {
			if (!isCheatMode) {
				return;
			}
			// Cheat: show hitboxes
			if (this.debugGraphic) {
				this.debugGraphic.destroy();
				this.debugGraphic = undefined;
				this.layerDebugGraphic?.destroy();
				this.layerDebugGraphic = undefined;
			} else {
				this.debugGraphic = this.physics.world.createDebugGraphic();
				this.layerDebugGraphic = this.add.graphics();
				this.hiddenRoomLayer.renderDebug(this.layerDebugGraphic, {
					tileColor: null,
					collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200),
					faceColor: new Phaser.Display.Color(40, 39, 37, 255),
				});
				this.landLayer.renderDebug(this.layerDebugGraphic, {
					tileColor: null,
					collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200),
					faceColor: new Phaser.Display.Color(40, 39, 37, 255),
				});
			}
		});
		this.input.keyboard.on("keydown-TWO", () => {
			if (!isCheatMode) {
				return;
			}
			if (this.getPlayerHitPoints() <= 0) {
				return;
			}
			// Cheat: restore all HP
			this.restorePlayerHitPoints();
		});
		this.input.keyboard.on("keydown-THREE", () => {
			if (!isCheatMode) {
				return;
			}
			// Cheat: gain all items
			this.equipSword();
			this.equipPower("WindCard");
			this.equipPower("IceCard");
			this.equipPower("PlantCard");
			this.equipPower("FireCard");
			this.equipPower("SpiritCard");
			this.equipPower("CloudCard");
			this.setPotionTotalCount(10);
			this.setPotionCount(10);
			this.setKeyCount(6);
		});

		this.input.keyboard.on("keydown-FOUR", () => {
			if (!isCheatMode) {
				return;
			}
			// Cheat: gain all auras
			this.equipSword();
			auraOrder.forEach((card) => {
				this.equipAura(card);
			});
		});

		this.input.keyboard.on("keydown-FIVE", () => {
			if (!isCheatMode) {
				return;
			}
			// Cheat: be invincible
			this.isPlayerCheatInvincible = true;
		});

		this.input.keyboard.on("keydown-SIX", () => {
			if (!isCheatMode) {
				return;
			}
			this.scene.pause("Game");
			this.scene.launch("Debug");
		});
		this.input.keyboard.on("keydown-SEVEN", () => {
			if (!isCheatMode) {
				return;
			}
			this.showNotice("Printed save data", 1500);
			const saveData = loadSavedData();
			console.log(JSON.stringify(saveData));
		});
		this.input.keyboard.on("keydown-EIGHT", () => {
			if (!isCheatMode) {
				return;
			}
			if (this.isMaskActive) {
				this.disableMask();
			} else {
				this.enableMask();
			}
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
		const totalHitPoints = this.getPlayerTotalHitPoints();
		if (this.getPlayerHitPoints() === totalHitPoints) {
			return;
		}

		// Use Potion
		this.healSound.play();
		if (this.healEffect) {
			this.healEffect.destroy();
		}
		const player = getPlayerOrThrow();
		const healEffect = this.add.sprite(
			player.body.center.x + 1,
			player.body.center.y - 1,
			"icons3",
			2
		);
		this.physics.add.existing(healEffect);
		if (!isDynamicSprite(healEffect)) {
			throw new Error("Heal effect is not a sprite");
		}
		this.healEffect = healEffect;
		this.healEffect.setDepth(5);
		this.healEffect.setAlpha(0.5);
		this.healEffect.setScale(0.2);

		this.tweens.add({
			targets: this.healEffect,
			scale: 2,
			duration: 500,
			onComplete: () => {
				this.healEffect?.destroy();
			},
		});

		this.setPotionCount(potionCount - 1);
		this.restorePlayerHitPoints();
	}

	freezeWaterTile(tile: Phaser.Tilemaps.Tile) {
		if (!isTileWithPropertiesObject(tile) || !tile.properties.isWater) {
			return;
		}
		this.freezeSound.play();
		const iceTileFrame = 284;
		getMap().removeTile(tile, iceTileFrame);
		tile.properties.isIce = true;
		this.time.addEvent({
			delay: config.iceMeltTime,
			callback: () => this.meltFrozenTile(tile),
		});
	}

	meltFrozenTile(tile: Phaser.Tilemaps.Tile) {
		if (!isTileWithPropertiesObject(tile) || !tile.properties.isWater) {
			return;
		}
		const player = getPlayerOrThrow();
		if (this.physics.overlapTiles(player, [tile])) {
			// Do not melt the tile we stand on.
			this.time.addEvent({
				delay: config.iceMeltTime,
				callback: () => this.meltFrozenTile(tile),
			});
			return;
		}

		getMap().removeTile(tile);
		getMap().putTileAt(tile, tile.x, tile.y, true, tile.layer.name);
		const activeRoom = getActiveRoom();
		if (activeRoom && !isPointInRoom(tile.x, tile.y, activeRoom)) {
			hideAllRoomsExcept(
				getMap(),
				this.enemyManager.enemies,
				[
					...ItemComponent.values(),
					...this.createdTiles,
					...this.createdDoors,
					...this.createdFinalDoors,
					...this.createdSavePoints,
				],
				activeRoom,
				this.spawnPoints
			);
		}
		this.landLayer.setCollisionByProperty({ collides: true });
		this.hiddenRoomLayer.setCollisionByProperty({ collides: true });
	}

	turnOffAllLanterns() {
		this.createdSavePoints.forEach((savePoint) => {
			savePoint.setTexture("dungeon_tiles_sprites", 1322);
		});
	}

	activateAttack() {
		const player = getPlayerOrThrow();
		player.body.setVelocity(0);
		getSpriteOrThrow("sword").data.set(DataKeys.SwordAttackActive, true);
		this.updateSwordHitbox();

		getSpriteOrThrow("sword").setRotation(Phaser.Math.DegToRad(0));

		// If the animation hasn't started, start it.
		// Do not move the player hitbox when attacking; since it changes size it
		// causes accidental hits as it wiggles around. Instead we use a separate
		// sprite for the attack animation and leave the player and its hitbox
		// alone.
		this.attackSprite.setVisible(true);
		this.attackSprite.setPosition(player.body.center.x, player.body.center.y);
		player.setVisible(false);
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
			getSpriteOrThrow("sword").data.set(DataKeys.SwordAttackActive, false);
			this.attackSprite.setVisible(false);
			player.setVisible(true);
			this.lastAttackedAt = this.time.now;
		});
	}

	activatePower() {
		const player = getPlayerOrThrow();
		player.body.setVelocity(0);
		player.anims.stop();
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
		if (this.getPlayerHitPoints() === 0) {
			return;
		}
		localStorage.setItem(saveGameKey, JSON.stringify(this.getSaveData()));
		MainEvents.emit(Events.GameSaved);
	}

	getSaveData() {
		return this.registry.getAll();
	}

	getTilesetKeyByName(name: string): string | undefined {
		switch (name) {
			case "npcs":
				return "npcs";
			case "Icons":
				return "icons4";
			case "Cards":
				return "cards";
		}
	}

	createSavePoints() {
		this.createdSavePoints = createSpritesFromObjectLayer(
			getMap(),
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
			getMap(),
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
		this.createdDoors = createSpritesFromObjectLayer(getMap(), "Doors", {
			getTilesetKeyByName: this.getTilesetKeyByName.bind(this),
			callback: this.recordObjectIdOnSprite.bind(this),
		}).map((item) => {
			item.body.pushable = false;
			item.body.setSize(item.body.width + 1, item.body.height + 1);
			return item;
		});
	}

	createAppearingTiles() {
		this.createdTiles = createSpritesFromObjectLayer(getMap(), "Transients", {
			getTilesetKeyByName: this.getTilesetKeyByName.bind(this),
		}).map((sprite) => {
			sprite.body.setSize(sprite.body.width * 0.75, sprite.body.height * 0.75);
			return sprite;
		});
	}

	createItems() {
		ItemComponent.clear();
		createSpritesFromObjectLayer(getMap(), "Items", {
			filterCallback: this.shouldCreateLayerObject.bind(this),
			callback: this.recordObjectIdOnSprite.bind(this),
			getTilesetKeyByName: this.getTilesetKeyByName.bind(this),
		}).forEach((item) => {
			ItemComponent.set(item.data.get(DataKeys.ItemObjectId), item);
		});
	}

	shouldCreateLayerObject(
		layerObject: Phaser.Types.Tilemaps.TiledObject
	): boolean {
		if (!layerObject.id) {
			return true;
		}
		const itemsRemoved: Array<number> =
			getDataFromRegistry(this.registry, "itemsRemoved") ?? [];
		return !itemsRemoved.includes(layerObject.id);
	}

	recordObjectIdOnSprite(
		layerObject: Phaser.Types.Tilemaps.TiledObject,
		sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	): void {
		sprite.data.set(DataKeys.ItemObjectId, layerObject.id);
	}

	createTileLayer(
		layerName: string,
		tileset: Phaser.Tilemaps.Tileset,
		depth: number
	): Phaser.Tilemaps.TilemapLayer {
		const layer = getMap().createLayer(layerName, tileset, 0, 0);
		if (!layer) {
			throw new Error(`Could not open tileset layers for '${layerName}'`);
		}
		layer.setDepth(depth);
		layer.setCollisionByProperty({ collides: true });
		return layer;
	}

	setUpCamera(): void {
		this.cameras.main.setBackgroundColor("black");

		// Focus the camera on the room that the player currently is in.
		const tileWidth = 16;
		const tileHeight = 16;
		const player = getPlayerOrThrow();
		const room = getRoomForPoint(
			getMap(),
			player.x + tileWidth,
			player.y + tileHeight
		);
		this.playMusicForRegion(getRegionFromRoomName(room.name));
		this.respawnRegion(getRegionFromRoomName(room.name));
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

		const player = getPlayerOrThrow();
		camera.startFollow(player);

		setActiveRoom(room);
		this.enteredRoomAt = this.time.now;
		hideAllRoomsExcept(
			getMap(),
			this.enemyManager.enemies,
			[
				...ItemComponent.values(),
				...this.createdTiles,
				...this.createdDoors,
				...this.createdFinalDoors,
				...this.createdSavePoints,
			],
			room,
			this.spawnPoints
		);

		this.createEnemiesInRoom();

		this.closeGatePillars();

		this.cacheTilesInRoom();

		this.toggleLightsInRoom();

		this.maybeLockDoors();

		this.recordRoomVisit(room.name);
	}

	maybeLockDoors() {
		const player = getPlayerOrThrow();
		if (
			isPlayerInMetaArea(getMap(), player, MapMetaKeys.DoorLockAreaName) &&
			areMonstersInRoom(this.enemyManager)
		) {
			this.lockDoorsInRoom();
		}
	}

	toggleLightsInRoom() {
		const player = getPlayerOrThrow();
		if (isPlayerInMetaArea(getMap(), player, MapMetaKeys.DarknessAreaName)) {
			this.enableMask();
		} else {
			this.disableMask();
		}
	}

	lockDoorsInRoom() {
		const activeRoom = getActiveRoom();
		if (!activeRoom) {
			return;
		}
		// Find all doors in room
		const doorsInRoom = getDoorsInRoom(this.createdDoors, activeRoom);
		doorsInRoom.forEach((door) => {
			const currentFrame = parseInt(door.frame.name);
			if (!LockableDoorSpriteIndices.includes(currentFrame)) {
				return;
			}
			// Replace each door sprite with appropriate angle locked sprite
			door.setFrame(currentFrame + 1);
			// Mark each door as locked
			door.data.set(DataKeys.LockedDoor, true);
		});
	}

	unlockDoorsInRoom() {
		const activeRoom = getActiveRoom();
		if (!activeRoom) {
			return;
		}
		// Find all doors in room
		const doorsInRoom = getDoorsInRoom(this.createdDoors, activeRoom);
		doorsInRoom.forEach((door) => {
			if (!door.data.get(DataKeys.LockedDoor)) {
				return;
			}
			// Replace each door sprite with appropriate angle unlocked sprite
			door.setFrame(parseInt(door.frame.name) - 1);
			// Mark each door as unlocked
			door.data.set(DataKeys.LockedDoor, false);
		});
	}

	recordRoomVisit(roomName: string) {
		addVisitedRoom(this.registry, roomName);
		if (!roomName.includes("Secret")) {
			return;
		}
		const secretRoomsFound: string[] =
			getDataFromRegistry(this.registry, "SecretRoomsFound") ?? [];
		if (secretRoomsFound.some((foundRoomName) => foundRoomName === roomName)) {
			return;
		}
		secretRoomsFound.push(roomName);
		saveDataToRegistry(this.registry, "SecretRoomsFound", secretRoomsFound);
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
					duration: config.gateCloseSpeed * 2,
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
		const player = getPlayerOrThrow();
		const distance = Phaser.Math.Distance.BetweenPoints(
			gatePosition,
			player.body.center
		);
		let gateAwareDistance = config.gateAwareDistance;
		if (gatePillar.data?.get("gateAwareDistance")) {
			gateAwareDistance = gatePillar.data?.get("gateAwareDistance");
		}
		if (distance > gateAwareDistance) {
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
		let gateCloseSpeed =
			gatePillar.data.get("gateCloseSpeed") ?? config.gateCloseSpeed;
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
						duration: gateCloseSpeed,
					});
				}
			});
	}

	handleCollideDoor(door: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		const destinationId = door.data.get("doorto");
		if (!destinationId) {
			throw new Error("Hit door without destination id");
		}

		const doorDirection = door.data.get("doordirection");
		if (doorDirection === undefined) {
			throw new Error("Door has no destination direction");
		}

		if (this.playerDirection !== doorDirection) {
			return;
		}

		const player = getPlayerOrThrow();
		player.body.stop();
		if (door.data.get(DataKeys.LockedDoor)) {
			return;
		}
		const destinationTile = getMap().findObject(
			"Doors",
			(obj: unknown) => getObjectId(obj) === destinationId
		);
		if (!destinationTile) {
			throw new Error("Hit door without destination tile");
		}
		const destinationDoor = this.createdDoors.find((door) => {
			return destinationTile.id === door.data.get(DataKeys.ItemObjectId);
		});
		const destinationDirection = destinationDoor?.data.get("doordirection");
		if (destinationDirection === undefined) {
			throw new Error("Hit door without destination direction");
		}

		// if the player enters a door, teleport them just past the corresponding door
		const [destinationX, destinationY] = getDoorDestinationCoordinates(
			destinationTile,
			destinationDirection
		);

		const room = getRoomForPoint(getMap(), destinationX, destinationY);
		if (room.name === getActiveRoom()?.name) {
			return;
		}

		const activeRoom = getActiveRoom();
		const previousRegion = activeRoom
			? getRegionFromRoomName(activeRoom.name)
			: undefined;
		const newRegion = getRegionFromRoomName(room.name);
		const isRegionTransition = previousRegion !== newRegion;
		const fadeTime = isRegionTransition
			? config.regionTransitionFadeTime
			: config.roomTransitionFadeTime;

		MainEvents.emit(Events.LeavingRoom);
		this.setPlayerStunned(true);
		this.setPlayerHiddenInvincible(true);
		this.cameras.main.fadeOut(
			fadeTime,
			0,
			0,
			0,
			(_: unknown, progress: number) => {
				if (progress === 1) {
					if (isRegionTransition && previousRegion) {
						this.showNotice(
							getRegionName(newRegion),
							config.newRegionMessageTime
						);
						this.playMusicForRegion(getRegionFromRoomName(room.name));
						this.respawnRegion(newRegion);
					}
					this.movePlayerToPoint(destinationX, destinationY);
					this.setPlayerStunned(false);
					this.setPlayerHiddenInvincible(false);
					this.cameras.main.fadeIn(fadeTime);
					MainEvents.emit(Events.EnteredRoom);
				}
			}
		);
	}

	respawnRegion(region: Region) {
		this.enemyManager.enemies.clear(true, true);
		this.spawnPoints =
			getMap().filterObjects("Creatures", (point) => {
				if (!hasXandY(point)) {
					return false;
				}
				return isPointInRegion(getMap(), point.x, point.y, region);
			}) ?? [];
	}

	checkForGameOver() {
		if (this.getPlayerHitPoints() <= 0 && !this.isGameOver) {
			this.setPlayerHiddenInvincible(true);
			const player = getPlayerOrThrow();
			player.stop();
			player.body.setVelocity(0);
			this.enemyCollider.active = false;
			this.time.addEvent({
				delay: config.preGameOverTime,
				callback: () => {
					this.gameOver();
				},
			});
		}
	}

	update() {
		this.checkForGameOver();

		const player = getPlayerOrThrow();
		if (this.isPlayerUsingPower() && this.getActivePower() === "PlantCard") {
			this.#drawPlantCardLine(
				new Phaser.Math.Vector2(this.power.x, this.power.y)
			);
		}
		this.enemyManager.enemies.getChildren().forEach((enemy) => {
			if (!isDynamicSprite(enemy)) {
				return;
			}
			if (enemy.data.get("isPlantCardGrappleActive")) {
				const distance = Phaser.Math.Distance.BetweenPoints(
					enemy.body.center,
					player.body.center
				);
				if (distance < 30) {
					enemy.emit(Events.MonsterStun, false);
					enemy.data.set("isPlantCardGrappleActive", false);
					this.#endPowerUse();
				}
			}

			// Note that enemies should avoid rendering if they are not active!
			enemy.update();
		});
		this.updatePlayer();
		this.updateRoom();
		this.updateGatePillars();
		this.updateVisibilityMask();
	}

	updateRoom() {
		this.checkForPowerHitTiles();
		this.updateAppearingTiles();
	}

	destroyCreatedTile(tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		this.cameras.main.shake(200, 0.004);
		vibrate(this, 1, 200);

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
		const player = getPlayerOrThrow();
		if (
			player.data.get("isPlantCardGrappleActive") ||
			this.power.anims.isPaused
		) {
			return;
		}

		// The plant card moves you next to the target, over any land obstacle
		player.data.set("isPlantCardGrappleActive", true);
		this.power.anims.pause();
		this.power.body.stop();
		this.#movePlayerTowardTileWithPlantCard(tile.body.center);
	}

	#movePlayerTowardTileWithPlantCard(tile: { x: number; y: number }): void {
		const player = getPlayerOrThrow();
		const lastSafePosition = new Phaser.Math.Vector2(player.x, player.y);
		const velocity = createVelocityForDirection(
			config.plantCardVelocity,
			this.playerDirection
		);
		player.body.setVelocity(velocity.x, velocity.y);
		let lastDistance = Phaser.Math.Distance.BetweenPoints(
			tile,
			player.body.center
		);
		let isMoving = true;
		this.time.addEvent({
			delay: 50,
			callback: () => {
				if (!isMoving) {
					return;
				}
				this.#drawPlantCardLine(new Phaser.Math.Vector2(tile.x, tile.y));
				const distance = Phaser.Math.Distance.BetweenPoints(
					tile,
					player.body.center
				);
				if (
					distance < 10 ||
					distance > lastDistance ||
					distance === lastDistance
				) {
					player.body.stop();
					player.data.set("isPlantCardGrappleActive", false);
					isMoving = false;
					this.#endPowerUse();

					// If the player ends up inside a wall, hurt them and expel them.
					if (isSpriteInsideSolidTile(player, this.landLayer)) {
						this.enemyHitPlayer();
						player.setPosition(lastSafePosition.x, lastSafePosition.y);
					}
				}
				lastDistance = distance;
			},
			repeat: -1,
		});
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

		// The wind card pushes tiles.
		const velocity = createVelocityForDirection(
			config.windCardPushSpeed,
			this.playerDirection
		);
		tile.body.setVelocity(velocity.x, velocity.y);
		this.time.addEvent({
			delay: config.windCardPushTime,
			callback: () => {
				// Tile might have been destroyed before this happens
				if (tile.body?.setVelocity) {
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

	makeAppearingTileAppear(
		tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	) {
		const msAfterApproach: number = tile.data.get("msAfterApproach") ?? 0;
		let firstApproachedTime: number = tile.data.get("firstApproachedTime") ?? 0;

		// If the tile has no msAfterApproach, then it should appear immediately.
		if (msAfterApproach < 100) {
			this.showTransientTile(tile);
			return;
		}

		const tilePosition = new Phaser.Math.Vector2(tile.body.x, tile.body.y);
		const player = getPlayerOrThrow();
		const playerPosition = new Phaser.Math.Vector2(
			player.body.center.x,
			player.body.center.y
		);
		const distanceToActivate: number =
			this.data.get("distanceToActivate") ?? config.distanceToActivateTransient;

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

		const previewBeforeAppear: number =
			tile.data.get("previewBeforeAppear") ?? 0;
		if (previewBeforeAppear > 0) {
			return this.dropTransientTile(tile, previewBeforeAppear);
		}

		this.showTransientTile(tile);
	}

	updateAppearingTiles() {
		const activeRoom = getActiveRoom();
		const transientTiles = activeRoom
			? getItemsInRoom(this.createdTiles, activeRoom)
			: [];

		// Don't consider tiles which are already visible.
		const appearingTiles = transientTiles.filter(
			(tile) => tile.visible === false
		);

		appearingTiles.forEach((tile) => {
			// Tiles with `manualActivation` must be explicitly shown.
			if (tile.data.get("manualActivation") === true) {
				return;
			}

			this.makeAppearingTileAppear(tile);
		});
	}

	dropTransientTile(
		tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
		speed: number
	) {
		const shadow = createShadowSprite({ scene: this, x: tile.x, y: tile.y });

		tile.setVisible(true);
		const tileFinalHeight = tile.y;
		const tileInitialHeight = 70;
		const tileInitialAlpha = 0.4;
		let height = tile.y - tileInitialHeight;
		tile.setAlpha(tileInitialAlpha);
		tile.setPosition(tile.x, height);

		this.tweens.add({
			targets: tile,
			x: tile.x,
			y: tileFinalHeight,
			duration: speed,
			onComplete: () => {
				this.showTransientTile(tile);
				shadow?.destroy();
			},
		});
	}

	stopSoundEffects() {
		Object.keys(soundKeys).forEach((key) => {
			this.sound.stopByKey(key);
		});
	}

	showSign(title: string) {
		this.stopSoundEffects();
		if (title === "TutorialSign") {
			this.showDialog({
				heading: "The door is shut",
				text: "Once, cards of power protected the kingdoms, but the cards have been lost. Monsters have sealed the people behind this door.",
			});
		}
		if (title === "SaveSign") {
			this.showDialog({
				heading: "Light the lanterns",
				text: "Your soul is bound to the lantern light and can be rekindled there.",
			});
		}
		if (title === "MapSign") {
			this.showDialog({
				heading: "View the map",
				text: `Press ${getButtonNames(this).map} to pause and view the map.`,
			});
		}
		if (title === "SwordSign") {
			this.showDialog({
				heading: "Do not go further unarmed",
				text: "It would be unwise to face the monsters unarmed. Visit the armory south of the throne room.",
			});
		}
		if (title === "ArmorySign") {
			this.showDialog({
				heading: "The Armory",
				text: "It would be unwise to face the monsters unarmed. Find a weapon in here.",
			});
		}
		if (title === "SummoningSign") {
			this.showDialog({
				heading: "I summon you from the past",
				text: "You have lived before. Now live again to save us from our doom.",
			});
		}
	}

	showTransientTile(tile: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		tile.setVisible(true);
		tile.setAlpha(1);
		tile.data.set("hidden", false);
		tile.body.pushable = false;
		const player = getPlayerOrThrow();
		this.physics.add.collider(
			player,
			tile,
			() => {
				if (player.data.get("isPlantCardGrappleActive")) {
					// In case we were being pulled by the PlantCard
					player.data.set("isPlantCardGrappleActive", false);
					this.power.anims.stop();
					this.power.visible = false;
				}

				if (tile.name.endsWith("Sign")) {
					this.showSign(tile.name);
				}
			},
			() => {
				if (
					tile.data?.get("affectedBySpiritCard") &&
					this.isPlayerUsingPower() &&
					this.getActivePower() === "SpiritCard"
				) {
					return false;
				}
			}
		);
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
				this.sendHitToEnemy(enemy, 1);
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
				this.destroyCreatedTile(tile);
			}
		});
		this.physics.add.collider(this.hiddenRoomLayer, tile, (collideTile) => {
			if (!isDynamicSprite(collideTile)) {
				return;
			}
			if (collideTile.data.get("beingPushed")) {
				this.destroyCreatedTile(tile);
			}
		});
		this.physics.add.collider(this.createdDoors, tile, (_, collideTile) => {
			if (!isDynamicSprite(collideTile)) {
				return;
			}
			if (collideTile.data.get("beingPushed")) {
				this.destroyCreatedTile(tile);
			}
		});

		if (this.physics.overlap(player, tile)) {
			this.enemyHitPlayer();
		}

		this.createdTiles.push(tile);

		const activeRoom = getActiveRoom();
		if (activeRoom) {
			// Just in case the tile was created outside the current room.
			hideAllRoomsExcept(
				getMap(),
				this.enemyManager.enemies,
				[
					...ItemComponent.values(),
					...this.createdTiles,
					...this.createdDoors,
					...this.createdFinalDoors,
					...this.createdSavePoints,
				],
				activeRoom,
				this.spawnPoints
			);
		}
	}

	hideHiddenItems() {
		ItemComponent.forEach((item) => {
			if (item.data.get("hidden")) {
				// If the item has been previous revealed, do not hide it.
				const itemId: number | undefined = item.data.get(DataKeys.ItemObjectId);
				const shownItems: number[] =
					getDataFromRegistry(this.registry, "itemsRevealed") ?? [];
				if (itemId && !shownItems.includes(itemId)) {
					item.setVisible(false);
					item.setActive(false);
				}
			}
		});
	}

	getAllHiddenItemsInRoom(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] {
		const activeRoom = getActiveRoom();
		return Array.from(ItemComponent.values()).filter((item) => {
			if (!activeRoom) {
				return false;
			}
			if (!isPointInRoom(item.x, item.y, activeRoom)) {
				return false;
			}
			if (!item.data.get("hidden")) {
				return false;
			}
			return true;
		});
	}

	showAllHiddenItemsInRoom() {
		this.getAllHiddenItemsInRoom().map((item) => {
			this.showHiddenItem(item);
		});
	}

	showHiddenItem(item: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		const itemId = item.data.get(DataKeys.ItemObjectId);
		if (itemId) {
			const shownItems =
				getDataFromRegistry(this.registry, "itemsRevealed") ?? [];
			shownItems.push(itemId);
			saveDataToRegistry(this.registry, "itemsRevealed", shownItems);
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
		this.holyLoopSound.play();
		effect.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => {
			const name = effect.anims.getName();
			const progress = effect.anims.getProgress();
			if (name === "appear" && progress > 0.8 && item?.data) {
				item.data.set("hidden", false);
				item.setVisible(true);
				item.setActive(true);
			}
		});
		effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			const name = effect.anims.getName();
			if (name === "white_fire_circle") {
				this.holyLoopSound.stop();
				this.appearSound.play();
			}
			if (name === "appear") {
				effect.destroy();
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
		const player = getPlayerOrThrow();
		const touchingDoor = getItemTouchingPlayer(this.createdDoors, player);
		if (touchingDoor) {
			this.handleCollideDoor(touchingDoor);
		}
	}

	maybePickUpItem() {
		const player = getPlayerOrThrow();
		const touchingItem = getItemTouchingPlayer(
			Array.from(ItemComponent.values()),
			player
		);
		if (touchingItem && touchingItem.active) {
			switch (touchingItem.name) {
				case "Sword":
					this.pickUpSword();
					break;
				case "PotionBottle":
					this.pickUpPotionBottle();
					break;
				case "PotionVial":
					this.pickUpPotionVial();
					break;
				case "FullPotion":
					this.pickUpFullPotion();
					break;
				case "CrownCard":
					this.cameras.main.fadeOut(
						1000,
						0,
						0,
						0,
						(_: unknown, progress: number) => {
							if (progress === 1) {
								this.scene.stop();
								this.scene.get("Overlay")?.scene.stop();
								this.scene.start("Victory");
							}
						}
					);
					break;
				case "ClockCard":
					this.pickUpAura(touchingItem.name);
					break;
				case "SunCard":
					this.pickUpAura(touchingItem.name);
					break;
				case "MountainCard":
					this.pickUpAura(touchingItem.name);
					break;
				case "SwordCard":
					this.pickUpAura(touchingItem.name);
					break;
				case "FishCard":
					this.pickUpAura(touchingItem.name);
					break;
				case "HeartCard":
					this.pickUpAura(touchingItem.name);
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

	findItemObjectMatchingCreatedItem(
		item: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	) {
		return getMap().findObject("Items", (obj) => {
			if (!hasId(obj)) {
				return false;
			}
			if (obj.id === item.data.get(DataKeys.ItemObjectId)) {
				return true;
			}
			return false;
		});
	}

	removeItem(itemToRemove: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		ItemComponent.delete(itemToRemove.data.get(DataKeys.ItemObjectId));
		const itemsRemoved =
			getDataFromRegistry(this.registry, "itemsRemoved") ?? [];
		const itemObject = this.findItemObjectMatchingCreatedItem(itemToRemove);
		if (!itemObject) {
			return;
		}
		itemsRemoved.push(itemObject.id);
		saveDataToRegistry(this.registry, "itemsRemoved", itemsRemoved);
		itemToRemove.destroy();
	}

	getPlayerHitPoints(): number {
		return (
			getDataFromRegistry(this.registry, "playerHitPoints") ??
			config.playerInitialHitPoints
		);
	}

	getPlayerTotalHitPoints(): number {
		return (
			getDataFromRegistry(this.registry, "playerTotalHitPoints") ??
			config.playerInitialHitPoints
		);
	}

	setPlayerHitPoints(hitPoints: number) {
		const playerTotalHitPoints = this.getPlayerTotalHitPoints();
		if (hitPoints > playerTotalHitPoints) {
			hitPoints = playerTotalHitPoints;
		}
		if (hitPoints < 0) {
			hitPoints = 0;
		}
		saveDataToRegistry(this.registry, "playerHitPoints", hitPoints);
	}

	setKeyCount(count: number) {
		saveDataToRegistry(this.registry, "keyCount", count);
	}

	getKeyCount(): number {
		return getDataFromRegistry(this.registry, "keyCount") ?? 0;
	}

	pickUpKey() {
		this.sound.play("key");
		this.setKeyCount(this.getKeyCount() + 1);
		this.sound.get("key").on(Phaser.Sound.Events.COMPLETE, () => {
			this.stopSoundEffects();
		});
		this.showDialog({
			heading: "A Key",
			text: "Collect six of these to open the Golden door.",
		});
	}

	pickUpHeart() {
		this.sound.play("heart");
		let playerTotalHitPoints = this.getPlayerTotalHitPoints();
		playerTotalHitPoints += 1;
		saveDataToRegistry(
			this.registry,
			"playerTotalHitPoints",
			playerTotalHitPoints
		);
		this.restorePlayerHitPoints();
	}

	setPlayerDirection(direction: SpriteDirection) {
		this.playerDirection = direction;
		const player = getPlayerOrThrow();
		player.data.set(DataKeys.PlayerDirection, direction);
	}

	playCardAnimation(card: Powers) {
		// Face right
		this.setPlayerDirection(SpriteRight);
		this.setPlayerIdleFrame();
		this.updatePowerHitboxPosition();
		this.power.setRotation(Phaser.Math.DegToRad(0));

		// Play power animation
		switch (card) {
			case "IceCard":
				this.power.setVelocity(config.icePowerVelocity, 0);
				this.power.anims.play("ice-power-right", true);
				break;
			case "SpiritCard":
				this.playSpiritPowerAnimation();
				break;
			case "CloudCard":
				this.power.anims.play("cloud-power", true);
				break;
			case "FireCard":
				this.power.setVelocity(config.firePowerVelocity, 0);
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

	pickUpAura(card: Auras) {
		this.equipAura(card);
		this.sound.play("bonus");
		this.setPlayerHiddenInvincible(true);
		this.setPlayerStunned(true);
		this.time.addEvent({
			delay: config.gotItemFreeze,
			callback: () => {
				this.stopSoundEffects();
				this.showDialog({
					heading: getCardNameForPower(card),
					text:
						getAuraDescription(card) +
						"\r\nUse the map screen to change active powers.",
				});
				this.setPlayerHiddenInvincible(false);
				this.setPlayerStunned(false);
			},
		});
	}

	pickUpCard(card: Powers) {
		this.equipPower(card);
		this.playCardAnimation(card);
		this.sound.play("bonus");
		this.setPlayerHiddenInvincible(true);
		this.setPlayerStunned(true);
		this.time.addEvent({
			delay: config.gotItemFreeze,
			callback: () => {
				this.stopSoundEffects();
				this.showDialog({
					heading: getCardNameForPower(card),
					text: `Press ${
						getButtonNames(this).power
					} to use the power.\r\nPress ${
						getButtonNames(this).rotatePower
					} to change the active power.`,
				});
				this.setPlayerHiddenInvincible(false);
				this.setPlayerStunned(false);
			},
		});
	}

	restorePlayerHitPoints() {
		const playerTotalHitPoints = this.getPlayerTotalHitPoints();
		this.setPlayerHitPoints(playerTotalHitPoints);
		this.heartCardTimer?.remove();
		this.heartCardTimer = undefined;
	}

	restorePlayerPotions() {
		this.setPotionCount(this.getPotionTotalCount());
	}

	pickUpFullPotion() {
		this.setPotionCount(this.getPotionTotalCount());
		this.appearSound.play();
	}

	pickUpPotionVial() {
		this.setPotionCount(
			Math.min(this.getPotionCount() + 1, this.getPotionTotalCount())
		);
		this.appearSound.play();
	}

	pickUpPotionBottle() {
		this.appearSound.play();
		this.appearSound.on(Phaser.Sound.Events.COMPLETE, () => {
			this.stopSoundEffects();
		});

		this.restorePlayerHitPoints();
		if (this.getPotionTotalCount() === 0) {
			this.setPotionTotalCount(config.initialPotionCount);
			this.restorePlayerPotions();
			this.showDialog({
				heading: "A magic potion bottle!",
				text: `Press ${
					getButtonNames(this).heal
				} to restore your health. You can refill the bottle using potion vials found around the kingdoms.`,
			});
		} else {
			this.setPotionTotalCount(this.getPotionTotalCount() + 1);
			this.restorePlayerPotions();
			this.showDialog({
				heading: "A magic potion bottle!",
				text: "The amount of potion you can carry has increased!",
			});
		}
	}

	pickUpSword() {
		this.equipSword();
		const player = getPlayerOrThrow();
		player.anims.play("down-attack", true);
		this.attackSound.play();
		this.attackSound.on(Phaser.Sound.Events.COMPLETE, () => {
			this.stopSoundEffects();
		});
		this.setPlayerHiddenInvincible(true);
		this.setPlayerStunned(true);
		this.time.addEvent({
			delay: config.gotItemFreeze,
			callback: () => {
				this.showDialog({
					heading: "You found a sword!",
					text: `Press ${getButtonNames(this).ok} to swing.`,
				});
				this.setPlayerHiddenInvincible(false);
				this.setPlayerStunned(false);
				this.saveGame();
			},
		});
	}

	movePlayerToPoint(x: number, y: number) {
		const player = getPlayerOrThrow();
		player.setPosition(x, y);
		const room = getRoomForPoint(getMap(), player.x, player.y);
		this.moveCameraToRoom(room);
	}

	getPlayerSpeed(): number {
		const leftRightAmount = Math.abs(
			this.input.gamepad?.pad1?.leftStick.x ?? 0
		);
		const upDownAmount = Math.abs(this.input.gamepad?.pad1?.leftStick.y ?? 0);
		const amount =
			leftRightAmount > upDownAmount ? leftRightAmount : upDownAmount;
		if (amount > 0 && amount < 1) {
			return config.characterSpeed * amount;
		}
		return config.characterSpeed;
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

		getSpriteOrThrow("sword").body.setSize(width, height);

		const [xOffset, yOffset] = this.getSwordOffset();
		const player = getPlayerOrThrow();
		getSpriteOrThrow("sword").x = player.body.center.x + xOffset;
		getSpriteOrThrow("sword").y = player.body.center.y + yOffset;
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

	getSwordOffset(): [number, number] {
		const player = getPlayerOrThrow();
		const xOffset = (() => {
			if (this.playerDirection === SpriteLeft) {
				return -player.body.height;
			}
			if (this.playerDirection === SpriteRight) {
				return player.body.height;
			}
			return 0;
		})();
		const yOffset = (() => {
			if (this.playerDirection === SpriteUp) {
				return -player.body.height;
			}
			if (this.playerDirection === SpriteDown) {
				return player.body.height;
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
			if (this.getActivePower() === "PlantCard") {
				return 2;
			}
			if (
				this.playerDirection === SpriteLeft ||
				this.playerDirection === SpriteRight
			) {
				return 24;
			}
			return 16;
		})();
		const height = (() => {
			if (["SpiritCard"].includes(this.getActivePower() as string)) {
				return 12;
			}
			if (this.getActivePower() === "FireCard") {
				return 12;
			}
			if (this.getActivePower() === "PlantCard") {
				return 2;
			}
			if (
				this.playerDirection === SpriteUp ||
				this.playerDirection === SpriteDown
			) {
				return 24;
			}
			return 16;
		})();

		this.power.body.setSize(width, height);

		const [xOffset, yOffset] = this.getPowerOffset();
		const player = getPlayerOrThrow();
		this.power.x = player.body.center.x + xOffset;
		this.power.y = player.body.center.y + yOffset;
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
		getSpriteOrThrow("sword").body.debugShowBody = false;
		this.power.body.debugShowBody = false;
		getSpriteOrThrow("sword").body.debugShowVelocity = false;
		this.power.body.debugShowVelocity = false;
		getSpriteOrThrow("sword").setVelocity(0);

		// We update the sword/power hitbox on every frame even when not in use to
		// make sure it stays in position relative to the player; otherwise the
		// hitbox appears briefly at its old location.
		if (!this.isPlayerSwordActive() && !this.isPlayerUsingPower()) {
			getSpriteOrThrow("sword").setVisible(false);
			this.power.setVisible(false);
			this.updateSwordHitboxForAttack();
			this.updatePowerHitboxPosition();
			return;
		}

		if (this.isPlayerSwordActive()) {
			getSpriteOrThrow("sword").body.debugShowBody = true;
			getSpriteOrThrow("sword").body.debugShowVelocity = true;
			return;
		}
		if (this.isPlayerUsingPower()) {
			this.power.body.debugShowBody = true;
			this.power.body.debugShowVelocity = true;
			return;
		}
	}

	createOverlay() {
		if (
			getDataFromRegistry(this.registry, "playerTotalHitPoints") === undefined
		) {
			saveDataToRegistry(
				this.registry,
				"playerTotalHitPoints",
				config.playerInitialHitPoints
			);
		}
		if (getDataFromRegistry(this.registry, "playerHitPoints") === undefined) {
			this.setPlayerHitPoints(config.playerInitialHitPoints);
		}
		this.scene.launch("Overlay", { enemyManager: this.enemyManager });
	}

	preload() {
		this.attackSound = this.sound.add("attack", { loop: false, volume: 0.5 });
		this.windSound = this.sound.add("wind", { loop: false, volume: 0.8 });
		this.saveSound = this.sound.add("fire", {
			loop: false,
			volume: 0.8,
		});
		this.walkSound = this.sound.add("walk", {
			loop: false,
			rate: 1.6,
			volume: 0.8,
		});
		this.iceSound = this.sound.add("ice", { loop: false, volume: 0.5 });
		this.holyLoopSound = this.sound.add("holy-loop", {
			loop: true,
			volume: 0.9,
		});
		this.appearSound = this.sound.add("holy", { loop: false, volume: 0.9 });
		this.rockDestroySound = this.sound.add("rock-destroy", {
			loop: false,
			volume: 0.5,
		});
		this.freezeSound = this.sound.add("freeze", { loop: false, volume: 0.5 });
		this.plantSound = this.sound.add("plant", { loop: false, volume: 0.5 });
		this.healSound = this.sound.add("heal", { loop: false, volume: 0.9 });
		this.hitSound = this.sound.add("hit", { loop: false, volume: 0.5 });
		this.destroySound = this.sound.add("destroy", { loop: false, volume: 0.5 });

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
			key: "player-hit",
			frames: anims.generateFrameNumbers("player-hit", { start: 2 }),
			frameRate: 20,
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
			frameRate: config.attackFrameRate,
			repeat: 0,
			delay: config.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "right-attack",
			frames: anims.generateFrameNames("character", {
				prefix: "sword-right-",
				suffix: ".png",
				end: 9,
			}),
			frameRate: config.attackFrameRate,
			repeat: 0,
			delay: config.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "up-attack",
			frames: anims.generateFrameNames("character", {
				prefix: "sword-up-",
				suffix: ".png",
				end: 9,
			}),
			frameRate: config.attackFrameRate,
			repeat: 0,
			delay: config.attackDelay,
			showBeforeDelay: true,
		});
		anims.create({
			key: "left-attack",
			frames: anims.generateFrameNames("character", {
				prefix: "sword-left-",
				suffix: ".png",
				end: 9,
			}),
			frameRate: config.attackFrameRate,
			repeat: 0,
			delay: config.attackDelay,
			showBeforeDelay: true,
		});

		anims.create({
			key: "plant-power-right",
			frames: anims.generateFrameNumbers("plant-power"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
			yoyo: true,
			repeat: config.plantCardAnimationRepeat,
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
			repeat: -1,
		});
		anims.create({
			key: "wind-power-right",
			frames: anims.generateFrameNumbers("wind-power"),
			frameRate: 24,
			showOnStart: true,
			hideOnComplete: true,
		});
	}

	getTempSpawnPoint(): undefined | { x: number; y: number } {
		const tempSpawnPoint = getMap().findObject(
			"MetaObjects",
			(obj) => obj.name === MapMetaKeys.TempStartPoint
		);
		if (!tempSpawnPoint?.x || !tempSpawnPoint.y) {
			return undefined;
		}
		return {
			x: tempSpawnPoint?.x,
			y: tempSpawnPoint?.y,
		};
	}

	getSpawnPoint(): { x: number; y: number } {
		const spawnPoint = getMap().findObject(
			"MetaObjects",
			(obj) => obj.name === MapMetaKeys.StartPoint
		);
		if (!spawnPoint?.x || !spawnPoint.y) {
			throw new Error("No spawn point found on map");
		}
		return {
			x: spawnPoint?.x,
			y: spawnPoint?.y,
		};
	}

	createPlayer(x: number, y: number): void {
		const player = this.physics.add.sprite(
			x,
			y,
			"character",
			"idle-down-0.png"
		);
		player.setDataEnabled();
		player.setDebugBodyColor(0x00ff00);
		player.setDepth(1);
		SpriteComponent.set("player", player);

		this.restorePlayerHitPoints();

		const sword = this.physics.add.sprite(player.x, player.y, "wind-power", 4);
		sword.setDataEnabled();
		sword.setDebugBodyColor(0x00fff0);
		sword.setDepth(4);
		sword.setPushable(false);
		SpriteComponent.set("sword", sword);

		this.power = this.physics.add.sprite(player.x, player.y, "wind-power", 4);
		this.power.setDebugBodyColor(0x00fff0);
		this.power.setDepth(4);

		this.updateSwordHitbox();

		player.setCollideWorldBounds(true);
		this.resetPlayerHitBox();
		this.makePlayerAppear();
	}

	makePlayerAppear() {
		this.isPlayerAppearingInvincible = true;
		this.setPlayerStunned(true);
		const player = getPlayerOrThrow();
		player.setVisible(false);
		const effect = this.add.sprite(
			player.body.center.x + player.body.width / 2,
			player.body.center.y + player.body.height / 2,
			"white_fire_circle",
			0
		);
		effect.setOrigin(0.5, 0.5);
		effect.setDepth(5);
		effect.anims.play("white_fire_circle", true);
		effect.anims.chain("appear");
		this.holyLoopSound.play();
		effect.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => {
			const name = effect.anims.getName();
			const progress = effect.anims.getProgress();
			if (name === "appear" && progress > 0.8) {
				this.setPlayerStunned(false);
				player.setVisible(true);
				// The player will remain invincible until they move. See finishPlayerAppear()
			}
		});
		effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			const name = effect.anims.getName();
			if (name === "white_fire_circle") {
				this.holyLoopSound.stop();
				this.appearSound.play();
			}
			if (name === "appear") {
				effect.destroy();
			}
		});
	}

	addEnemyToEnemyManager(monster: BaseMonster, point: { id: number }) {
		monster.mapSpawnPointId = point.id;
		this.enemyManager.enemies.add(monster);
		monster.once(Events.MonsterDefeated, () => {
			this.enemyManager.enemies.remove(monster, true);
		});
	}

	createEnemiesInRoom() {
		const activeRoom = getActiveRoom();
		this.spawnPoints.forEach((point) => {
			if (point.x === undefined || point.y === undefined || !activeRoom) {
				return;
			}
			const isEnemyInRoom = isPointInRoom(point.x, point.y, activeRoom);
			if (!isEnemyInRoom) {
				return;
			}

			const enemyType = point.name;

			if (!this.monsterCreator.shouldMonsterRespawn(enemyType)) {
				return;
			}
			const monster = this.monsterCreator.createMonster(
				enemyType,
				{
					x: point.x,
					y: point.y,
				},
				getPropertiesFromPoint(point)
			);

			// If this was the last monster in the room, show all hidden items.
			monster.once(Events.MonsterDefeated, () => {
				// Note that because of the timing of this event, the destroyed monster
				// will still be in the room when this runs.
				const areAnyMonstersInRoom = areMonstersInRoom(this.enemyManager, [
					monster,
				]);
				if (!areAnyMonstersInRoom) {
					this.showAllHiddenItemsInRoom();
					this.unlockDoorsInRoom();
				}
			});
			this.addEnemyToEnemyManager(monster, point);

			this.spawnPoints = this.spawnPoints.filter((pointB) => pointB !== point);
		});

		// It seems that we may need to do this again when enemies changes?
		this.physics.add.collider(this.createdDoors, this.enemyManager.enemies);
	}

	addPotionVialAt(x: number, y: number) {
		const potionVial = this.physics.add.sprite(x, y, "icons4", 34);
		const player = getPlayerOrThrow();
		this.physics.add.overlap(player, potionVial, () => {
			this.pickUpPotionVial();
			potionVial.destroy();
		});
		this.time.addEvent({
			delay: config.droppedItemLifetime / 2,
			callback: () => {
				potionVial?.setAlpha(0.4);
			},
		});
		this.time.addEvent({
			delay: config.droppedItemLifetime,
			callback: () => {
				potionVial?.destroy();
			},
		});
	}

	playerHitEnemy(
		enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	): void {
		// If the player is not in the attack animation, do nothing. Also do
		// nothing if the player is in the warmup for the attack or the cooldown.
		if (this.isPlayerSwordActive()) {
			let damage = config.normalSwordDamage;
			if (isAuraActive(this.registry, "SwordCard")) {
				// Note: bosses will not take quite this much extra damage. See
				// config.maxBossDamageTakenPerHit.
				damage = config.swordCardDamage;
			}
			this.sendHitToEnemy(enemy, damage);
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
			this.sendHitToEnemy(enemy, 1);
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
				delay: config.iceCardFrozenTime,
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
			knockBack(
				this,
				enemy.body,
				config.enemyKnockbackTime,
				config.enemyKnockBackSpeed,
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
		// We can't use MonsterStun event here because it is too slow.
		enemy.data.set(DataKeys.Stunned, true);
		enemy.body.stop();
		enemy.data.set("isPlantCardGrappleActive", true);

		const player = getPlayerOrThrow();
		this.physics.moveToObject(enemy, player, config.plantCardVelocity);
		this.power.body.stop();
	}

	sendHitToEnemy(
		enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
		damage: number
	) {
		if (enemy.data.get(DataKeys.Hittable) !== true) {
			return;
		}
		this.cameras.main.shake(200, 0.004);
		vibrate(this, 1, 200);
		enemy.emit(Events.MonsterHit, damage);

		// Knock the player back a bit when they hit an enemy.
		if (!isAuraActive(this.registry, "MountainCard")) {
			const player = getPlayerOrThrow();
			knockBack(
				this,
				player.body,
				config.postHitEnemyKnockback,
				config.playerKnockBackSpeed,
				invertSpriteDirection(this.playerDirection),
				() => {}
			);
		}
	}

	gameOver() {
		if (!this.scene.isActive()) {
			return;
		}
		this.isGameOver = true;
		const player = getPlayerOrThrow();
		this.tweens.add({ targets: player, duration: 800, alpha: 0 });
		this.sound.stopAll();
		this.cameras.main.fadeOut(1000, 0, 0, 0, (_: unknown, progress: number) => {
			if (progress === 1) {
				this.scene.stop();
				this.scene.get("Overlay")?.scene.stop();
				this.scene.start("GameOver");
			}
		});
	}

	hitStopForHurtPlayer() {
		this.scene.pause();
		// This cannot use the built-in timer class because it's been paused so we
		// have to use setTimeout.
		setTimeout(() => {
			this.scene.resume();
		}, config.playerHitStopTime);
	}

	playEffectForHurtPlayer() {
		const player = getPlayerOrThrow();
		const effect = this.add.sprite(
			player.body.center.x,
			player.body.center.y - 5,
			"player-hit",
			2
		);
		effect.setDepth(5);
		effect.setAlpha(0.9);
		effect.anims.play("player-hit", true);
		effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect.destroy();
		});
		MainEvents.on(Events.PlayerPositionChanged, () => {
			if (effect?.active) {
				effect.setPosition(player.body.center.x, player.body.center.y - 5);
			}
		});
	}

	zoomCameraForHurtPlayer() {
		this.cameras.main.zoomTo(
			config.postHitCameraZoomScale,
			config.postHitCameraZoomInDelay,
			"Linear",
			false,
			(_, progress) => {
				if (progress === 1) {
					this.time.addEvent({
						delay: 0,
						callback: () => {
							if (this.getPlayerHitPoints() > 0) {
								this.cameras.main.zoomTo(
									1,
									config.postHitCameraZoomOutDelay,
									"Linear",
									true
								);
							}
						},
					});
				}
			}
		);
	}

	showParticlesForHurtPlayer() {
		const player = getPlayerOrThrow();
		const emitter = this.add.particles(
			player.body.center.x,
			player.body.center.y - 5,
			"player-hit",
			{
				frame: 1,
				lifespan: 800,
				speed: { min: 40, max: 80 },
				scale: { start: 0.7, end: 0 },
				alpha: 0.8,
				emitting: false,
			}
		);
		emitter.explode(10);
		emitter.once(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
			emitter?.destroy();
		});
	}

	doCameraEffectsForHurtPlayer() {
		this.cameras.main.shake(
			config.postHitCameraShakeDelay,
			config.postHitCameraShakeIntensity
		);
		this.playEffectForHurtPlayer();
		this.showParticlesForHurtPlayer();
		this.zoomCameraForHurtPlayer();
		this.hitStopForHurtPlayer();
		vibrate(this, 2, 300);
	}

	enemyHitPlayer(args?: { damage?: number }): void {
		if (
			this.isPlayerBeingHit() ||
			this.isPlayerInvincible() ||
			this.isPlayerHiddenInvincible()
		) {
			return;
		}
		this.hitSound.play();

		this.isPlayerBeingHitInvincible = true;
		this.enemyCollider.active = false;
		this.setPlayerHitPoints(this.getPlayerHitPoints() - (args?.damage ?? 1));
		this.heartCardTimer?.remove();
		this.heartCardTimer = undefined;

		this.doCameraEffectsForHurtPlayer();

		if (this.getPlayerHitPoints() <= 0) {
			return;
		}

		this.time.addEvent({
			delay: config.postHitInvincibilityTime,
			callback: () => {
				if (this.getPlayerHitPoints() > 0) {
					this.setPlayerBeingHit(false);
					this.enemyCollider.active = true;
				}
			},
		});
		this.time.addEvent({
			delay: isAuraActive(this.registry, "SunCard")
				? config.sunCardInvincibilityTime
				: config.postHitInvincibilityTime,
			callback: () => {
				if (this.getPlayerHitPoints() > 0) {
					this.isPlayerBeingHitInvincible = false;
				}
			},
		});

		if (!isAuraActive(this.registry, "MountainCard")) {
			this.setPlayerStunned(true);
			this.isPlayerBeingKnockedBack = true;
			const player = getPlayerOrThrow();
			knockBack(
				this,
				player.body,
				config.postHitPlayerKnockback,
				config.playerKnockBackSpeed,
				invertSpriteDirection(this.playerDirection),
				() => {
					this.setPlayerStunned(false);
					this.isPlayerBeingKnockedBack = false;
				}
			);
		}

		this.setPlayerBeingHit(true);
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
			this.getTimeSinceLastAttack() > config.postAttackCooldown &&
			!this.isPlayerUsingPower()
		);
	}

	getPotionTotalCount(): number {
		return getDataFromRegistry(this.registry, "potionTotalCount") ?? 0;
	}

	setPotionTotalCount(count: number) {
		saveDataToRegistry(this.registry, "potionTotalCount", count);
	}

	getPotionCount(): number {
		return getDataFromRegistry(this.registry, "potionCount") ?? 0;
	}

	setPotionCount(count: number) {
		saveDataToRegistry(this.registry, "potionCount", count);
	}

	equipSword(): void {
		saveDataToRegistry(this.registry, "hasSword", true);
	}

	equipAura(card: Auras): void {
		saveDataToRegistry(this.registry, getPowerEquippedKey(card), true);

		if (getActiveAuras(this.registry).length < config.maxActiveAuras) {
			activateAura(this.registry, card);
		}

		MainEvents.emit(Events.AuraEquipped);
	}

	equipPower(power: Powers): void {
		saveDataToRegistry(this.registry, getPowerEquippedKey(power), true);
		this.setActivePower(power);
		MainEvents.emit(Events.PowerEquipped);
	}

	canPlayerUsePower(): boolean {
		const postPowerCooldown = isAuraActive(this.registry, "ClockCard")
			? config.clockCardCooldown
			: config.postPowerCooldown;
		return (
			this.getPlayerHitPoints() > 0 &&
			this.doesPlayerHavePower() &&
			!this.isPlayerFrozen() &&
			!this.isPlayerStunned() &&
			!this.isPlayerAttacking() &&
			this.getTimeSinceLastPower() > postPowerCooldown &&
			!this.isPlayerUsingPower()
		);
	}

	doesPlayerHavePower(): boolean {
		return (
			getDataFromRegistry(this.registry, "hasWindCard") === true ||
			getDataFromRegistry(this.registry, "hasIceCard") === true ||
			getDataFromRegistry(this.registry, "hasIceCard") === true ||
			getDataFromRegistry(this.registry, "hasFireCard") === true ||
			getDataFromRegistry(this.registry, "hasSpiritCard") === true ||
			getDataFromRegistry(this.registry, "hasCloudCard") === true ||
			getDataFromRegistry(this.registry, "hasPlantCard") === true
		);
	}

	doesPlayerHaveSword(): boolean {
		return getDataFromRegistry(this.registry, "hasSword") === true;
	}

	setPlayerFrozen(setting: boolean) {
		const player = getPlayerOrThrow();
		player.data?.set("freezePlayer", setting);
		if (setting === true) {
			this.freezeSound.play();
			player.body.stop();
			player.stop();
		}
	}

	setPlayerStunned(setting: boolean) {
		const player = getPlayerOrThrow();
		player.data?.set("stunPlayer", setting);
		player.body.setVelocity(0);
	}

	setPlayerConfused(setting: boolean) {
		const player = getPlayerOrThrow();
		player.data?.set("confusedPlayer", setting);
	}

	// Same as setPlayerInvincible but there will be no visual cue. Useful for
	// times when the player should just not be able to take damage like a "got
	// powerup" period.
	setPlayerHiddenInvincible(setting: boolean) {
		const player = getPlayerOrThrow();
		player.data?.set("invinciblePlayerHidden", setting);
	}

	isPlayerInvincible(): boolean {
		if (this.isPlayerUsingPower() && this.getActivePower() === "SpiritCard") {
			return true;
		}
		if (
			this.isPlayerCheatInvincible ||
			this.isPlayerAppearingInvincible ||
			this.isPlayerBeingHitInvincible
		) {
			return true;
		}
		return false;
	}

	isPlayerHiddenInvincible(): boolean {
		const player = getPlayerOrThrow();
		return player.data?.get("invinciblePlayerHidden");
	}

	isPlayerFrozen(): boolean {
		const player = getPlayerOrThrow();
		return player.data.get("freezePlayer") === true;
	}

	isPlayerStunned(): boolean {
		const player = getPlayerOrThrow();
		return player.data.get("stunPlayer") === true;
	}

	isPlayerConfused(): boolean {
		const player = getPlayerOrThrow();
		return player.data.get("confusedPlayer") === true;
	}

	cacheTilesInRoom(): void {
		const activeRoom = getActiveRoom();
		if (!activeRoom) {
			this.cachedTilesInRoom = [];
			return;
		}
		this.cachedTilesInRoom = getTilesInRoom(getMap(), activeRoom);
	}

	getCachedTilesInRoom(): Phaser.Tilemaps.Tile[] {
		return this.cachedTilesInRoom ?? [];
	}

	isPlayerOnIce(): boolean {
		if (!getActiveRoom()) {
			return false;
		}
		const iceTiles = this.getCachedTilesInRoom().filter((tile) => {
			return isTileWithPropertiesObject(tile) && tile.properties.isIce;
		});
		if (iceTiles.length < 2) {
			return false;
		}
		const player = getPlayerOrThrow();
		return this.physics.overlapTiles(player, iceTiles);
	}

	isPlayerBeingHit(): boolean {
		const player = getPlayerOrThrow();
		return player.data?.get("playerGotHit");
	}

	setPlayerBeingHit(setting: boolean): void {
		const player = getPlayerOrThrow();
		player.data?.set("playerGotHit", setting);
	}

	isPlayerUsingPower(): boolean {
		return (
			this.power?.anims?.getName().includes("power") &&
			this.power.visible === true &&
			this.power.anims.hasStarted
		);
	}

	getActivePower(): Powers | undefined {
		return getDataFromRegistry(this.registry, "activePower");
	}

	setActivePower(power: Powers): void {
		saveDataToRegistry(this.registry, "activePower", power);
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
			case "CloudCard":
				this.windSound.play();
				break;
			case "FireCard":
				this.sound.play("fire");
				break;
			case "SpiritCard":
				this.sound.play("spirit");
				break;
		}
	}

	playSpiritPowerAnimation() {
		this.power.anims.play("spirit-power", true);
		this.power.setAlpha(0.5);
		const endAnimation = this.tweens.add({
			delay: config.spiritPowerTime - 1000,
			targets: this.power,
			alpha: 0,
			duration: 200,
			repeat: -1,
			yoyo: true,
		});
		this.time.addEvent({
			delay: config.spiritPowerTime,
			callback: () => {
				endAnimation.stop();
				this.sound.stopByKey("spirit");
				this.#endPowerUse();
			},
		});
	}

	#endPowerUse(): void {
		this.power.anims.stop();
		this.power.anims.complete();
		this.power.setAlpha(1);
		this.power.setVisible(false);
		this.power.setVelocity(0);
		this.power.setFlipX(false);
		this.#clearPlantCardLine();
	}

	#clearPlantCardLine(): void {
		this.plantCardSegments.forEach((segment) => {
			segment.destroy();
		});
		this.plantCardSegments = [];
	}

	#drawPlantCardLine(target: Phaser.Math.Vector2): void {
		// Make the sprite that marks the end of the line invisible. We only want
		// to see the line itself.
		this.power.setAlpha(0);

		// Remove the last line.
		this.#clearPlantCardLine();

		// Draw the line of sprites between the current position of the end of the
		// line and the player.
		const player = getPlayerOrThrow();
		const xOffset = (() => {
			switch (this.playerDirection) {
				case SpriteLeft:
					return -player.width / 2;
				case SpriteRight:
					return player.width / 2;
				default:
					return 0;
			}
		})();
		const yOffset = (() => {
			switch (this.playerDirection) {
				case SpriteUp:
					return -player.height / 2;
				case SpriteDown:
					return player.height / 2;
				default:
					return 0;
			}
		})();
		const start = new Phaser.Math.Vector2(
			player.body.center.x + xOffset,
			player.body.center.y + yOffset
		);
		const vineLength = Phaser.Math.Distance.Between(
			start.x,
			start.y,
			target.x,
			target.y
		);
		const segmentSize = 8;
		const numSegments = Math.floor(vineLength / segmentSize);
		const deltaX = Math.abs(target.x - start.x);
		const deltaY = Math.abs(target.y - start.y);
		const vineDirection = deltaX > deltaY ? "horizontal" : "vertical";

		for (let i = 0; i < numSegments; i++) {
			let segmentX, segmentY;

			if (vineDirection === "horizontal") {
				segmentX = start.x + i * segmentSize * (target.x > start.x ? 1 : -1);
				segmentY = start.y;
			} else {
				segmentX = start.x;
				segmentY = start.y + i * segmentSize * (target.y > start.y ? 1 : -1);
			}

			const segment = this.add.image(segmentX, segmentY, "plant-power");
			if (vineDirection === "vertical") {
				segment.setRotation(Phaser.Math.DegToRad(90));
			}
			this.plantCardSegments.push(segment);
		}
	}

	playPowerAnimation(): void {
		this.lastPowerAt = this.time.now;
		this.power.setVelocity(0);
		this.power.setFlipX(false);
		this.power.setAlpha(1);
		const player = getPlayerOrThrow();
		switch (this.playerDirection) {
			case SpriteUp:
				switch (this.getActivePower()) {
					case "PlantCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, -config.plantCardVelocity);
						this.power.anims.play("plant-power-right", true);
						this.power.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
							this.#endPowerUse();
						});
						this.power.setFlipX(true);
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						player.setVelocity(0, -config.cloudCardSpeed);
						player.anims.play("up-walk");
						break;
					case "SpiritCard":
						this.playSpiritPowerAnimation();
						break;
					case "FireCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, -config.firePowerVelocity);
						this.power.anims.play("fire-power-right", true);
						this.power.setFlipX(true);
						break;
					case "IceCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, -config.icePowerVelocity);
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
						this.power.setVelocity(config.plantCardVelocity, 0);
						this.power.anims.play("plant-power-right", true);
						this.power.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
							this.#endPowerUse();
						});
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						player.setVelocity(config.cloudCardSpeed, 0);
						player.anims.play("left-walk");
						player.setFlipX(true);
						break;
					case "SpiritCard":
						this.playSpiritPowerAnimation();
						break;
					case "FireCard":
						this.power.setVelocity(config.firePowerVelocity, 0);
						this.power.anims.play("fire-power-right", true);
						break;
					case "IceCard":
						this.power.setVelocity(config.icePowerVelocity, 0);
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
						this.power.setVelocity(0, config.plantCardVelocity);
						this.power.anims.play("plant-power-right", true);
						this.power.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
							this.#endPowerUse();
						});
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						player.setVelocity(0, config.cloudCardSpeed);
						player.anims.play("down-walk");
						break;
					case "SpiritCard":
						this.playSpiritPowerAnimation();
						break;
					case "FireCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, config.firePowerVelocity);
						this.power.anims.play("fire-power-right", true);
						break;
					case "IceCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, config.icePowerVelocity);
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
						this.power.setVelocity(-config.plantCardVelocity, 0);
						this.power.anims.play("plant-power-right", true);
						this.power.setFlipX(true);
						this.power.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
							this.#endPowerUse();
						});
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						player.setVelocity(-config.cloudCardSpeed, 0);
						player.anims.play("left-walk");
						break;
					case "SpiritCard":
						this.playSpiritPowerAnimation();
						break;
					case "FireCard":
						this.power.setVelocity(-config.firePowerVelocity, 0);
						this.power.anims.play("fire-power-right", true);
						this.power.setFlipX(true);
						break;
					case "IceCard":
						this.power.setVelocity(-config.icePowerVelocity, 0);
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
		if (
			this.keyLeft.isDown ||
			this.keyA.isDown ||
			this.input.gamepad?.pad1?.left ||
			(this.input.gamepad?.pad1?.leftStick.x ?? 0) < 0
		) {
			return true;
		}
		return false;
	}

	isPressingRight(): boolean {
		if (
			this.input.gamepad?.pad1?.right ||
			(this.input.gamepad?.pad1?.leftStick.x ?? 0) > 0
		) {
			return true;
		}
		return this.keyRight.isDown || this.keyD.isDown;
	}

	isPressingUp(): boolean {
		if (
			this.input.gamepad?.pad1?.up ||
			(this.input.gamepad?.pad1?.leftStick.y ?? 0) < 0
		) {
			return true;
		}
		return this.keyUp.isDown || this.keyW.isDown;
	}

	isPressingDown(): boolean {
		if (
			this.input.gamepad?.pad1?.down ||
			(this.input.gamepad?.pad1?.leftStick.y ?? 0) > 0
		) {
			return true;
		}
		return this.keyDown.isDown || this.keyS.isDown;
	}

	finishPlayerAppear() {
		if (this.hasPlayerMovedSinceAppearing) {
			return;
		}
		this.hasPlayerMovedSinceAppearing = true;
		this.time.addEvent({
			delay: config.postAppearInvincibilityTime,
			callback: () => {
				this.isPlayerAppearingInvincible = false;
			},
		});
	}

	updatePlayerMovement(): void {
		const player = getPlayerOrThrow();
		if (!this.canPlayerMove()) {
			this.walkSound.stop();
			return;
		}

		// First stop any current movement.
		if (!this.isPlayerOnIce()) {
			player.body.setVelocity(0);
		}

		// Set velocity based on key press
		let isLeft = this.isPressingLeft();
		let isRight = this.isPressingRight();
		let isUp = this.isPressingUp();
		let isDown = this.isPressingDown();
		if (this.isPlayerConfused()) {
			isLeft = this.isPressingUp();
			isRight = this.isPressingDown();
			isUp = this.isPressingRight();
			isDown = this.isPressingLeft();
		}
		if (isLeft) {
			player.body.setVelocityX(-this.getPlayerSpeed());
			this.setPlayerDirection(SpriteLeft);
		} else if (isRight) {
			player.body.setVelocityX(this.getPlayerSpeed());
			this.setPlayerDirection(SpriteRight);
		}
		if (isUp) {
			player.body.setVelocityY(-this.getPlayerSpeed());
			this.setPlayerDirection(SpriteUp);
		} else if (isDown) {
			player.body.setVelocityY(this.getPlayerSpeed());
			this.setPlayerDirection(SpriteDown);
		}

		player.body.velocity.normalize().scale(this.getPlayerSpeed());

		// Set animation based on direction (if multiple, just pick one)
		if (isLeft) {
			player.setFlipX(false);
			player.anims.play("left-walk", true);
			this.playWalkSound();
			this.finishPlayerAppear();
			MainEvents.emit(Events.PlayerMoved);
		} else if (isRight) {
			player.setFlipX(true);
			player.anims.play("left-walk", true);
			this.playWalkSound();
			this.finishPlayerAppear();
			MainEvents.emit(Events.PlayerMoved);
		} else if (isUp) {
			player.anims.play("up-walk", true);
			this.playWalkSound();
			this.finishPlayerAppear();
			MainEvents.emit(Events.PlayerMoved);
		} else if (isDown) {
			player.anims.play("down-walk", true);
			this.playWalkSound();
			this.finishPlayerAppear();
			MainEvents.emit(Events.PlayerMoved);
		} else {
			this.walkSound.stop();
			this.setPlayerIdleFrame();
		}
		this.resetPlayerHitBox();
	}

	playWalkSound() {
		if (this.walkSound.isPlaying) {
			return;
		}
		this.walkSound.play();
	}

	updatePlayerTint() {
		const player = getPlayerOrThrow();
		if (this.getPlayerHitPoints() === 0) {
			player.setTint(0xff0000);
			return;
		}
		if (this.isPlayerBeingHit()) {
			player.setTint(0xff8587);
			return;
		}
		if (this.isPlayerFrozen()) {
			player.setTint(0x0000ff);
			return;
		}
		player.clearTint();
	}

	updatePlayerAlpha() {
		const player = getPlayerOrThrow();
		if (this.isGameOver) {
			return;
		}
		if (this.isPlayerInvincible()) {
			player.setAlpha(0.5);
		} else {
			player.clearAlpha();
		}
	}

	updateHealEffectPosition() {
		const player = getPlayerOrThrow();
		if (this.healEffect) {
			this.healEffect.setPosition(
				player.body.center.x + 1,
				player.body.center.y - 1
			);
		}
	}

	updateHeartCard() {
		if (!isAuraActive(this.registry, "HeartCard")) {
			return;
		}
		if (this.heartCardTimer) {
			return;
		}
		this.heartCardTimer = this.time.addEvent({
			repeat: -1,
			delay: config.heartCardHealTime,
			callback: () => {
				this.setPlayerHitPoints(this.getPlayerHitPoints() + 1);
			},
		});
	}

	updateStatusIcon() {
		const player = getPlayerOrThrow();
		if (this.statusIcon) {
			const newX = player.body.center.x - config.statusIconOffsetX;
			if (newX !== this.statusIcon.x) {
				this.statusIcon.x = newX;
			}
			const newY = player.body.center.y - config.statusIconOffsetY;
			if (newY !== this.statusIcon.y) {
				this.statusIcon.y = newY;
			}
			this.restartStatusBounce();
		}
	}

	updatePlayer(): void {
		this.updatePlayerTint();
		this.updatePlayerAlpha();
		const player = getPlayerOrThrow();

		savePlayerPositionToRegistry(
			this.registry,
			getSavedDataPlayerPosition(getMap(), player.x, player.y)
		);

		this.updateSwordHitbox();
		this.updatePowerHitboxPosition();
		this.updatePlayerMovement();
		this.updateHealEffectPosition();
		this.updateHeartCard();

		// Keep in mind that the player may be moving unintentionally (eg: via knockback).
		const isMoving =
			player.body.velocity.x !== 0 || player.body.velocity.y !== 0;
		if (isMoving) {
			// This differs from PlayerMoved because this is any movement and PlayerMoved is intentional movement.
			MainEvents.emit(Events.PlayerPositionChanged);
			this.maybeChangeRoom();
			this.maybePickUpItem();
			this.updateStatusIcon();
		}
	}

	setPlayerIdleFrame() {
		const player = getPlayerOrThrow();
		// If the player stops moving, stop animations and reset the image to an idle frame in the correct direction.
		player.setFlipX(false);
		switch (this.playerDirection) {
			case SpriteLeft:
				player.anims.play("idle-left", true);
				return;
			case SpriteRight:
				player.setFlipX(true);
				player.anims.play("idle-left", true);
				return;
			case SpriteUp:
				player.anims.play("idle-up", true);
				return;
			case SpriteDown:
				player.anims.play("idle-down", true);
				return;
		}
	}

	resetPlayerHitBox() {
		const player = getPlayerOrThrow();
		player.body.setSize(config.playerHitBoxWidth, config.playerHitBoxHeight);
		player.setOrigin(config.playerOriginX, config.playerOriginY);
		player.body.setOffset(
			player.body.offset.x + config.playerHitBoxOffsetX,
			player.body.offset.y + config.playerHitBoxOffsetY
		);
	}
}
