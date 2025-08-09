import { Scene } from "phaser";
import {
	getFoundAuras,
	getIconForCard,
	getActiveAuras,
	activateAura,
	deactivateAura,
	isAuraActive,
	getButtonNames,
	getAuraDescription,
	getRooms,
	getRoomsVisited,
	getRegionColor,
	getRegionFromRoomName,
	Auras,
	getDataFromRegistry,
	getPlayerCoordinates,
} from "../lib/shared";
import { config } from "../lib/config";
import { getMap } from "../lib/components";

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
			.setDepth(config.mapIconDepth)
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
			.setDepth(config.mapDepth)
			.setMaxWidth(this.cameras.main.width - itemSize / 2)
			.setOrigin(0);
	}

	createAuras() {
		this.auras.forEach((aura) => {
			aura.destroy();
		});
		this.auras = [];
		const auras = getFoundAuras(this.registry);
		if (auras.length < 1) {
			return;
		}
		getFoundAuras(this.registry).forEach((aura) => {
			const icon = getIconForCard(aura);
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
			.setDepth(config.mapDepth)
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
			.setDepth(config.mapDepth)
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

	drawVisitedRooms(mapScale: number, mapOffset: { x: number; y: number }) {
		const map = getMap();
		const allRooms = getRooms(map);
		const visitedRooms = getRoomsVisited(this.registry);
		const roomBorderColor = 0xffffff;
		allRooms.forEach((room) => {
			const regionName = getRegionFromRoomName(room.name);
			const roomBackgroundColor = getRegionColor(regionName);
			if (!room.x || !room.y || !room.width || !room.height) {
				return;
			}
			if (!visitedRooms.includes(room.name)) {
				return;
			}
			this.add
				.rectangle(
					room.x * mapScale + mapOffset.x,
					room.y * mapScale + mapOffset.y,
					room.width * mapScale,
					room.height * mapScale,
					roomBackgroundColor
				)
				.setDepth(config.mapDepth)
				.setOrigin(0)
				.setStrokeStyle(1, roomBorderColor);
		});
	}

	getMapOffset(): { x: number; y: number } {
		const mapOffset = { x: 100, y: topPadding + 30 };
		const auras = getFoundAuras(this.registry);
		if (auras.length < 1) {
			mapOffset.x = 50;
			mapOffset.y = 50;
		}
		return mapOffset;
	}

	drawPlayerOnMap(mapScale: number, mapOffset: { x: number; y: number }): void {
		const playerRoomX = getDataFromRegistry(this.registry, "playerRoomX");
		const playerRoomY = getDataFromRegistry(this.registry, "playerRoomY");
		const playerActiveRoom = getDataFromRegistry(
			this.registry,
			"playerActiveRoom"
		);

		if (!playerRoomX || !playerRoomY || !playerActiveRoom) {
			return;
		}
		const playerCoordinates = getPlayerCoordinates(
			{
				playerRoomX,
				playerRoomY,
				playerActiveRoom,
			},
			getMap()
		);
		if (!playerCoordinates?.x || !playerCoordinates.y) {
			return;
		}

		const playerPositionOnMap = this.mapGamePointToMapPoint(
			playerCoordinates.x,
			playerCoordinates.y,
			mapScale,
			mapOffset
		);
		const playerMarker = this.add
			.sprite(playerPositionOnMap.x, playerPositionOnMap.y, "icons2", 5)
			.setOrigin(0.5)
			.setScale(0.8)
			.setDepth(config.mapPlayerIconDepth);

		this.tweens.add({
			targets: playerMarker,
			alpha: 0,
			ease: "Cubic.easeOut",
			duration: 800,
			repeatDelay: 400,
			repeat: -1,
			yoyo: true,
		});
	}

	createMap() {
		const mapScale = 0.04;
		const mapOffset = this.getMapOffset();
		this.drawVisitedRooms(mapScale, mapOffset);
		this.drawPlayerOnMap(mapScale, mapOffset);
	}

	mapGamePointToMapPoint(
		x: number,
		y: number,
		mapScale: number,
		mapOffset: { x: number; y: number }
	): { x: number; y: number } {
		return {
			x: x * mapScale + mapOffset.x,
			y: y * mapScale + mapOffset.y,
		};
	}

	update() {
		this.auras.forEach((aura) => aura.update());
	}
}
