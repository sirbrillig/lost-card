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

	constructor(
		scene: Phaser.Scene,
		x: number,
		y: number,
		registerEnemy: (enemy: Phaser.Physics.Arcade.Sprite) => void
	) {
		super(scene, x, y, "logman");

		scene.add.existing(this);
		scene.physics.add.existing(this);
		registerEnemy(this);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setDepth(1);
		this.setSize(this.width * 0.45, this.height * 0.55);
		this.setOffset(this.body.offset.x, this.body.offset.y + 5);
		this.setPushable(false);
		this.setDataEnabled();
		this.data.set("hittable", true);
		this.on("hit", this.hit);
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

	hit() {
		this.destroy();
	}
}
