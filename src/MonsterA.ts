import {
	SpriteUp,
	SpriteRight,
	SpriteDown,
	SpriteLeft,
	getDirectionOfSpriteMovement,
	isDynamicSprite,
} from "./shared";

export class MonsterA extends Phaser.Physics.Arcade.Sprite {
	enemySpeed: number = 40;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, "monsters1", 54);

		scene.add.existing(this);
		scene.physics.add.existing(this);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setDepth(1);
		this.setSize(this.width * 0.35, this.height * 0.35);
		this.setOffset(this.body.offset.x, this.body.offset.y + 9);
		this.setPushable(false);
		this.setDataEnabled();
		this.data.set("hittable", true);
		this.on("hit", this.hit);
		this.on("kill", this.hit);

		this.initSprites();
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 54,
				end: 56,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 66,
				end: 68,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 78,
				end: 80,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 90,
				end: 92,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "explode",
			frames: this.anims.generateFrameNumbers("monster_explode1"),
			frameRate: 20,
		});
	}

	update() {
		if (!this.body || !isDynamicSprite(this)) {
			throw new Error("Could not update monster");
		}
		const body = this.body;
		if (!this.active) {
			body.stop();
			return;
		}
		if (this.data.get("stunned")) {
			return;
		}

		// If we are not moving, move in a random direction. If we are moving, keep
		// moving in that direction.
		const previousDirection = getDirectionOfSpriteMovement(body);
		if (previousDirection) {
			return;
		}
		const direction = Phaser.Math.Between(0, 3);
		switch (direction) {
			case SpriteUp:
				this.anims.play("up", true);
				body.setVelocityY(-this.enemySpeed);
				break;
			case SpriteRight:
				this.anims.play("right", true);
				body.setVelocityX(this.enemySpeed);
				break;
			case SpriteDown:
				this.anims.play("down", true);
				body.setVelocityY(this.enemySpeed);
				break;
			case SpriteLeft:
				this.anims.play("left", true);
				body.setVelocityX(-this.enemySpeed);
				break;
		}
	}

	hit() {
		this.setVelocity(0);
		this.data.set("stunned", true);
		this.setOrigin(0.5, 0.3);
		this.anims.play("explode", true);
		this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.destroy();
		});
	}
}
