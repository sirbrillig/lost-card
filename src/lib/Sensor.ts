import { config } from "./config";
import {
	type SpriteDirection,
	SpriteUp,
	SpriteDown,
	SpriteLeft,
	SpriteRight,
	normalizeRectangle,
	getSpriteFeetPosition,
	DataKeys,
} from "./shared";
import { DebugMode } from "./components";

export class Sensor {
	#debugGraphics: Phaser.GameObjects.Graphics | undefined;
	#sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	#detectors: Phaser.Geom.Rectangle[] = [];
	#length: number = 5;
	#width: number = 2;

	constructor(sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		this.#sprite = sprite;
	}

	setDimensions(length: number, width: number): void {
		this.#length = length;
		this.#width = width;
	}

	setDirections(directions: SpriteDirection[]): void {
		this.#sprite.data.set(DataKeys.FacingDirections, directions);
	}

	overlaps(target: Phaser.Geom.Rectangle): boolean {
		return this.#detectors.some((detector) =>
			Phaser.Geom.Rectangle.Overlaps(detector, target)
		);
	}

	getOverlappingTiles(
		layer: Phaser.Tilemaps.TilemapLayer
	): Phaser.Tilemaps.Tile[] {
		return this.#detectors.reduce((tiles, detector) => {
			return [...tiles, ...layer.getTilesWithinShape(detector)];
		}, [] as Phaser.Tilemaps.Tile[]);
	}

	update() {
		const bottomCenter = getSpriteFeetPosition(this.#sprite);
		const directions = this.#sprite.data.get(DataKeys.FacingDirections);
		if (!directions || !Array.isArray(directions)) {
			return;
		}
		this.#detectors = this.#getDetectors(directions, bottomCenter);
	}

	destroy() {
		this.#debugGraphics?.clear();
		this.#debugGraphics?.destroy();
	}

	#getDetectors(
		directions: SpriteDirection[],
		position: Phaser.Types.Math.Vector2Like
	): Phaser.Geom.Rectangle[] {
		if (DebugMode.get("hitboxes") && !this.#debugGraphics) {
			this.#debugGraphics = this.#sprite.scene.add.graphics();
			this.#debugGraphics.lineStyle(1, 0xff0000);
			this.#debugGraphics.setDepth(config.effectDepth);
		}
		if (!DebugMode.get("hitboxes") && this.#debugGraphics) {
			this.#debugGraphics.clear();
			this.#debugGraphics.destroy();
			this.#debugGraphics = undefined;
		}
		this.#debugGraphics?.clear();
		this.#debugGraphics?.lineStyle(1, 0xff0000);
		return directions.map((direction) => {
			const longLength = this.#length;
			const shortLength = this.#width;
			const width = (() => {
				switch (direction) {
					case SpriteUp:
						return -shortLength;
					case SpriteDown:
						return shortLength;
					case SpriteLeft:
						return -longLength;
					case SpriteRight:
						return longLength;
					default:
						return longLength;
				}
			})();
			const height = (() => {
				switch (direction) {
					case SpriteUp:
						return -longLength;
					case SpriteDown:
						return longLength;
					case SpriteLeft:
						return -shortLength;
					case SpriteRight:
						return shortLength;
					default:
						return shortLength;
				}
			})();
			const detector = normalizeRectangle(
				new Phaser.Geom.Rectangle(position.x, position.y, width, height)
			);

			if (DebugMode.get("hitboxes")) {
				this.#debugGraphics?.strokeRect(
					detector.x,
					detector.y,
					detector.width,
					detector.height
				);
			}

			return detector;
		});
	}
}
