import { Scene } from "phaser";

const heartSize: number = 18;
const inactiveFrame = 13;
const activeFrame = 29;

class Heart {
	isActive: boolean = false;
	isImageActive: boolean = false;
	image: Phaser.GameObjects.Image;

	constructor(scene: Phaser.Scene, count: number) {
		const heart = scene.add
			.image(
				scene.cameras.main.x + heartSize * count,
				scene.cameras.main.y,
				"icons3",
				inactiveFrame
			)
			.setOrigin(0);
		heart.setDisplaySize(heartSize, heartSize);
		this.image = heart;
	}

	update() {
		if (this.isActive && !this.isImageActive) {
			this.image.setFrame(activeFrame);
			this.isImageActive = true;
		}
		if (!this.isActive && this.isImageActive) {
			this.image.setFrame(inactiveFrame);
			this.isImageActive = false;
		}
	}

	destroy() {
		this.image.destroy();
	}
}

export class Overlay extends Scene {
	hearts: Heart[] = [];
	totalHearts: number = 0;
	activeHearts: number = 0;

	constructor() {
		super("Overlay");
	}

	create() {
		console.log("creating overlay");
		this.add
			.nineslice(
				this.cameras.main.x,
				this.cameras.main.y,
				"panel4",
				0,
				150,
				20,
				8,
				8,
				8,
				8
			)
			.setOrigin(0)
			.setAlpha(0.9);
		this.totalHearts = this.registry.get("playerTotalHitPoints") ?? 0;
		this.activeHearts = this.registry.get("playerHitPoints") ?? 0;
		this.createHearts();
	}

	update() {
		const totalHearts = this.registry.get("playerTotalHitPoints") ?? 0;
		const activeHearts = this.registry.get("playerHitPoints") ?? 0;

		if (this.totalHearts !== totalHearts) {
			console.log("resetting hearts");
			this.totalHearts = totalHearts;
			this.createHearts();
		}

		this.activeHearts = activeHearts;
		for (let x = 1; x <= this.totalHearts; x++) {
			if (!this.hearts[x - 1]) {
				throw new Error("Insufficient hearts");
			}
			if (x > this.activeHearts) {
				this.hearts[x - 1].isActive = false;
			} else {
				this.hearts[x - 1].isActive = true;
			}
		}

		this.hearts.forEach((heart) => {
			heart.update();
		});
	}

	createHearts() {
		this.hearts.forEach((heart) => {
			heart.destroy();
		});
		this.hearts = [];
		for (let x = 0; x < this.totalHearts; x++) {
			this.hearts.push(new Heart(this, x));
		}
	}
}
