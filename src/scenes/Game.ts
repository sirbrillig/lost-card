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
	enemies: Phaser.Physics.Arcade.Group;
	characterSpeed: number = 80;
	enemySpeed: number = 60;
	framesSincePlayerHit: number = 0;
	framesSinceAttack: number = 0;
	playerDirection: SpriteDirection = 2;
	landLayer: Phaser.Tilemaps.TilemapLayer;
	objectLayer: Phaser.Tilemaps.TilemapLayer;

	constructor() {
		super("Game");
	}

	create() {
		const map = this.make.tilemap({ key: "map" });
		const tileset = map.addTilesetImage("outside", "overworld_tiles");
		if (!tileset) {
			return;
		}

		const landLayer = map.createLayer("Tile Layer 1", tileset, 0, 0);
		const objectLayer = map.createLayer("Tile Layer 2", tileset, 0, 0);
		if (!landLayer || !objectLayer) {
			return;
		}
		this.landLayer = landLayer;
		this.objectLayer = objectLayer;

		landLayer.setCollisionByProperty({ collides: true });
		objectLayer.setCollisionByProperty({ collides: true });

		this.createPlayer();
		this.createEnemies();

		this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
			if (isDynamicSprite(player) && isDynamicSprite(enemy)) {
				this.enemyHitPlayer(player, enemy);
			}
		});

		const camera = this.cameras.main;
		camera.startFollow(this.player);
		camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

		if (!this.input.keyboard) {
			return null;
		}

		this.cursors = this.input.keyboard.createCursorKeys();

		// Constrain the camera so that it isn't allowed to move outside the width/height of tilemap
		camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
	}

	update() {
		this.enemies.getChildren().forEach((enemy) => {
			if (isDynamicSprite(enemy)) {
				this.updateEnemy(enemy);
			}
		});
		this.updatePlayer();
	}

	getPlayerSpeed(): number {
		return this.characterSpeed;
	}

	createPlayer(): void {
		this.player = this.physics.add.sprite(400, 350, "character", 0);
		this.player.setSize(15, 20).setOffset(1, 14);

		const anims = this.anims;
		anims.create({
			key: "character-down-walk",
			frames: anims.generateFrameNumbers("character", { start: 0, end: 3 }),
			frameRate: 10,
			repeat: -1,
		});
		anims.create({
			key: "character-right-walk",
			frames: anims.generateFrameNumbers("character", { start: 17, end: 20 }),
			frameRate: 10,
			repeat: -1,
		});
		anims.create({
			key: "character-up-walk",
			frames: anims.generateFrameNumbers("character", { start: 34, end: 37 }),
			frameRate: 10,
			repeat: -1,
		});
		anims.create({
			key: "character-left-walk",
			frames: anims.generateFrameNumbers("character", { start: 51, end: 54 }),
			frameRate: 10,
			repeat: -1,
		});

		anims.create({
			key: "character-down-attack",
			frames: anims.generateFrameNumbers("character", { start: 5, end: 7 }),
			frameRate: 20,
			repeat: 0,
		});
		anims.create({
			key: "character-right-attack",
			frames: anims.generateFrameNumbers("character", { start: 22, end: 24 }),
			frameRate: 20,
			repeat: 0,
		});
		anims.create({
			key: "character-up-attack",
			frames: anims.generateFrameNumbers("character", { start: 39, end: 41 }),
			frameRate: 20,
			repeat: 0,
		});
		anims.create({
			key: "character-left-attack",
			frames: anims.generateFrameNumbers("character", { start: 56, end: 58 }),
			frameRate: 20,
			repeat: 0,
		});

		this.physics.add.collider(this.player, this.landLayer);
		this.physics.add.collider(this.player, this.objectLayer);
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
		for (let x = 0; x < 2; x++) {
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
		this.enemies.add(creature);
		this.physics.add.collider(creature, this.landLayer);
		this.physics.add.collider(creature, this.objectLayer);
		creature.setCollideWorldBounds(true);
		creature.setPushable(false);
	}

	enemyHitPlayer(
		player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
		enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
	): void {
		if (this.framesSincePlayerHit > 0) {
			return;
		}

		if (this.framesSinceAttack > 0) {
			enemy.destroy();
			return;
		}

		// Bounce the player off the enemy in a random direction perpendicular to
		// the movement of the enemy so we don't get hit again immediately.
		const enemyDirection = this.getSpriteDirection(enemy.body);
		const direction = Phaser.Math.Between(0, 1);
		const bounceSpeed = this.getPlayerSpeed() * 4;
		const bounceVelocity = direction === 1 ? bounceSpeed : -bounceSpeed;
		switch (enemyDirection) {
			case 0:
				player.body.setVelocityX(bounceVelocity);
				break;
			case 1:
				player.body.setVelocityY(bounceVelocity);
				break;
			case 2:
				player.body.setVelocityX(bounceVelocity);
				break;
			case 3:
				player.body.setVelocityY(bounceVelocity);
				break;
		}

		this.framesSincePlayerHit = 10;
	}

	getSpriteDirection(body: Phaser.Physics.Arcade.Body): null | 0 | 1 | 2 | 3 {
		if (body.velocity.x > 0) {
			return 1;
		}
		if (body.velocity.x < 0) {
			return 3;
		}
		if (body.velocity.y > 0) {
			return 2;
		}
		if (body.velocity.y < 0) {
			return 0;
		}
		return null;
	}

	updateEnemy(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
		const body = enemy.body;

		// If we are not moving, move in a random direction. If we are moving, keep
		// moving in that direction.
		const previousDirection = this.getSpriteDirection(body);
		const direction =
			previousDirection === null
				? Phaser.Math.Between(0, 3)
				: previousDirection;
		switch (direction) {
			case 0:
				enemy.anims.play("logman-up-walk", true);
				body.setVelocityY(-this.enemySpeed);
				break;
			case 1:
				enemy.anims.play("logman-right-walk", true);
				body.setVelocityX(this.enemySpeed);
				break;
			case 2:
				enemy.anims.play("logman-down-walk", true);
				body.setVelocityY(this.enemySpeed);
				break;
			case 3:
				enemy.anims.play("logman-left-walk", true);
				body.setVelocityX(-this.enemySpeed);
				break;
		}
	}

	updatePlayer(): void {
		if (this.framesSincePlayerHit > 0) {
			this.framesSincePlayerHit -= 1;
			this.player.setVisible(
				this.framesSincePlayerHit % 2 === 0 ? true : false
			);
			return;
		}

		if (this.framesSinceAttack > 0) {
			// Stop moving if attacking
			this.player.body.setVelocityY(0);
			this.player.body.setVelocityX(0);

			this.framesSinceAttack -= 1;
			const playerDirection = this.playerDirection;
			switch (playerDirection) {
				case 0:
					this.player.anims.play("character-up-attack", true);
					break;
				case 1:
					this.player.anims.play("character-right-attack", true);
					break;
				case 2:
					this.player.anims.play("character-down-attack", true);
					break;
				case 3:
					this.player.anims.play("character-left-attack", true);
					break;
			}
			return;
		}
		if (this.cursors.space.isDown && this.framesSinceAttack === 0) {
			this.framesSinceAttack = 50;
		}

		this.player.body.setVelocity(0);
		this.player.setVisible(true);

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
	}

	setPlayerIdleFrame() {
		// If the player stops moving, stop animations and reset the image to an idle frame in the correct direction.
		this.player.anims.stop();
		switch (this.playerDirection) {
			case SpriteLeft:
				this.player.setFrame(51);
				return;
			case SpriteRight:
				this.player.setFrame(17);
				return;
			case SpriteUp:
				this.player.setFrame(34);
				return;
			case SpriteDown:
				this.player.setFrame(0);
				return;
		}
	}
}

function isDynamicSprite(
	obj: unknown
): obj is Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
	const dynObj = obj as Phaser.Physics.Arcade.Body;
	return "setVelocityX" in dynObj;
}
