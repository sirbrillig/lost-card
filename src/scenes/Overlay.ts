import { Scene } from "phaser";
import { MainEvents } from "../MainEvents";
import {
	DataKeys,
	Powers,
	Events,
	powerOrder,
	auraOrder,
	getPowerEquippedKey,
	getIconForPower,
	isAuraActive,
} from "../shared";

const heartSize: number = 18;
const itemSize: number = 17;
const portraitPadding = 22;
const inactiveFrame = 13;
const activeFrame = 29;
const itemTopMargin = 35;
const itemLeftMargin = itemSize;

class Aura {
	image: Phaser.GameObjects.Image;
	scene: Phaser.Scene;
	name: string;
	isSelected: boolean = false;

	constructor(
		scene: Phaser.Scene,
		count: number,
		texture: string,
		frame: number,
		name: string
	) {
		const image = scene.add
			.image(
				portraitPadding + itemLeftMargin + itemSize * count,
				scene.cameras.main.y + itemSize + itemTopMargin,
				texture,
				frame
			)
			.setDepth(6)
			.setOrigin(1);
		this.image = image;
		this.name = name;
		this.scene = scene;
	}

	update() {
		if (!this.isSelected) {
			this.image.setAlpha(0.5);
			return;
		}
		this.image.clearAlpha();
	}

	destroy() {
		this.image.destroy();
	}
}

class Card {
	image: Phaser.GameObjects.Image;
	selectedItemMarker: Phaser.GameObjects.NineSlice;
	scene: Phaser.Scene;
	name: string;
	isSelected: boolean = false;

	constructor(
		scene: Phaser.Scene,
		count: number,
		texture: string,
		frame: number,
		name: string
	) {
		const image = scene.add
			.image(
				portraitPadding + itemLeftMargin + itemSize * count,
				scene.cameras.main.y + itemTopMargin,
				texture,
				frame
			)
			.setDepth(6)
			.setOrigin(1);
		this.image = image;
		this.name = name;
		this.scene = scene;
	}

	update() {
		if (!this.selectedItemMarker) {
			this.selectedItemMarker = this.scene.add
				.nineslice(
					this.image.x - this.image.width / 2,
					this.image.y - this.image.height / 2,
					"icons-atlas",
					"menu-icons-white-16.png",
					itemSize,
					itemSize,
					5,
					5,
					5,
					5
				)
				.setDepth(5)
				.setOrigin(0.5);
		}
		if (!this.isSelected) {
			this.selectedItemMarker?.setVisible(false);
			return;
		}
		this.selectedItemMarker?.setVisible(true);
	}

	destroy() {
		this.image.destroy();
		this.selectedItemMarker?.destroy();
	}
}

class PotionItem {
	image: Phaser.GameObjects.Image;
	selectedItemMarker: Phaser.GameObjects.Image;
	scene: Phaser.Scene;
	name: string;
	isSelected: boolean = false;
	totalPotions: number = 0;
	countLabel: Phaser.GameObjects.BitmapText;

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
		const totalPotions = this.scene.registry.get(DataKeys.PotionCount) ?? 0;
		if (this.totalPotions !== totalPotions) {
			this.totalPotions = totalPotions;
			try {
				this.countLabel.setText(`${this.totalPotions}`);
			} catch (err) {
				console.error(err);
				console.error(
					"Something went wrong updating the number of potions. Hopefully it works during the next frame."
				);
			}
		}
	}

	destroy() {
		this.image.destroy();
		this.countLabel.destroy();
	}
}

class Heart {
	scene: Phaser.Scene;
	isActive: boolean = false;
	isImageActive: boolean = false;
	image: Phaser.GameObjects.Image;

	constructor(scene: Phaser.Scene, count: number) {
		this.scene = scene;
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
		this.showEffectForGainedHeart();
	}

	update() {
		if (this.isActive && !this.isImageActive) {
			this.image.setFrame(activeFrame);
			this.isImageActive = true;
			this.showEffectForGainedHeart();
		}
		if (!this.isActive && this.isImageActive) {
			this.image.setFrame(inactiveFrame);
			this.isImageActive = false;
			this.showParticlesForLostHeart();
		}
	}

	showEffectForGainedHeart() {
		const glow = this.image.postFX?.addGlow(0xff0000, 1, 1);
		this.scene.tweens.add({
			targets: glow,
			outerStrength: 0,
			innerStrength: 0,
			duration: 600,
			onComplete: () => {
				glow?.destroy();
			},
		});
	}

	showParticlesForLostHeart() {
		const emitter = this.scene.add.particles(
			this.image.getCenter().x,
			this.image.getCenter().y,
			"fire-power",
			{
				frame: 8,
				lifespan: 600,
				speed: { min: 40, max: 80 },
				scale: { start: 0.7, end: 0 },
				tint: 0xE00A06,
				emitting: false,
			}
		);
		emitter.explode(20);
		emitter.once(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
			emitter?.destroy();
		});
	}

	destroy() {
		this.image.destroy();
	}
}

export class Overlay extends Scene {
	potions: PotionItem[] = [];
	items: Card[] = [];
	auras: Aura[] = [];
	hearts: Heart[] = [];
	keyCount: number = 0;
	totalHearts: number = 0;
	activeHearts: number = 0;
	bg: Phaser.GameObjects.NineSlice;
	keyCountIcon: Phaser.GameObjects.Image;
	keyCountLabel: Phaser.GameObjects.BitmapText;
	saveMessageTime = 1000;

	constructor() {
		super("Overlay");
	}

