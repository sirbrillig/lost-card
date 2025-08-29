import { ComponentManager } from "./ComponentManager";
import { Platform } from "./Platform";

export const componentManager = new ComponentManager();

export const PhysicsSpriteComponent = new Map<
	string,
	Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
>();
componentManager.register("PhysicsSprite", PhysicsSpriteComponent);

export const SpriteComponent = new Map<string, Phaser.GameObjects.Sprite>();
componentManager.register("Sprite", SpriteComponent);

export const TweenComponent = new Map<string, Phaser.Tweens.Tween>();
componentManager.register("Tween", TweenComponent);

export const MapComponent = new Map<string, Phaser.Tilemaps.Tilemap>();
componentManager.register("Map", MapComponent);

export const TilemapLayer = new Map<string, Phaser.Tilemaps.TilemapLayer>();
componentManager.register("TilemapLayer", MapComponent);

export const ActiveRoomComponent = new Map<
	string,
	Phaser.Types.Tilemaps.TiledObject
>();
componentManager.register("ActiveRoom", ActiveRoomComponent);

export const ItemComponent = new Map<
	string,
	Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
>();
componentManager.register("Item", ItemComponent);

export const DashingComponent = new Map<string, boolean>();
componentManager.register("Dashing", DashingComponent);

export const PowerInUse = new Map<string, boolean>();
componentManager.register("PowerInUse", PowerInUse);

export const MovingPlatform = new Map<string, Platform>();
componentManager.register("MovingPlatform", MovingPlatform);

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
