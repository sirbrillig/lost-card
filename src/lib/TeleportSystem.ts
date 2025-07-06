export interface TeleportOptions {
	maxAttempts?: number;
	padding?: number;
	collisionLayers?: Phaser.Tilemaps.TilemapLayer[];
}

export class TeleportSystem {
	private scene: Phaser.Scene;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	/**
	 * Check if creature collides with any tiles in the layer
	 * @param creature - The creature to check
	 * @param layer - The tilemap layer to check against
	 * @returns True if collision detected
	 */
	private checkTileCollision(
		creature: Phaser.GameObjects.Sprite,
		layer: Phaser.Tilemaps.TilemapLayer
	): boolean {
		// Get creature bounds
		const bounds = creature.getBounds();

		// Convert world coordinates to tile coordinates
		const leftTile = Math.floor(bounds.left / layer.tilemap.tileWidth);
		const rightTile = Math.floor(bounds.right / layer.tilemap.tileWidth);
		const topTile = Math.floor(bounds.top / layer.tilemap.tileHeight);
		const bottomTile = Math.floor(bounds.bottom / layer.tilemap.tileHeight);

		// Check all tiles that the creature overlaps
		for (let x = leftTile; x <= rightTile; x++) {
			for (let y = topTile; y <= bottomTile; y++) {
				const tile = layer.getTileAt(x, y);
				if (tile && tile.collides) {
					return true;
				}
			}
		}

		return false;
	}

	public teleportWithPhysicsCheck(
		creature: Phaser.GameObjects.Sprite,
		roomObject: Phaser.Types.Tilemaps.TiledObject,
		options: TeleportOptions = {}
	): boolean {
		const { maxAttempts = 100, padding = 16, collisionLayers = [] } = options;
		if (
			!roomObject.x ||
			!roomObject.y ||
			!roomObject.width ||
			!roomObject.height
		) {
			return false;
		}

		const minX = roomObject.x + padding;
		const minY = roomObject.y + padding;
		const maxX = roomObject.x + roomObject.width - padding;
		const maxY = roomObject.y + roomObject.height - padding;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const randomX = Phaser.Math.Between(minX, maxX);
			const randomY = Phaser.Math.Between(minY, maxY);

			// Create a temporary physics body to test the position
			const testBody = this.scene.physics.add.sprite(randomX, randomY, "");
			testBody.setSize(creature.width, creature.height);
			testBody.setVisible(false);

			let isValid = true;

			// Check against tilemap layers
			for (const layer of collisionLayers) {
				if (this.checkTileCollision(testBody, layer)) {
					isValid = false;
					break;
				}
			}

			// Clean up test body
			testBody.destroy();

			if (isValid) {
				creature.x = randomX;
				creature.y = randomY;
				// console.log(
				// 	`Teleported to (${randomX}, ${randomY}) after ${attempt + 1} attempts`
				// );
				return true;
			}
		}

		console.warn(
			`Could not find valid teleport position after ${maxAttempts} attempts`
		);
		return false;
	}
}
