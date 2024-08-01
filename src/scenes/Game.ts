import { Scene } from "phaser";

// 0 is up, 1 is right, 2 is down, 3 is left
const SpriteUp = 0;
const SpriteRight = 1;
const SpriteDown = 2;
const SpriteLeft = 3;
type SpriteDirection =
	| typeof SpriteUp
	| typeof SpriteRight
	| typeof SpriteDown
	| typeof SpriteLeft;

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
		this.doorsLayer = this.createTileLayer("Doors", tileset, 0);
		this.stuffLayer = this.createTileLayer("Stuff", tileset, 0);

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
		this.physics.add.collider(this.player, layer);
		this.physics.add.collider(this.enemies, layer);
		return layer;
	}

	setUpCamera(): void {
		const camera = this.cameras.main;
		camera.setZoom(6);
		// Focus the camera on the room that the player currently is in.
		const tileWidth = 16;
		const tileHeight = 16;
		const [x, y] = this.getRoomCoodinatesForPoint(
			this.player.x + tileWidth,
			this.player.y + tileHeight
		);
		this.moveCameraToPosition(x, y);

		this.doors = this.map.filterObjects("MetaObjects", (obj) => {
			if (!("properties" in obj)) {
				return;
			}
			const destinationId = obj.properties.find(
				(prop) => prop.name === "doorto"
			)?.value;
			if (!destinationId) {
				return false;
			}
			return true;
		});
	}

	moveCameraToRoomWithTile(tile: Phaser.Types.Tilemaps.TiledObject) {
		const tileWidth = 16;
		const tileHeight = 16;
		const [x, y] = this.getRoomCoodinatesForPoint(
			tile.x + tileWidth,
			tile.y + tileHeight
		);
		this.moveCameraToPosition(x, y);
	}

	moveCameraToPosition(x: number, y: number) {
		const camera = this.cameras.main;
		camera.setBounds(x, y, 190, 144);
	}

	getRoomCoodinatesForPoint(x: number, y: number): [number, number] {
		const roomWidth = 192;
		const roomHeight = 144;
		return [
			Math.floor(x / roomWidth) * roomWidth,
			Math.floor(y / roomHeight) * roomHeight,
		];
	}

	handleCollideDoor(door) {
		const destinationId = door.properties.find((prop) => prop.name === "doorto")
			?.value;
		if (!destinationId) {
			throw new Error("Hit door without destination id");
		}
		const destinationTile = this.map.findObject(
			"MetaObjects",
			(obj) => obj.id === destinationId
		);
		if (!destinationTile) {
			throw new Error("Hit door without destination tile");
		}
		this.moveCameraToRoomWithTile(destinationTile);
	}

	update() {
		this.enemies.getChildren().forEach((enemy) => {
			if (isDynamicSprite(enemy)) {
				this.updateEnemy(enemy);
			}
		});
		this.updatePlayer();
	}

	updateRoomPosition() {
		const touchingDoor = this.doors.find((door) => {
			if (
				this.player.x >= door.x &&
				this.player.x < door.x + 16 &&
				this.player.y >= door.y - 16 &&
				this.player.y < door.y - 16 + 16
			) {
				return true;
			}
			return false;
		});
		// if the player enters a door, teleport them to the corresponding door
		if (touchingDoor) {
			const oneTileDistance = 16;
			const destinationX = (() => {
				if (this.playerDirection === SpriteLeft) {
					return touchingDoor.x - oneTileDistance;
				}
				if (this.playerDirection === SpriteRight) {
					return touchingDoor.x + oneTileDistance * 2;
				}
				return this.player.x;
			})();
			const destinationY = (() => {
				if (this.playerDirection === SpriteUp) {
					return touchingDoor.y - oneTileDistance;
				}
				if (this.playerDirection === SpriteDown) {
					return touchingDoor.y + oneTileDistance * 2;
				}
				return this.player.y;
			})();
			this.movePlayerToPoint(destinationX, destinationY);

			// if the player enters a door, move the camera to that room
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
		for (let x = 0; x < 0; x++) {
			this.createEnemy();
		}
	}

	createEnemy(): void {
		let creature = this.physics.add.sprite(
			Phaser.Math.Between(10, 800),
			Phaser.Math.Between(10, 600),
			"logman",
			0
		);
		creature.setSize(creature.width * 0.55, creature.height * 0.65);
		creature.setOffset(creature.body.offset.x, creature.body.offset.y + 5);
		this.enemies.add(creature);
		creature.setCollideWorldBounds(true);
		creature.setPushable(false);
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
		const enemyDirection = this.getDirectionOfSpriteMovement(enemy.body);
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

	getDirectionOfSpriteMovement(
		body: Phaser.Physics.Arcade.Body
	): null | SpriteDirection {
		if (body.velocity.x > 0) {
			return SpriteRight;
		}
		if (body.velocity.x < 0) {
			return SpriteLeft;
		}
		if (body.velocity.y > 0) {
			return SpriteDown;
		}
		if (body.velocity.y < 0) {
			return SpriteUp;
		}
		return null;
	}

	updateEnemy(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
		const body = enemy.body;

		// If we are not moving, move in a random direction. If we are moving, keep
		// moving in that direction.
		const previousDirection = this.getDirectionOfSpriteMovement(body);
		const direction =
			previousDirection === null
				? Phaser.Math.Between(0, 3)
				: previousDirection;
		switch (direction) {
			case SpriteUp:
				enemy.anims.play("logman-up-walk", true);
				body.setVelocityY(-this.enemySpeed);
				break;
			case SpriteRight:
				enemy.anims.play("logman-right-walk", true);
				body.setVelocityX(this.enemySpeed);
				break;
			case SpriteDown:
				enemy.anims.play("logman-down-walk", true);
				body.setVelocityY(this.enemySpeed);
				break;
			case SpriteLeft:
				enemy.anims.play("logman-left-walk", true);
				body.setVelocityX(-this.enemySpeed);
				break;
		}
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
			this.updateRoomPosition();
		} else if (this.cursors.right.isDown) {
			this.player.anims.play("character-right-walk", true);
			this.playerDirection = SpriteRight;
			this.updateRoomPosition();
		} else if (this.cursors.down.isDown) {
			this.player.anims.play("character-down-walk", true);
			this.playerDirection = SpriteDown;
			this.updateRoomPosition();
		} else if (this.cursors.up.isDown) {
			this.player.anims.play("character-up-walk", true);
			this.playerDirection = SpriteUp;
			this.updateRoomPosition();
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

function isDynamicSprite(
	obj: unknown
): obj is Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
	const dynObj = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	return "setVelocityX" in dynObj;
}

function isDynamicImage(
	obj: unknown
): obj is Phaser.Types.Physics.Arcade.ImageWithDynamicBody {
	const dynObj = obj as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
	return "body" in dynObj;
}
