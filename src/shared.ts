// 0 is up, 1 is right, 2 is down, 3 is left
export const SpriteUp = 0;
export const SpriteRight = 1;
export const SpriteDown = 2;
export const SpriteLeft = 3;
export type SpriteDirection =
	| typeof SpriteUp
	| typeof SpriteRight
	| typeof SpriteDown
	| typeof SpriteLeft;

export interface BehaviorMachineInterface<Key extends string> {
	getCurrentState(): Key;
	pushState(state: Key): void;
	popState(): void;
}

export function isDynamicSprite(
	obj: unknown
): obj is Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
	const dynObj = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	return "body" in dynObj && "enable" in dynObj.body;
}

export function isDynamicImage(
	obj: unknown
): obj is Phaser.Types.Physics.Arcade.ImageWithDynamicBody {
	const dynObj = obj as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
	return "body" in dynObj;
}

export function isSprite(obj: unknown): obj is Phaser.GameObjects.Sprite {
	const dynObj = obj as Phaser.GameObjects.Sprite;
	return "type" in dynObj && dynObj.type === "Sprite";
}

export function isTilemapTile(obj: unknown): obj is Phaser.Tilemaps.Tile {
	const tile = obj as Phaser.Tilemaps.Tile;
	return "properties" in tile && Array.isArray(tile.properties);
}

export function isTileWithPropertiesObject(
	obj: unknown
): obj is { properties: Record<string, any> } {
	const tile = obj as Phaser.Tilemaps.Tile;
	return "properties" in tile && !Array.isArray(tile.properties);
}

export type ObjectWithId = { id: number };

export function hasId(obj: unknown): obj is ObjectWithId {
	const objWithId = obj as ObjectWithId;
	return "id" in objWithId;
}

export function getObjectId(obj: unknown): number {
	if (!hasId(obj)) {
		throw new Error("Object has no id");
	}
	return obj.id;
}

export function invertSpriteDirection(
	direction: SpriteDirection
): SpriteDirection {
	switch (direction) {
		case SpriteUp:
			return SpriteDown;
		case SpriteRight:
			return SpriteLeft;
		case SpriteDown:
			return SpriteUp;
		case SpriteLeft:
			return SpriteRight;
		default:
			throw new Error(`Invalid sprite direction: ${direction}`);
	}
}

export function createVelocityForDirection(
	speed: number,
	direction: SpriteDirection
): { x: number; y: number } {
	const values = { x: 0, y: 0 };
	if (direction === SpriteUp) {
		values.y = -speed;
	}
	if (direction === SpriteDown) {
		values.y = speed;
	}
	if (direction === SpriteLeft) {
		values.x = -speed;
	}
	if (direction === SpriteRight) {
		values.x = speed;
	}
	return values;
}

export function getDirectionOfSpriteMovement(body: {
	velocity: { x: number; y: number };
}): null | SpriteDirection {
	if (body.velocity.x > 0) {
		return SpriteRight;
	}
	if (body.velocity.x < 0) {
		return SpriteLeft;
	}
	if (body.velocity.y > 0) {
		return SpriteDown;
	}
	if (body.velocity.y < 0) {
		return SpriteUp;
	}
	return null;
}

export function getItemTouchingPlayer(
	items: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[],
	player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
) {
	return items.find((item) => {
		return player.scene.physics.overlap(player, item);
	});
}

