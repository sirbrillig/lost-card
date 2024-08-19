import { Scene } from "phaser";
import { DataKeys, Powers } from "../shared";

const heartSize: number = 18;
const itemSize: number = 20;
const portraitPadding = 22;
const inactiveFrame = 13;
const activeFrame = 29;

class Item {
	image: Phaser.GameObjects.Image;
	scene: Phaser.Scene;
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
		this.scene = scene;
	}

	update() {}

	destroy() {
		this.image.destroy();
	}
}

class PotionItem extends Item {
	totalPotions: number = 0;
	countLabel: Phaser.GameObjects.BitmapText;

	constructor(
		scene: Phaser.Scene,
		count: number,
		texture: string,
		frame: number,
		name: string
	) {
		super(scene, count, texture, frame, name);
		this.countLabel = scene.add
			.bitmapText(
				this.image.x - this.image.width + 2,
				this.image.y - 4,
				"RetroGamingWhiteSmall",
				`${this.totalPotions}`,
				12
			)
			.setDepth(9)
			.setOrigin(0.5);
	}

	update() {
		this.totalPotions = this.scene.registry.get(DataKeys.PotionCount) ?? 0;
		this.countLabel.setText(`${this.totalPotions}`);
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
	keyCountIcon: Phaser.GameObjects.Image;
	keyCountLabel: Phaser.GameObjects.BitmapText;

	constructor() {
		super("Overlay");
	}

	create() {
		console.log("creating overlay");
		this.items.forEach((item) => item.destroy());
		this.items = [];
		this.hearts.forEach((item) => item.destroy());
		this.hearts = [];
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

		if (!this.input.keyboard) {
			throw new Error("No keyboard controls could be found");
		}
		this.input.keyboard.on("keydown-ESC", () => {
			// Pause
			if (this.scene.isPaused("Game")) {
				this.scene.get("Dialog")?.scene.stop();
				this.scene.resume("Game");
			} else {
				this.scene.pause("Game");
				this.scene.launch("Dialog", {
					heading: "Paused",
					text: "Press ESC to resume",
				});
			}
		});
	}

	updateSelectedItem() {
		const activePower: Powers | undefined = this.registry.get(
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
				case "PlantCard":
					return (
						this.cameras.main.x +
						this.cameras.main.width -
						itemSize * 3 -
						itemSize / 2
					);
				case "FireCard":
					return (
						this.cameras.main.x +
						this.cameras.main.width -
						itemSize * 4 -
						itemSize / 2
					);
			}
		})();
		const y = this.cameras.main.y + 20;
		if (!x) {
			throw new Error("No coordinates for active power on overlay");
		}
		if (!this.selectedItemMarker) {
			this.selectedItemMarker = this.add
				.image(x, y, "icons2", 10)
				.setOrigin(0.5);
		}
		this.selectedItemMarker.setPosition(x, y);
		this.selectedItemMarker.setDepth(8);
	}

	updateKeys() {
		const x = this.cameras.main.x + this.cameras.main.width - itemSize / 2;
		const y = this.cameras.main.y + 30;
		if (!this.keyCountIcon) {
			this.keyCountIcon = this.add.image(x, y, "icons3", 28).setOrigin(0.5);
			this.keyCountIcon.setPosition(x, y);
			this.keyCountIcon.setDepth(8);
		}

		if (!this.keyCountLabel) {
			this.keyCountLabel = this.add
				.bitmapText(
					this.keyCountIcon.x - 6,
					this.keyCountIcon.y + 6,
					"RetroGamingWhiteSmall",
					"0",
					12
				)
				.setDepth(9)
				.setOrigin(0.5);
		}
		this.keyCountLabel.setText(`${this.getKeyCount()}`);
	}

	getKeyCount(): number {
		return this.registry.get(DataKeys.KeyCount) ?? 0;
	}

	updateItems() {
		if (!this.items.some((item) => item.name === "Potion")) {
			this.items.push(new PotionItem(this, 0, "icons3", 2, "Potion"));
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
		if (
			this.registry.get("hasPlantCard") &&
			!this.items.some((item) => item.name === "PlantCard")
		) {
			this.items.push(
				new Item(this, this.items.length, "icons3", 39, "PlantCard")
			);
		}
		if (
			this.registry.get("hasFireCard") &&
			!this.items.some((item) => item.name === "FireCard")
		) {
			this.items.push(
				new Item(this, this.items.length, "icons3", 55, "FireCard")
			);
		}

		this.items.forEach((item) => item.update());
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
		this.updateKeys();
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
