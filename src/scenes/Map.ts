import { Scene } from "phaser";
import {
	getEquippedAuras,
	getIconForPower,
	getActiveAuras,
	activateAura,
	deactivateAura,
	isAuraActive,
	getButtonNames,
	getAuraDescription,
	Auras,
} from "../shared";
import { config } from "../config";

const topPadding = 35;
const auraTopPadding = 35;
const auraLeftPadding = 30;
const itemSize = 17;
const selectorLeftPadding = 15;
const selectorTopPadding = 14;

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
				scene.cameras.main.x + auraLeftPadding + count * itemSize,
				scene.cameras.main.y + itemSize + topPadding + auraTopPadding,
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

export class GameMap extends Scene {
	auras: Aura[] = [];
	selectedAura: number = 0;
	auraDescription: Phaser.GameObjects.BitmapText | undefined;
	selector: Phaser.GameObjects.Image;

	constructor() {
		super("GameMap");
	}

	create() {
		this.add
			.nineslice(
				this.cameras.main.x,
				this.cameras.main.y + topPadding,
				"panel4",
				0,
				this.cameras.main.width,
				this.cameras.main.height - topPadding,
				8,
				8,
				8,
				8
			)
			.setOrigin(0)
			.setAlpha(0.9);

		this.createMap();
		this.createInputs();
		this.createAuras();

		this.add
			.bitmapText(
				this.cameras.main.x + itemSize / 2,
				this.cameras.main.y + this.cameras.main.height - 24,
				"RetroGamingWhiteSmall",
				`Press ${getButtonNames(this).map} to resume`,
				12
			)
			.setDepth(9)
			.setMaxWidth(this.cameras.main.width - itemSize / 2)
			.setOrigin(0);
	}

	createAuras() {
		this.auras.forEach((aura) => {
			aura.destroy();
		});
		this.auras = [];
		const auras = getEquippedAuras(this.registry);
		if (auras.length < 1) {
			return;
		}
		getEquippedAuras(this.registry).forEach((aura) => {
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
			}
			this.auras.push(auraObject);
		});
		this.add
			.bitmapText(
				this.cameras.main.x + itemSize / 2,
				this.cameras.main.y + topPadding + 5,
				"RetroGamingWhiteSmall",
				`Select up to ${config.maxActiveAuras} aura cards to be active`,
				12
			)
			.setDepth(9)
			.setMaxWidth(this.cameras.main.width - itemSize / 2)
			.setOrigin(0);
		this.selectedAura = 0;
		this.selector?.destroy();
		this.selector = this.add
			.image(
				this.cameras.main.x +
					selectorLeftPadding +
					this.selectedAura * itemSize,
				this.cameras.main.y +
					selectorTopPadding +
					itemSize +
					topPadding +
					auraTopPadding,
				"icons1",
				29
			)
			.setOrigin(0)
			.setRotation(Phaser.Math.DegToRad(-90));

		this.drawAuraDescription();
	}

	drawAuraDescription() {
		const activeAura = this.auras[this.selectedAura]?.name;
		this.auraDescription?.destroy();
		if (!activeAura) {
			return;
		}
		this.auraDescription = this.add
			.bitmapText(
				this.cameras.main.x + itemSize / 2,
				this.cameras.main.y +
					selectorTopPadding +
					itemSize +
					topPadding +
					auraTopPadding,
				"RetroGamingWhiteSmall",
				getAuraDescription(activeAura as Auras),
				12
			)
			.setDepth(9)
			.setMaxWidth((this.cameras.main.width / 8) * 3)
			.setOrigin(0);
	}

	drawAuraSelector() {
		if (this.selectedAura < 0) {
			this.selectedAura = 0;
		}
		if (this.selectedAura > this.auras.length - 1) {
			this.selectedAura = this.auras.length - 1;
		}
		this.selector.setPosition(
			this.cameras.main.x + selectorLeftPadding + this.selectedAura * itemSize,
			this.selector.y
		);
		this.drawAuraDescription();
	}

	toggleAura() {
		if (!this.auras[this.selectedAura]) {
			return;
		}
		const isActive = this.auras[this.selectedAura].isSelected;
		if (
			!isActive &&
			getActiveAuras(this.registry).length < config.maxActiveAuras
		) {
			this.auras[this.selectedAura].isSelected = true;
			activateAura(this.registry, this.auras[this.selectedAura].name as Auras);
			return;
		}
		this.auras[this.selectedAura].isSelected = false;
		deactivateAura(this.registry, this.auras[this.selectedAura].name as Auras);
	}

	createInputs() {
		if (!this.input.keyboard) {
			throw new Error("No keyboard controls could be found");
		}
		this.input.gamepad?.on("down", () => {
			if (this.input.gamepad?.pad1?.A) {
				this.toggleAura();
			}
			if (this.input.gamepad?.pad1?.left) {
				this.selectedAura -= 1;
				this.drawAuraSelector();
			}
			if (this.input.gamepad?.pad1?.right) {
				this.selectedAura += 1;
				this.drawAuraSelector();
			}
		});

		this.input.keyboard.on("keydown-SPACE", () => {
			this.toggleAura();
		});
		this.input.keyboard.on("keydown-LEFT", () => {
			this.selectedAura -= 1;
			this.drawAuraSelector();
		});
		this.input.keyboard.on("keydown-RIGHT", () => {
			this.selectedAura += 1;
			this.drawAuraSelector();
		});
	}

	createMap() {
		// Map is 150 x 150
		const mapOffset = { x: 100, y: topPadding + 30 };
		const auras = getEquippedAuras(this.registry);
		if (auras.length < 1) {
			mapOffset.x = 50;
			mapOffset.y = 50;
		}

		this.add
			.image(mapOffset.x, mapOffset.y, "game-map")
			.setDepth(9)
			.setOrigin(0);

		const playerX = this.registry.get("playerX");
		const playerY = this.registry.get("playerY");

		if (!playerX || !playerY) {
			return;
		}

		const newPoints = this.mapGamePointToMapPoint(playerX, playerY);
		const playerAdjust = -2;

		const playerPoint = this.add
			.sprite(
				newPoints.x + playerAdjust + mapOffset.x,
				newPoints.y + playerAdjust + mapOffset.y,
				"icons2",
				5
			)
			.setOrigin(0.5)
			.setDepth(10);

		this.tweens.add({
			targets: playerPoint,
			alpha: 0,
			ease: "Cubic.easeOut",
			duration: 800,
			repeatDelay: 400,
			repeat: -1,
			yoyo: true,
		});
	}

	mapGamePointToMapPoint(x: number, y: number): { x: number; y: number } {
		const mapScale = 4.7;
		return {
			x: x / (100 / mapScale),
			y: y / (100 / mapScale),
		};
	}

	update() {
		this.auras.forEach((aura) => aura.update());
	}
}
