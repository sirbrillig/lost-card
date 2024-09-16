import { Scene } from "phaser";
import { soundKeys, musicKeys } from "../sound";
import { config } from "../config";
import { MainEvents } from "../MainEvents";
import { EnemyManager } from "../EnemyManager";
import { MountainMonster } from "../MountainMonster";
import { Ghost } from "../Ghost";
import { BlackOrb } from "../BlackOrb";
import { FinalBoss } from "../FinalBoss";
import { Skeleton } from "../Skeleton";
import { CloudGoblin } from "../CloudGoblin";
import { SkyBlob } from "../SkyBlob";
import { PlantBug } from "../PlantBug";
import { IceMonster } from "../IceMonster";
import { FireMonster } from "../FireMonster";
import { FireGiant } from "../FireGiant";
import { FireSpout } from "../FireSpout";
import { WaterDipper } from "../WaterDipper";
import { GreatGhost } from "../GreatGhost";
import { MountainBoss } from "../MountainBoss";
import { PlantSpitter } from "../PlantSpitter";
import { SkyBlobSpitter } from "../SkyBlobSpitter";
import { IceBoss } from "../IceBoss";
import { PlantBoss } from "../PlantBoss";
import { SpiritBoss } from "../SpiritBoss";
import { CloudBoss } from "../CloudBoss";
import { FireBoss } from "../FireBoss";
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
	doRectanglesOverlap,
	auraOrder,
} from "../shared";

export class Game extends Scene {
	debugGraphic: Phaser.GameObjects.Graphics | undefined;
	layerDebugGraphic: Phaser.GameObjects.Graphics | undefined;
	player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	sword: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	power: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	healEffect: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | undefined;
	attackSprite: Phaser.GameObjects.Sprite;
	enemyManager: EnemyManager;
	enemyCollider: Phaser.Physics.Arcade.Collider;
	isGameOver: boolean = false;

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

	hasPlayerMovedSinceAppearing: boolean = false;
	lastAttackedAt: number = 0;
	lastPowerAt: number = 0;
	lastDialogData: { heading: string; text?: string } | undefined;
	playerDirection: SpriteDirection = SpriteDown;
	enteredRoomAt: number = 0;
	isPlayerBeingKnockedBack: boolean = false;
	heartCardTimer: Phaser.Time.TimerEvent | undefined;

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

