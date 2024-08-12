import { Scene } from "phaser";
import { MainEvents } from "../MainEvents";

export class Overlay extends Scene {
	hearts: Phaser.GameObjects.Image[] = [];
	heartSize: number = 20;
	heartLeft: number = 10;
	heartTop: number = 10;
	totalHearts: number = 4;
	activeHearts: number = 4;

	constructor() {
		super("Overlay");
	}

	create() {
		this.createHearts();
		MainEvents.on("setActiveHearts", (count: number) => {
			this.activeHearts = count;
			this.updateHearts();
		});
		MainEvents.on("setTotalHearts", (count: number) => {
			this.totalHearts = count;
			this.updateHearts();
		});
	}

	updateHearts() {
		this.hearts.forEach((heart) => {
			heart.destroy();
		});
		this.hearts = [];
		this.createHearts();
	}

	createHearts() {
		for (let x = 1; x <= this.totalHearts; x++) {
			if (x > this.activeHearts) {
				this.addInactiveHeart();
			} else {
				this.addHeart();
			}
		}
	}

	addInactiveHeart() {
		const heart = this.add.image(
			this.heartLeft + this.heartSize * this.hearts.length,
			this.heartTop,
			"dungeon_tiles_sprites",
			1235
		);
		heart.setDisplaySize(this.heartSize, this.heartSize);
		heart.setTint(0x999999);
		this.hearts.push(heart);
	}

	addHeart() {
		const heart = this.add.image(
			this.heartLeft + this.heartSize * this.hearts.length,
			this.heartTop,
			"dungeon_tiles_sprites",
			1233
		);
		heart.setDisplaySize(this.heartSize, this.heartSize);
		this.hearts.push(heart);
	}
}
