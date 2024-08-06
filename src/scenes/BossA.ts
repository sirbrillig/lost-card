import {
	SpriteUp,
	SpriteRight,
	SpriteDown,
	SpriteLeft,
	getDirectionOfSpriteMovement,
	isDynamicSprite,
} from "../shared";

export class BossA extends Phaser.Physics.Arcade.Sprite {
	enemySpeed: number = 40;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, "logman");

		scene.add.existing(this);
		scene.physics.add.existing(this);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setDepth(1);
		this.setSize(this.width * 0.55, this.height * 0.65);
		this.setOffset(this.body.offset.x, this.body.offset.y + 5);
		this.setCollideWorldBounds(true);
		this.setPushable(false);
		this.setScale(2);
	}

	update() {
		if (!this.body || !isDynamicSprite(this.body)) {
			throw new Error("Could not update monster");
		}
		const body = this.body;
		if (!this.active) {
			body.stop();
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
				this.anims.play("logman-up-walk", true);
				body.setVelocityY(-this.enemySpeed);
				break;
			case SpriteRight:
				this.anims.play("logman-right-walk", true);
				body.setVelocityX(this.enemySpeed);
				break;
			case SpriteDown:
				this.anims.play("logman-down-walk", true);
				body.setVelocityY(this.enemySpeed);
				break;
			case SpriteLeft:
				this.anims.play("logman-left-walk", true);
				body.setVelocityX(-this.enemySpeed);
				break;
		}
	}
}
