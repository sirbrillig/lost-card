import { Scene } from "phaser";
import { config } from "../lib/config";
import { MainEvents } from "../lib/MainEvents";
import { EnemyManager } from "../lib/EnemyManager";
import { PotionBar } from "../lib/PotionBar";
import {
	Powers,
	Events,
	powerOrder,
	auraOrder,
	getPowerEquippedKey,
	getIconForPower,
	isAuraActive,
	getDataFromRegistry,
	saveDataToRegistry,
} from "../lib/shared";
import { PowerInUse } from "../lib/components";

const heartSize: number = 18;
const itemSize: number = 17;
const portraitPadding = 22;

const halfHeartFrame = 21;
const emptyHeartFrame = 13;
const fullHeartFrame = 29;

const itemTopMargin = 35;
const itemLeftMargin = itemSize;

class Aura {
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
				portraitPadding + itemLeftMargin + itemSize * count,
				scene.cameras.main.y + itemSize + itemTopMargin,
				texture,
				frame
			)
			.setDepth(config.overlayDepth)
			.setOrigin(1);
		this.image = image;
		this.name = name;
		this.scene = scene;
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
			.setDepth(config.overlayDepth)
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
				.setDepth(config.overlaySelectedItemFrameDepth)
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
			.setDepth(config.overlayLabelDepth)
			.setOrigin(0.5);
	}

	playUsePotionEffect() {
		const emitter = this.scene.add.particles(
			this.image.getCenter().x,
			this.image.getCenter().y,
			"fire-power",
			{
				frame: 8,
				lifespan: 700,
				speed: { min: 50, max: 90 },
				scale: { start: 0.8, end: 0 },
				tint: 0xe00a06,
				emitting: false,
				gravityY: 150,
				bounce: 0.5,
				bounds: new Phaser.Geom.Rectangle(
					this.image.getCenter().x - 50,
					this.image.getCenter().y - 10,
					50,
					40
				),
			}
		);
		emitter.explode(20);
		emitter.once(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
			emitter?.destroy();
		});
	}

	update() {
		const totalPotions =
			getDataFromRegistry(this.scene.registry, "potionCount") ?? 0;
		if (this.totalPotions !== totalPotions) {
			if (this.totalPotions > totalPotions) {
				this.playUsePotionEffect();
			}
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
	value: "empty" | "half" | "full" = "empty";
	imageValue: "empty" | "half" | "full" = "empty";
	image: Phaser.GameObjects.Image;

	constructor(scene: Phaser.Scene, count: number) {
		this.scene = scene;
		const heart = scene.add
			.image(
				portraitPadding + scene.cameras.main.x + heartSize * count,
				scene.cameras.main.y,
				"icons3",
				emptyHeartFrame
			)
			.setOrigin(0);
		heart.setDisplaySize(heartSize, heartSize);
		this.image = heart;
		this.showEffectForGainedHeart();
	}

	addValue(): void {
		if (this.value === "empty") {
			this.value = "half";
			return;
		}
		if (this.value === "half") {
			this.value = "full";
			return;
		}
	}

	isFull(): boolean {
		if (this.value === "full") {
			return true;
		}
		return false;
	}

	getFrameForValue() {
		switch (this.value) {
			case "empty":
				return emptyHeartFrame;
			case "half":
				return halfHeartFrame;
			case "full":
				return fullHeartFrame;
		}
	}

	didGainHeart(): boolean {
		if (this.value !== "empty" && this.imageValue === "empty") {
			return true;
		}
		return false;
	}

	didLoseHeart(): boolean {
		if (this.value === "empty" && this.imageValue !== "empty") {
			return true;
		}
		return false;
	}

	update() {
		if (this.value !== this.imageValue) {
			const frame = this.getFrameForValue();
			this.image.setFrame(frame);
			if (this.didGainHeart()) {
				this.showEffectForGainedHeart();
			}
			if (this.didLoseHeart()) {
				this.showParticlesForLostHeart();
			}
			this.imageValue = this.value;
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
				tint: 0xe00a06,
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

export interface OverlayData {
	enemyManager: EnemyManager;
}

export class Overlay extends Scene {
	potions: PotionItem[] = [];
	potionBar: PotionBar | undefined;
	items: Card[] = [];
	auras: Aura[] = [];
	hearts: Heart[] = [];
	keyCount: number = 0;
	halfHearts: number = 0;
	totalHearts: number = 0;
	activeHearts: number = 0;
	bg: Phaser.GameObjects.NineSlice;
	halfHeartImage: Phaser.GameObjects.Image | undefined;
	keyCountIcon: Phaser.GameObjects.Image | undefined;
	keyCountLabel: Phaser.GameObjects.BitmapText | undefined;
	saveMessageTime = 1000;
	enemyManager: EnemyManager;

	constructor() {
		super("Overlay");
	}

	create(data: OverlayData) {
		this.enemyManager = data.enemyManager;
		this.keyCount = 0;
		this.keyCountIcon = undefined;
		this.keyCountLabel = undefined;
		this.potions.forEach((item) => item.destroy());
		this.potions = [];
		this.auras.forEach((item) => item.destroy());
		this.auras = [];
		this.items.forEach((item) => item.destroy());
		this.items = [];
		this.hearts.forEach((item) => item.destroy());
		this.hearts = [];
		this.halfHearts =
			getDataFromRegistry(this.registry, "playerHalfHearts") ?? 0;
		this.totalHearts =
			getDataFromRegistry(this.registry, "playerTotalHitPoints") ??
			config.playerInitialTotalHitPoints;
		this.activeHearts = 0;
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
		const potionBarWidth = 10;
		this.potionBar = new PotionBar(
			this,
			this.cameras.main.x + this.cameras.main.width - 6,
			this.cameras.main.y + 70,
			potionBarWidth,
			this.#getPotionBarHeight(),
			0
		);

		this.createHearts();
		this.updateItems();
		this.updateSelectedItem();

		this.halfHeartImage = this.add
			.image(
				this.cameras.main.x + 4,
				this.cameras.main.y + 20,
				"icons3",
				halfHeartFrame
			)
			.setScale(0.8)
			.setOrigin(0)
			.setVisible(false);

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
				.setDepth(config.overlayLabelDepth)
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
		if (PowerInUse.size > 0) {
			return;
		}
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
		if (PowerInUse.size > 0) {
			return;
		}
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
			this.scene.launch("GameMap", { enemyManager: this.enemyManager });
		}
	}

	setActivePower(power: Powers): void {
		saveDataToRegistry(this.registry, "activePower", power);
	}

	isPowerEquipped(power: Powers): boolean {
		return (
			getDataFromRegistry(this.registry, getPowerEquippedKey(power)) ?? false
		);
	}

	getActivePower(): Powers | undefined {
		return getDataFromRegistry(this.registry, "activePower");
	}

	updateSelectedItem() {
		const activePower: Powers | undefined = getDataFromRegistry(
			this.registry,
			"activePower"
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
			this.keyCountIcon.setDepth(config.overlayLabelIconDepth);
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
				.setDepth(config.overlayLabelDepth)
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
		return getDataFromRegistry(this.registry, "keyCount") ?? 0;
	}

	updateItems() {
		if (!this.potions.some((item) => item.name === "Potion")) {
			this.potions.push(new PotionItem(this, 0, "icons3", 2, "Potion"));
		}

		auraOrder.forEach((aura) => {
			if (!getDataFromRegistry(this.registry, getPowerEquippedKey(aura))) {
				return;
			}
			if (this.auras.some((item) => item.name === aura)) {
				return;
			}
			if (!isAuraActive(this.registry, aura)) {
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
			this.auras.push(auraObject);
		});

		powerOrder.forEach((power) => {
			if (!getDataFromRegistry(this.registry, getPowerEquippedKey(power))) {
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
		const totalHearts =
			getDataFromRegistry(this.registry, "playerTotalHitPoints") ??
			config.playerInitialTotalHitPoints;
		const activeHearts =
			getDataFromRegistry(this.registry, "playerHitPoints") ??
			config.playerInitialHitPoints;
		const keyCount = this.getKeyCount();
		const halfHearts =
			getDataFromRegistry(this.registry, "playerHalfHearts") ?? 0;

		if (this.halfHearts !== halfHearts) {
			this.halfHearts = halfHearts;
			this.halfHeartImage?.setVisible(this.halfHearts > 0 ? true : false);
		}

		if (this.totalHearts !== totalHearts) {
			this.totalHearts = totalHearts;
			this.createHearts();
		}

		if (this.activeHearts !== activeHearts) {
			this.hearts.forEach((heart) => (heart.value = "empty"));
			this.activeHearts = activeHearts;
			let currentHeart = 0;
			for (let x = 0; x < this.activeHearts; x++) {
				if (this.hearts[currentHeart].isFull()) {
					currentHeart += 1;
				}
				if (currentHeart + 1 > this.hearts.length) {
					console.error(
						`Tried to mark ${activeHearts} hearts but failed at ${currentHeart}`
					);
					break;
				}
				this.hearts[currentHeart].addValue();
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
		this.#updatePotionBar();
	}

	createHearts() {
		this.hearts.forEach((heart) => {
			heart.destroy();
		});
		this.hearts = [];
		// Divide by 2 because each heart holds two hit points
		for (let x = 0; x < Math.ceil(this.totalHearts / 2); x++) {
			this.hearts.push(new Heart(this, x));
		}
	}

	#getPotionBarHeight(): number {
		const totalPotions =
			getDataFromRegistry(this.registry, "potionTotalCount") ?? 0;
		const pixelsPerPotion = 5;
		return pixelsPerPotion * totalPotions;
	}

	#updatePotionBar() {
		if (!this.potionBar) {
			return;
		}

		const totalPotions =
			getDataFromRegistry(this.registry, "potionTotalCount") ?? 0;
		const currentPotions =
			getDataFromRegistry(this.registry, "potionCount") ?? 0;

		this.potionBar.setHeight(this.#getPotionBarHeight());
		this.potionBar.setMaxPotions(totalPotions);
		this.potionBar.setPotions(currentPotions);
	}
}
