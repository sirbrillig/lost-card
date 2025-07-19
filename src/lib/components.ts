export const PhysicsSpriteComponent = new Map<
	string,
	Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
>();

export const SpriteComponent = new Map<string, Phaser.GameObjects.Sprite>();

export const MapComponent = new Map<string, Phaser.Tilemaps.Tilemap>();

export const ActiveRoomComponent = new Map<
	string,
	Phaser.Types.Tilemaps.TiledObject
>();

export const ItemComponent = new Map<
	string,
	Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
>();

export const DashingComponent = new Map<string, boolean>();

export const PowerInUse = new Map<string, boolean>();

/**********************
 * Helpers ************
 **********************
 */

export function getPlayerOrThrow(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
	return getPhysicsSpriteOrThrow("player");
}

export function getPhysicsSpriteOrThrow(
	entity: string
): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
	let sprite = PhysicsSpriteComponent.get(entity);
	if (!sprite) {
		throw new Error(`No sprite found for entity ${entity}`);
	}
	return sprite;
}

export function getSpriteOrThrow(entity: string) {
	let sprite = SpriteComponent.get(entity);
	if (!sprite) {
		throw new Error(`No sprite found for entity ${entity}`);
	}
	return sprite;
}

export function getMap(): Phaser.Tilemaps.Tilemap {
	const map = MapComponent.get("map");
	if (!map) {
		throw new Error(`No map found for entity "map"`);
	}
	return map;
}

export function getActiveRoom(): undefined | Phaser.Types.Tilemaps.TiledObject {
	return ActiveRoomComponent.get("activeRoom");
}

export function setActiveRoom(room: Phaser.Types.Tilemaps.TiledObject): void {
	ActiveRoomComponent.set("activeRoom", room);
}