	map: Phaser.Tilemaps.Tilemap;
	landLayer: Phaser.Tilemaps.TilemapLayer;
	hiddenRoomLayer: Phaser.Tilemaps.TilemapLayer;
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
		this.hasPlayerMovedSinceAppearing = false;
		this.cameras.main.fadeIn(config.sceneStartFadeTime);
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
					(tile.properties.isWater || tile.properties.isLava) &&
					this.hasAura("FishCard")
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
				if (this.player.data.get("isPlantCardGrappleActive")) {
					return false;
				}
				return true;
			}
		);
		this.physics.add.collider(
			this.hiddenRoomLayer,
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
					(tile.properties.isWater || tile.properties.isLava) &&
					this.hasAura("FishCard")
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
				if (this.player.data.get("isPlantCardGrappleActive")) {
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
		this.stuffLayer = this.createTileLayer("Stuff", tilesetTile, 0);
		this.physics.add.collider(this.stuffLayer, this.player, undefined, () => {
			if (this.isPlayerUsingPower() && this.getActivePower() === "SpiritCard") {
				return false;
			}
			if (this.player.data.get("isPlantCardGrappleActive")) {
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

		this.physics.add.collider(this.createdFinalDoors, this.player, (tile) => {
			this.checkFinalDoor(tile);
		});

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
				if (this.isPlayerInvincible() || this.isPlayerHiddenInvincible()) {
					return false;
				}
				if (!enemy.visible || !enemy.active) {
					return false;
				}
				if (enemy.data?.get(DataKeys.Stunned)) {
					return false;
				}
				return true;
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
			if (this.isPlayerInvincible() || this.isPlayerHiddenInvincible()) {
				return;
			}
			this.setPlayerFrozen(setting);
		});

		this.recordSecretRoomsTotal();
	}

	recordSecretRoomsTotal() {
		const secretRoomsCount = getRooms(this.map).filter((room) =>
			room.name.includes("Secret")
		).length;
		this.registry.set(DataKeys.SecretRoomsTotal, secretRoomsCount);
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
			this.sound.stopAll();
			this.showDialog({
				heading: "Golden door",
				text: "The survivors of the kingdoms are trapped behind this door but it requires six keys to open.",
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
		const destinationTile = this.map.findObject(
			"FinalDoor",
			(obj: unknown) => getObjectId(obj) === config.finalBossDoorInside
		);
		if (!destinationTile) {
			throw new Error("Hit door without destination tile");
		}
		const destinationDirection = SpriteUp;
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
			this.setPlayerInvincible(true);
		});

		this.input.keyboard.on("keydown-SIX", () => {
			if (!isCheatMode) {
				return;
			}
			this.scene.pause("Game");
			this.scene.launch("Debug");
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
		const totalHitPoints = this.getPlayerTotalHitPoints();
		this.healSound.play();
		if (this.healEffect) {
			this.healEffect.destroy();
		}
		const healEffect = this.add.sprite(
			this.player.body.center.x + 1,
			this.player.body.center.y - 1,
			"use-potion-charge",
			0
		);
		this.physics.add.existing(healEffect);
		if (!isDynamicSprite(healEffect)) {
			throw new Error("Heal effect is not a sprite");
		}
		this.healEffect = healEffect;
		this.healEffect.setDepth(5);
		this.healEffect.setAlpha(0.8);
		this.healEffect.anims.play("use-potion-charge");
		if (this.getPlayerHitPoints() === totalHitPoints) {
			this.healEffect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
				this.healEffect?.setVisible(false);
			});
			return;
		}
		this.healEffect.anims.chain("use-potion");
		this.healEffect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			const name = this.healEffect?.anims.getName();
			if (name === "use-potion") {
				this.healEffect?.destroy();
			}
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
		this.enemyManager.map.removeTile(tile, iceTileFrame);
		this.time.addEvent({
			delay: config.iceMeltTime,
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
				delay: config.iceMeltTime,
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
		this.hiddenRoomLayer.setCollisionByProperty({ collides: true });
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
		if (this.getPlayerHitPoints() === 0) {
			return;
		}
		localStorage.setItem("lost-card-save", JSON.stringify(this.getSaveData()));
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
		const itemsRemoved: Array<number> =
			this.registry.get(DataKeys.CollectedItems) ?? [];
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

		this.recordRoomVisit(room.name);
	}

	recordRoomVisit(roomName: string) {
		if (!roomName.includes("Secret")) {
			return;
		}
		const secretRooms = this.registry.get(DataKeys.SecretRoomsFound) ?? [];
		secretRooms.push(roomName);
		this.registry.set(DataKeys.SecretRoomsFound, secretRooms);
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
		const distance = Phaser.Math.Distance.BetweenPoints(
			gatePosition,
			this.player.body.center
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

		const destinationDirection = door.data.get("doordirection");
		if (destinationDirection === undefined) {
			throw new Error("Door has no destination direction");
		}

		if (this.playerDirection !== destinationDirection) {
			return;
		}

		const destinationTile = this.map.findObject(
			"Doors",
			(obj: unknown) => getObjectId(obj) === destinationId
		);
		if (!destinationTile) {
			throw new Error("Hit door without destination tile");
		}

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
			this.map.filterObjects("Creatures", (point) => {
				if (!hasXandY(point)) {
					return false;
				}
				return isPointInRegion(this.map, point.x, point.y, region);
			}) ?? [];
	}

	checkForGameOver() {
		if (this.getPlayerHitPoints() <= 0 && !this.isGameOver) {
			this.setPlayerHiddenInvincible(true);
			this.player.stop();
			this.player.body.setVelocity(0);
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
		this.checkForMountainBossDoorGate();
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

	checkForMountainBossDoorGate() {
		if (this.enemyManager.activeRoom?.name !== "MKBoss") {
			return;
		}
		const mountainBossActivationArea = this.map.findObject(
			"MetaObjects",
			(obj) => obj.name === "MountainBossActivateRocks"
		);
		if (!mountainBossActivationArea) {
			return;
		}
		if (
			doRectanglesOverlap(this.player, {
				x: mountainBossActivationArea.x ?? 0,
				y: mountainBossActivationArea.y ?? 0,
				width: mountainBossActivationArea.width ?? 0,
				height: mountainBossActivationArea.height ?? 0,
			})
		) {
			const transientTiles = this.enemyManager.activeRoom
				? getItemsInRoom(this.createdTiles, this.enemyManager.activeRoom)
				: [];

			// Don't consider tiles which are already visible.
			const appearingTiles = transientTiles.filter(
				(tile) => tile.visible === false
			);

			appearingTiles.forEach((tile) => {
				if (tile.data.get("manualActivation") !== true) {
					return;
				}
				this.makeAppearingTileAppear(tile);
			});
		}
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

		// The plant card moves you next to the target, over any land obstacle
		this.player.data.set("isPlantCardGrappleActive", true);
		this.physics.moveToObject(this.player, tile, config.plantCardVelocity);
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
		const playerPosition = new Phaser.Math.Vector2(
			this.player.body.center.x,
			this.player.body.center.y
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
		const transientTiles = this.enemyManager.activeRoom
			? getItemsInRoom(this.createdTiles, this.enemyManager.activeRoom)
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
		tile.setVisible(true);
		const tileFinalHeight = tile.y;
		const tileInitialHeight = 70;
		const tileInitialAlpha = 0.4;
		let height = tile.y - tileInitialHeight;
		let alpha = tileInitialAlpha;
		tile.setAlpha(alpha);
		tile.setPosition(tile.x, height);
		this.tweens.add({
			targets: tile,
			x: tile.x,
			y: tileFinalHeight,
			duration: speed,
			onComplete: () => {
				this.showTransientTile(tile);
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
		this.physics.add.collider(
			this.player,
			tile,
			() => {
				if (this.player.data.get("isPlantCardGrappleActive")) {
					// In case we were being pulled by the PlantCard
					this.player.data.set("isPlantCardGrappleActive", false);
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

		if (this.physics.overlap(this.player, tile)) {
			this.enemyHitPlayer();
		}

		this.createdTiles.push(tile);

		if (this.enemyManager.activeRoom) {
			// Just in case the tile was created outside the current room.
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
	}

	hideHiddenItems() {
		this.createdItems.forEach((item) => {
			if (item.data.get("hidden")) {
				// If the item has been previous revealed, do not hide it.
				const itemId: number | undefined = item.data.get(DataKeys.ItemObjectId);
				const shownItems: number[] =
					this.registry.get(DataKeys.RevealedItems) ?? [];
				if (itemId && !shownItems.includes(itemId)) {
					item.setVisible(false);
					item.setActive(false);
				}
			}
		});
	}

	getAllHiddenItemsInRoom(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] {
		return this.createdItems.filter((item) => {
			if (!this.enemyManager.activeRoom) {
				return false;
			}
			if (!isPointInRoom(item.x, item.y, this.enemyManager.activeRoom)) {
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
			const shownItems = this.registry.get(DataKeys.RevealedItems) ?? [];
			shownItems.push(itemId);
			this.registry.set(DataKeys.RevealedItems, shownItems);
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
			if (name === "appear" && progress > 0.8) {
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
		const touchingDoor = getItemTouchingPlayer(this.createdDoors, this.player);
		if (touchingDoor) {
			this.handleCollideDoor(touchingDoor);
		}
	}

	maybePickUpItem() {
		const touchingItem = getItemTouchingPlayer(this.createdItems, this.player);
		if (touchingItem && touchingItem.active) {
			switch (touchingItem.name) {
				case "Sword":
					this.pickUpSword();
					break;
				case "PotionBottle":
					this.pickUpPotion();
					break;
				case "PotionVial":
					this.pickUpPotionVial();
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
		return this.map.findObject("Items", (obj) => {
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
		this.createdItems = this.createdItems.filter(
			(item) => item !== itemToRemove
		);
		const itemsRemoved = this.registry.get(DataKeys.CollectedItems) ?? [];
		const itemObject = this.findItemObjectMatchingCreatedItem(itemToRemove);
		if (!itemObject) {
			return;
		}
		itemsRemoved.push(itemObject.id);
		this.registry.set(DataKeys.CollectedItems, itemsRemoved);
		itemToRemove.destroy();
	}

	getPlayerHitPoints(): number {
		return (
			this.registry.get("playerHitPoints") ?? config.playerInitialHitPoints
		);
	}

	getPlayerTotalHitPoints(): number {
		return (
			this.registry.get("playerTotalHitPoints") ?? config.playerInitialHitPoints
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
		this.registry.set("playerHitPoints", hitPoints);
	}

	setKeyCount(count: number) {
		this.registry.set(DataKeys.KeyCount, count);
	}

	getKeyCount(): number {
		return this.registry.get(DataKeys.KeyCount) ?? 0;
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
		this.registry.set("playerTotalHitPoints", playerTotalHitPoints);
		this.restorePlayerHitPoints();
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

	getCardNameForPower(card: Powers | Auras): string {
		switch (card) {
			case "MountainCard":
				return "Mountain Card";
			case "FishCard":
				return "Fish Card";
			case "ClockCard":
				return "Clock Card";
			case "SwordCard":
				return "Sword Card";
			case "HeartCard":
				return "Heart Card";
			case "SunCard":
				return "Sun Card";
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

	getAuraDescription(card: Auras): string {
		switch (card) {
			case "FishCard":
				return "You can now walk through water or lava safely.";
			case "ClockCard":
				return "Your powers can be used more frequently.";
			case "HeartCard":
				return "Given time, your hearts will slowly restore on their own.";
			case "MountainCard":
				return "You can no longer be pushed by attacks or when attacking.";
			case "SwordCard":
				return "Your sword will now deal considerably more damage per hit.";
			case "SunCard":
				return "When you are hit, you will become invincible for a few moments.";
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
					heading: this.getCardNameForPower(card),
					text: this.getAuraDescription(card),
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
					heading: this.getCardNameForPower(card),
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

	pickUpPotionVial() {
		this.restorePlayerPotions();
		this.appearSound.play();
	}

	pickUpPotion() {
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
		this.player.anims.play("down-attack", true);
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
		this.player.setPosition(x, y);
		const room = getRoomForPoint(this.map, this.player.x, this.player.y);
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
			this.registry.set("playerTotalHitPoints", config.playerInitialHitPoints);
		}
		if (!this.registry.has("playerHitPoints")) {
			this.setPlayerHitPoints(config.playerInitialHitPoints);
		}
		this.scene.launch("Overlay");
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

		this.restorePlayerHitPoints();

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
		this.holyLoopSound.play();
		effect.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => {
			const name = effect.anims.getName();
			const progress = effect.anims.getProgress();
			if (name === "appear" && progress > 0.8) {
				this.setPlayerStunned(false);
				this.player.setVisible(true);
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

			const enemyType = point.name;
			if (this.wasBossDefeated(enemyType)) {
				return;
			}
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
				case "BlackOrb": {
					const monster = new BlackOrb(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
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
						this.markBossDefeated("GreatGhost");
						this.showAllHiddenItemsInRoom();
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
					monster.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("WaterDipper");
						this.showAllHiddenItemsInRoom();
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
				case "SkyBlobSpitter": {
					const monster = new SkyBlobSpitter(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					monster.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("SkyBlobSpitter");
						this.showAllHiddenItemsInRoom();
					});
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
				case "FireGiant": {
					const monster = new FireGiant(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					monster.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("FireGiant");
						this.showAllHiddenItemsInRoom();
					});
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
					const boss = new MountainBoss(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("MountainBoss");
						this.showAllHiddenItemsInRoom();
						this.saveGame();
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				case "IceBoss": {
					const boss = new IceBoss(this, this.enemyManager, point.x, point.y);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("IceBoss");
						this.showAllHiddenItemsInRoom();
						this.saveGame();
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				case "CloudBoss": {
					const boss = new CloudBoss(this, this.enemyManager, point.x, point.y);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("CloudBoss");
						this.showAllHiddenItemsInRoom();
						this.saveGame();
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				case "SpiritBoss": {
					const boss = new SpiritBoss(
						this,
						this.enemyManager,
						point.x,
						point.y
					);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("SpiritBoss");
						this.showAllHiddenItemsInRoom();
						this.saveGame();
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				case "PlantBoss": {
					const boss = new PlantBoss(this, this.enemyManager, point.x, point.y);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("PlantBoss");
						this.showAllHiddenItemsInRoom();
						this.saveGame();
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				case "FireBoss": {
					const boss = new FireBoss(this, this.enemyManager, point.x, point.y);
					boss.once(Events.MonsterDefeated, () => {
						this.markBossDefeated("FireBoss");
						this.showAllHiddenItemsInRoom();
						this.saveGame();
					});
					this.enemyManager.enemies.add(boss);
					break;
				}
				case "FinalBoss": {
					const boss = new FinalBoss(this, this.enemyManager, point.x, point.y);
					this.enemyManager.enemies.add(boss);
					boss.once(Events.MonsterDefeated, () => {
						this.showAllHiddenItemsInRoom();
					});
					break;
				}
				default:
					throw new Error(`Unknown enemy type "${enemyType}"`);
			}

			this.spawnPoints = this.spawnPoints.filter((pointB) => pointB !== point);
		});

		// It seems that we may need to do this again when enemies changes?
		this.physics.add.collider(this.createdDoors, this.enemyManager.enemies);
	}

	addPotionVialAt(x: number, y: number) {
		const potionVial = this.physics.add.sprite(x, y, "icons4", 34);
		this.physics.add.overlap(this.player, potionVial, () => {
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
			let damage = 1;
			if (this.hasAura("SwordCard")) {
				damage = 2;
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
			this.knockBack(
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

		this.physics.moveToObject(enemy, this.player, config.plantCardVelocity);
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
		if (!this.hasAura("MountainCard")) {
			this.knockBack(
				this.player.body,
				config.postHitEnemyKnockback,
				config.playerKnockBackSpeed,
				invertSpriteDirection(this.playerDirection),
				() => {}
			);
		}

		// Knock back monster when they are hit.
		this.pushEnemy(enemy);
	}

	gameOver() {
		if (!this.scene.isActive()) {
			return;
		}
		this.sound.stopAll();
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
		if (
			this.isPlayerBeingHit() ||
			this.isPlayerInvincible() ||
			this.isPlayerHiddenInvincible()
		) {
			return;
		}
		this.hitSound.play();

		this.setPlayerInvincible(true);
		this.enemyCollider.active = false;
		this.cameras.main.shake(300, 0.009);
		vibrate(this, 2, 300);
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
		this.heartCardTimer?.remove();
		this.heartCardTimer = undefined;

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
			delay: this.hasAura("SunCard")
				? config.sunCardInvincibilityTime
				: config.postHitInvincibilityTime,
			callback: () => {
				if (this.getPlayerHitPoints() > 0) {
					this.setPlayerInvincible(false);
				}
			},
		});

		if (!this.hasAura("MountainCard")) {
			this.setPlayerStunned(true);
			this.isPlayerBeingKnockedBack = true;
			this.knockBack(
				this.player.body,
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
			this.getTimeSinceLastAttack() > config.postAttackCooldown &&
			!this.isPlayerUsingPower()
		);
	}

	getPotionTotalCount(): number {
		return this.registry.get(DataKeys.PotionTotalCount) ?? 0;
	}

	setPotionTotalCount(count: number) {
		this.registry.set(DataKeys.PotionTotalCount, count);
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

	equipAura(card: Auras): void {
		this.registry.set(getPowerEquippedKey(card), true);
		MainEvents.emit(Events.AuraEquipped);
	}

	equipPower(power: Powers): void {
		this.registry.set(getPowerEquippedKey(power), true);
		this.setActivePower(power);
		MainEvents.emit(Events.PowerEquipped);
	}

	canPlayerUsePower(): boolean {
		const postPowerCooldown = this.hasAura("ClockCard")
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

	// Same as setPlayerInvincible but there will be no visual cue. Useful for
	// times when the player should just not be able to take damage like a "got
	// powerup" period.
	setPlayerHiddenInvincible(setting: boolean) {
		this.player.data?.set("invinciblePlayerHidden", setting);
	}

	setPlayerInvincible(setting: boolean) {
		this.player.data?.set("invinciblePlayer", setting);
	}

	isPlayerInvincible(): boolean {
		if (this.isPlayerUsingPower() && this.getActivePower() === "SpiritCard") {
			return true;
		}
		return this.player.data?.get("invinciblePlayer");
	}

	isPlayerHiddenInvincible(): boolean {
		return this.player.data?.get("invinciblePlayerHidden");
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
		this.setPlayerInvincible(true);
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
				this.power.anims.stop();
				this.power.anims.complete();
				this.sound.stopByKey("spirit");
				this.power.setAlpha(1);
				this.setPlayerInvincible(false);
			},
		});
	}

	playPowerAnimation(): void {
		this.lastPowerAt = this.time.now;
		this.power.setVelocity(0);
		this.power.setFlipX(false);
		this.power.setAlpha(1);
		switch (this.playerDirection) {
			case SpriteUp:
				switch (this.getActivePower()) {
					case "PlantCard":
						this.power.setRotation(Phaser.Math.DegToRad(90));
						this.power.setVelocity(0, -config.plantCardVelocity);
						this.power.anims.play("plant-power-right", true);
						this.power.setFlipX(true);
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						this.player.setVelocity(0, -config.cloudCardSpeed);
						this.player.anims.play("up-walk");
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
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						this.player.setVelocity(config.cloudCardSpeed, 0);
						this.player.anims.play("left-walk");
						this.player.setFlipX(true);
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
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						this.player.setVelocity(0, config.cloudCardSpeed);
						this.player.anims.play("down-walk");
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
						break;
					case "CloudCard":
						this.power.anims.play("cloud-power", true);
						this.player.setVelocity(-config.cloudCardSpeed, 0);
						this.player.anims.play("left-walk");
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
				this.setPlayerInvincible(false);
			},
		});
	}

	updatePlayerMovement(): void {
		if (!this.canPlayerMove()) {
			this.walkSound.stop();
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
			this.finishPlayerAppear();
			MainEvents.emit(Events.PlayerMoved);
		} else if (this.isPressingRight()) {
			this.player.setFlipX(true);
			this.player.anims.play("left-walk", true);
			this.playWalkSound();
			this.finishPlayerAppear();
			MainEvents.emit(Events.PlayerMoved);
		} else if (this.isPressingUp()) {
			this.player.anims.play("up-walk", true);
			this.playWalkSound();
			this.finishPlayerAppear();
			MainEvents.emit(Events.PlayerMoved);
		} else if (this.isPressingDown()) {
			this.player.anims.play("down-walk", true);
			this.playWalkSound();
			this.finishPlayerAppear();
			MainEvents.emit(Events.PlayerMoved);
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

	updatePlayerAlpha() {
		if (this.isPlayerInvincible()) {
			this.player.setAlpha(0.5);
		} else {
			this.player.clearAlpha();
		}
	}

	updateHealEffectPosition() {
		if (this.healEffect) {
			this.healEffect.setPosition(
				this.player.body.center.x + 1,
				this.player.body.center.y - 1
			);
		}
	}

	hasAura(aura: Auras): boolean {
		return this.registry.get(getPowerEquippedKey(aura));
	}

	updateHeartCard() {
		if (!this.hasAura("HeartCard")) {
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

	updatePlayer(): void {
		this.updatePlayerTint();
		this.updatePlayerAlpha();
		this.registry.set("playerX", this.player.x);
		this.registry.set("playerY", this.player.y);

		this.updateSwordHitbox();
		this.updatePowerHitboxPosition();
		this.updatePlayerMovement();
		this.updateHealEffectPosition();
		this.updateHeartCard();

		// Keep in mind that the player may be moving unintentionally (eg: via knockback).
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
