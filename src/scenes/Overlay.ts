import { Scene } from "phaser";
import { DataKeys, Power } from "../shared";

const heartSize: number = 18;
const itemSize: number = 20;
const portraitPadding = 22;
const inactiveFrame = 13;
const activeFrame = 29;

class Item {
	image: Phaser.GameObjects.Image;
	name: string;

	constructor(
		scene: Phaser.Scene,
		count: number,
		texture: string,
		frame: number,
		name: string
	) {
		const image = scene.add
			.image(
				scene.cameras.main.x + scene.cameras.main.width - itemSize * count,
				scene.cameras.main.y + 20,
				texture,
				frame
			)
			.setOrigin(1);
		this.image = image;
		this.name = name;
	}

	destroy() {
		this.image.destroy();
	}
}

class Heart {
	isActive: boolean = false;
	isImageActive: boolean = false;
	image: Phaser.GameObjects.Image;

	constructor(scene: Phaser.Scene, count: number) {
		const heart = scene.add
			.image(
				portraitPadding + scene.cameras.main.x + heartSize * count,
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
	items: Item[] = [];
	hearts: Heart[] = [];
	totalHearts: number = 0;
	activeHearts: number = 0;
	bg: Phaser.GameObjects.NineSlice;
	selectedItemMarker: Phaser.GameObjects.Image;

	constructor() {
		super("Overlay");
	}

	create() {
		console.log("creating overlay");
		this.totalHearts = this.registry.get("playerTotalHitPoints") ?? 0;
		this.activeHearts = this.registry.get("playerHitPoints") ?? 0;
		this.bg = this.add
			.nineslice(
				this.cameras.main.x,
				this.cameras.main.y,
				"panel4",
				0,
				this.getBackgroundWidth(),
				20,
				8,
				8,
				8,
				8
			)
			.setOrigin(0)
			.setAlpha(0.9);
		this.add
			.image(this.cameras.main.x + 2, this.cameras.main.y, "side_portrait", 0)
			.setScale(0.5)
			.setOrigin(0);
		this.createHearts();
		this.updateItems();
		this.updateSelectedItem();
	}

	updateSelectedItem() {
		const activePower: Power | undefined = this.registry.get(
			DataKeys.ActivePower
		);
		if (!activePower) {
			return;
		}
		const x = (() => {
			switch (activePower) {
				case "WindCard":
					return (
						this.cameras.main.x +
						this.cameras.main.width -
						itemSize * 1 -
						itemSize / 2
					);
				case "IceCard":
					return (
						this.cameras.main.x +
						this.cameras.main.width -
						itemSize * 2 -
						itemSize / 2
					);
			}
		})();
		const y = this.cameras.main.y + 20;
		if (!x) {
			throw new Error("No coordinates for active power");
		}
		if (!this.selectedItemMarker) {
			this.selectedItemMarker = this.add
				.image(x, y, "icons2", 10)
				.setOrigin(0.5);
		}
		this.selectedItemMarker.setPosition(x, y);
		this.selectedItemMarker.setDepth(8);
	}

	updateItems() {
		if (
			this.registry.get("hasSword") &&
			!this.items.some((item) => item.name === "Sword")
		) {
			this.items.push(
				new Item(this, 0, "dungeon_tiles_sprites", 1315, "Sword")
			);
		}
		if (
			this.registry.get("hasWindCard") &&
			!this.items.some((item) => item.name === "WindCard")
		) {
			this.items.push(
				new Item(this, this.items.length, "icons3", 31, "WindCard")
			);
		}
		if (
			this.registry.get("hasIceCard") &&
			!this.items.some((item) => item.name === "IceCard")
		) {
			this.items.push(
				new Item(this, this.items.length, "icons3", 47, "IceCard")
			);
		}
	}

	getBackgroundWidth() {
		return this.totalHearts * 25;
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

		this.bg.setSize(this.getBackgroundWidth(), 20);

		this.updateItems();
		this.updateSelectedItem();
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
