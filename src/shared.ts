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

export interface Behavior<Key extends string> {
	name: Key;
	init(sprite: HittableSprite): void;
	update(sprite: HittableSprite): void;
}

export interface BehaviorMachineInterface<Key extends string> {
	getCurrentState(): Key;
	pushState(state: Key): void;
	popState(): void;
}

export interface HittableSprite {
	hit(): void;
	isHittable(): boolean;
}

export function isHittableSprite(obj: unknown): obj is HittableSprite {
	const dynObj = obj as HittableSprite;
	if ("hit" in dynObj || "isHittable" in dynObj) {
		return true;
	}
	return false;
}

export function isDynamicSprite(
	obj: unknown
): obj is Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
	const dynObj = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	return "setVelocityX" in dynObj;
}

export function isDynamicImage(
	obj: unknown
): obj is Phaser.Types.Physics.Arcade.ImageWithDynamicBody {
	const dynObj = obj as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
	return "body" in dynObj;
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

export function getDoorTouchingPlayer(
	doors: Phaser.Types.Tilemaps.TiledObject[],
	player: { x: number; y: number }
): Phaser.Types.Tilemaps.TiledObject | undefined {
	return doors.find((door) => {
		if (
			door.x === undefined ||
			door.y === undefined ||
			!door.height ||
			!door.width
		) {
			throw new Error("Door has no position");
		}
		// Note: for reasons I don't understand, door.x and door.y are the
		// lower-left corner of the tile so we have to adjust them to get the
		// upper-left coordinates.
		const doorX = door.x;
		const doorY = door.y - door.height;
		if (
			player.x >= doorX &&
			player.x < doorX + door.width &&
			player.y >= doorY &&
			player.y < doorY + door.height
		) {
			return true;
		}
		return false;
	});
}