interface OverlapRectangle {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function doRectanglesOverlap(
	a: OverlapRectangle,
	b: OverlapRectangle
): boolean {
	const xOverlap =
		isValueInRange(a.x, b.x, b.x + b.width) ||
		isValueInRange(b.x, a.x, a.x + a.width);

	const yOverlap =
		isValueInRange(a.y, b.y, b.y + b.height) ||
		isValueInRange(b.y, a.y, a.y + a.height);

	return xOverlap && yOverlap;
}

function isValueInRange(value: number, min: number, max: number): boolean {
	return value >= min && value <= max;
}

export function isMetaObjectRoom(obj: Phaser.GameObjects.GameObject): boolean {
	if (!isTilemapTile(obj)) {
		return false;
	}
	return true;
}

export function getRooms(
	map: Phaser.Tilemaps.Tilemap
): Phaser.Types.Tilemaps.TiledObject[] {
	return map.filterObjects("Rooms", (obj) => isMetaObjectRoom(obj)) ?? [];
}

export function isPointInRoom(
	x: number,
	y: number,
	room: Phaser.Types.Tilemaps.TiledObject
): boolean {
	if (
		room.x !== undefined &&
		room.y !== undefined &&
		room.width &&
		room.height &&
		x >= room.x &&
		x <= room.x + room.width &&
		y >= room.y &&
		y <= room.y + room.height
	) {
		return true;
	}
	return false;
}

export function getRoomForPoint(
	map: Phaser.Tilemaps.Tilemap,
	x: number,
	y: number
): Phaser.Types.Tilemaps.TiledObject {
	const room = getRooms(map).find((room) => {
		if (isPointInRoom(x, y, room)) {
			return room;
		}
	});
	if (!room) {
		throw new Error(`No room found for position ${x},${y}`);
	}
	return room;
}

export function getItemsInRoom(
	items: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[],
	room: Phaser.Types.Tilemaps.TiledObject
) {
	return items.filter((item) => {
		return isPointInRoom(item.x, item.y, room);
	});
}

export function isEnemyInRoom(
	enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
	room: Phaser.Types.Tilemaps.TiledObject
): boolean {
	return isPointInRoom(enemy.body.x, enemy.body.y, room);
}

export function getEnemiesInRoom(
	enemies: Phaser.Physics.Arcade.Group,
	room: Phaser.Types.Tilemaps.TiledObject
): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] {
	return enemies
		.getChildren()
		.filter((enemy) => {
			if (!isDynamicSprite(enemy)) {
				return false;
			}
			return isEnemyInRoom(enemy, room);
		})
		.reduce((typedEnemies, enemy) => {
			if (!isDynamicSprite(enemy)) {
				return typedEnemies;
			}
			typedEnemies.push(enemy);
			return typedEnemies;
		}, [] as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]);
}

export function getTilesInRoom(
	map: Phaser.Tilemaps.Tilemap,
	room: Phaser.Types.Tilemaps.TiledObject
) {
	const tiles: Phaser.Tilemaps.Tile[] = [];
	map.getTileLayerNames().forEach(
		(layer) =>
			map
				.getTilesWithinWorldXY(
					room.x ?? 0,
					room.y ?? 0,
					room.width ?? 0,
					room.height ?? 0,
					undefined,
					undefined,
					layer
				)
				?.forEach((tile) => {
					tiles.push(tile);
				})
	);
	return tiles;
}

export function hideAllRoomsExcept(
	map: Phaser.Tilemaps.Tilemap,
	enemies: Phaser.Physics.Arcade.Group,
	items: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[],
	activeRoom: Phaser.Types.Tilemaps.TiledObject
) {
	const rooms = getRooms(map);
	rooms.forEach((room) => {
		const tiles = getTilesInRoom(map, room);
		if (activeRoom.id === room.id) {
			// show room
			tiles.forEach((tile) => {
				tile.visible = true;
			});
			getEnemiesInRoom(enemies, room).forEach((enemy) => {
				enemy.setActive(true);
				enemy.setVisible(true);
			});
			getItemsInRoom(items, room).forEach((item) => {
				if (!item.data.get("hidden")) {
					item.visible = true;
				}
			});
		} else {
			// hide room
			tiles.forEach((tile) => {
				tile.visible = false;
			});
			getEnemiesInRoom(enemies, room).forEach((enemy) => {
				enemy.setActive(false);
				enemy.setVisible(false);
			});
			getItemsInRoom(items, room).forEach((item) => {
				item.visible = false;
			});
		}
	});
}

export function getDoorDestinationCoordinates(
	destinationTile: Phaser.Types.Tilemaps.TiledObject,
	destinationDirection: SpriteDirection
): [number, number] {
	if (destinationTile.x == undefined || destinationTile.y === undefined) {
		throw new Error("Destination tile has no position");
	}
	// If the player enters a door, teleport them just past the corresponding
	// door. That way they won't trigger the door on the other side and end up
	// in a loop.
	const destinationX = (() => {
		if (destinationDirection === SpriteLeft) {
			return destinationTile.x - 6;
		}
		if (destinationDirection === SpriteRight) {
			return destinationTile.x + 24;
		}
		return destinationTile.x + 8;
	})();
	const destinationY = (() => {
		if (destinationDirection === SpriteUp) {
			return destinationTile.y - 24;
		}
		if (destinationDirection === SpriteDown) {
			return destinationTile.y + 6;
		}
		return destinationTile.y - 6;
	})();
	return [destinationX, destinationY];
}