	create() {
		this.keyCount = this.getKeyCount();
		this.potions.forEach((item) => item.destroy());
		this.potions = [];
		this.auras.forEach((item) => item.destroy());
		this.auras = [];
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
				this.getBackgroundHeight(),
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

		MainEvents.on(Events.PowerEquipped, () => {
			this.items.forEach((item) => item.destroy());
			this.items = [];
		});

		MainEvents.on(Events.AuraEquipped, () => {
			this.auras.forEach((item) => item.destroy());
			this.auras = [];
		});

		MainEvents.on(Events.GameSaved, () => {
			const savedText = this.add
				.bitmapText(
					this.cameras.main.x + this.cameras.main.width - 35,
					this.cameras.main.y + this.cameras.main.height - 16,
					"RetroGamingWhiteSmall",
					"Saved",
					12
				)
				.setDepth(9)
				.setOrigin(0.5);

			this.time.addEvent({
				delay: this.saveMessageTime,
				callback: () => {
					savedText.destroy();
				},
			});
		});

		if (!this.input.keyboard) {
			throw new Error("No keyboard controls could be found");
		}

		// Prevent TAB from being taken by browser context
		this.input.keyboard.addKey("TAB", true);
		this.input.keyboard.on("keydown-TAB", () => {
			this.togglePause();
		});
		this.input.keyboard.on("keydown-ESC", () => {
			this.togglePause();
		});
		this.input.keyboard.on("keydown-M", () => {
			this.togglePause();
		});
		this.input.keyboard.on("keydown-CLOSED_BRACKET", () => {
			this.rotatePowerRight();
		});
		this.input.keyboard.on("keydown-OPEN_BRACKET", () => {
			this.rotatePowerLeft();
		});

		this.input.gamepad?.on("down", (_: any, button: { index: number }) => {
			if (this.input.gamepad?.pad1?.L1) {
				this.rotatePowerLeft();
			}
			if (this.input.gamepad?.pad1?.R1) {
				this.rotatePowerRight();
			}
			if (button.index === 9) {
				// Start button
				this.togglePause();
			}
		});
	}

	rotatePowerRight() {
		// Rotate Active Power
		const available = powerOrder.filter((power) => this.isPowerEquipped(power));
		const active = this.getActivePower();
		if (!active) {
			return;
		}
		const current = available.indexOf(active);
		const nextPower = available[current + 1] ?? available[0];
		this.setActivePower(nextPower);
	}

	rotatePowerLeft() {
		const available = powerOrder.filter((power) => this.isPowerEquipped(power));
		const active = this.getActivePower();
		if (!active) {
			return;
		}
		const current = available.indexOf(active);
		const nextPower = available[current - 1] ?? available[available.length - 1];
		this.setActivePower(nextPower);
	}

	togglePause() {
		// Pause
		if (this.scene.isPaused("Game")) {
			this.scene.get("GameMap")?.scene.stop();
			this.scene.resume("Game");
		} else {
			this.scene.pause("Game");
			this.scene.launch("GameMap");
		}
	}

	setActivePower(power: Powers): void {
		this.registry.set(DataKeys.ActivePower, power);
	}

	isPowerEquipped(power: Powers): boolean {
		return this.registry.get(getPowerEquippedKey(power));
	}

	getActivePower(): Powers | undefined {
		return this.registry.get(DataKeys.ActivePower);
	}

	updateSelectedItem() {
		const activePower: Powers | undefined = this.registry.get(
			DataKeys.ActivePower
		);
		if (!activePower) {
			return;
		}
		this.items.forEach((item) => {
			if (item.name === activePower) {
				item.isSelected = true;
			} else {
				item.isSelected = false;
			}
		});
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
		try {
			this.keyCountLabel.setText(`${this.keyCount}`);
		} catch (err) {
			console.error(err);
			console.error(
				"Something went wrong updating the number of keys. Hopefully it works during the next frame."
			);
		}
	}

	getKeyCount(): number {
		return this.registry.get(DataKeys.KeyCount) ?? 0;
	}

	updateItems() {
		if (!this.potions.some((item) => item.name === "Potion")) {
			this.potions.push(new PotionItem(this, 0, "icons3", 2, "Potion"));
		}

		auraOrder.forEach((aura) => {
			if (!this.registry.get(getPowerEquippedKey(aura))) {
				return;
			}
			if (this.auras.some((item) => item.name === aura)) {
				return;
			}
			const icon = getIconForPower(aura);
			const auraObject = new Aura(
				this,
				this.auras.length,
				icon.texture,
				icon.frame,
				aura
			);
			if (isAuraActive(this.registry, aura)) {
				auraObject.isSelected = true;
			} else {
				auraObject.isSelected = false;
			}
			this.auras.push(auraObject);
		});

		powerOrder.forEach((power) => {
			if (!this.registry.get(getPowerEquippedKey(power))) {
				return;
			}
			if (this.items.some((item) => item.name === power)) {
				return;
			}
			const icon = getIconForPower(power);
			this.items.push(
				new Card(this, this.items.length, icon.texture, icon.frame, power)
			);
		});

		this.potions.forEach((item) => item.update());
		this.items.forEach((item) => item.update());
		this.auras.forEach((item) => item.update());
	}

	getBackgroundWidth() {
		return (
			5 + portraitPadding + this.cameras.main.x + heartSize * this.totalHearts
		);
	}

	getBackgroundHeight() {
		return 20;
	}

	update() {
		const totalHearts = this.registry.get("playerTotalHitPoints") ?? 0;
		const activeHearts = this.registry.get("playerHitPoints") ?? 0;
		const keyCount = this.getKeyCount();

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

		this.bg.setSize(this.getBackgroundWidth(), this.getBackgroundHeight());

		this.updateItems();
		if (keyCount !== this.keyCount) {
			this.keyCount = keyCount;
			this.updateKeys();
		}
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
