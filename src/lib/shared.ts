import { BaseMonster } from "../monsters/BaseMonster";
import { EnemyManager } from "../lib/EnemyManager";
import { MainEvents } from "./MainEvents";
import { config } from "./config";
import { getActiveRoom } from "./components";

export const saveGameKey = "lost-card-save";

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

export type Sound =
	| Phaser.Sound.NoAudioSound
	| Phaser.Sound.HTML5AudioSound
	| Phaser.Sound.WebAudioSound;

export const Events = {
	MonsterDefeated: "defeated",
	MonsterDying: "dying",
	MonsterHit: "hit",
	MonsterStun: "stun",
	MonsterKillRequest: "kill",
	EnemyHitPlayer: "enemyHitPlayer",
	ConfusePlayer: "confusePlayer",
	StunPlayer: "stunPlayer",
	FreezePlayer: "freezePlayer",
	GameSaved: "gameSaved",
	PowerEquipped: "PowerEquipped",
	AuraEquipped: "AuraEquipped",
	LeavingRoom: "LeavingRoom",
	EnteredRoom: "EnteredRoom",
	PlayerMoved: "PlayerMoved",
	PlayerPositionChanged: "PlayerPositionChanged",
};

export const DataKeys = {
	Stunned: "stunned",
	IsHarmless: "isHarmless",
	Hittable: "hittable",
	Pushable: "pushable",
	Freezable: "freezable",
	MonsterPosition: "monsterPosition",
	ActivePower: "activePower",
	SwordAttackActive: "attackActive",
	DestroyedBySword: "affectedBySword",
	IsSwitch: "isSwitch",
	DoorTarget: "doorto",
	ControlledBy: "controlledBy",
	GateOpenDirection: "openDirection",
	OriginalPosition: "originalPosition",
	ItemObjectId: "objectId",
	OpenGate: "openGate",
	PlayerDirection: "PlayerDirection",
	DefeatedMonsters: "DefeatedBosses",
	LockedDoor: "LockedDoor",
} as const;

export const MapMetaKeys = {
	StartPoint: "Start Point",
	TempStartPoint: "Temp Start",
	DarknessAreaName: "Darkness",
	SpotlightAreaName: "Spotlight",
	DoorLockAfterExit: "locks",
	DoorUnlockAfterEnemiesDefeat: "enemyUnlock",
} as const;

export const LockableDoorSpriteIndices = [
	990, 1031, 1072, 1113, 995, 1036, 1077, 1118, 1000, 1041, 1082, 1123, 1005,
	1046, 1087, 1128, 1159, 1200, 1241, 1282, 1164, 1205, 1246, 1287, 1169, 1210,
	1251, 1292, 1215, 1256, 1297, 1338,
];

export type Region = "MK" | "IK" | "CK" | "FK" | "PK" | "SK" | "FB";

export type Auras =
	| "SunCard"
	| "HeartCard"
	| "SwordCard"
	| "MountainCard"
	| "ClockCard"
	| "FishCard";

export type Powers =
	| "IceCard"
	| "WindCard"
	| "PlantCard"
	| "FireCard"
	| "CloudCard"
	| "SpiritCard";

export const powerOrder: Powers[] = [
	"WindCard",
	"IceCard",
	"PlantCard",
	"FireCard",
	"SpiritCard",
	"CloudCard",
];

export const auraOrder: Auras[] = [
	"HeartCard",
	"SwordCard",
	"MountainCard",
	"SunCard",
	"ClockCard",
	"FishCard",
];

export function getEquippedAuras(registry: Phaser.Data.DataManager): Auras[] {
	return auraOrder.filter((aura) => {
		return getDataFromRegistry(registry, getPowerEquippedKey(aura)) ?? false;
	});
}

export function isAuraActive(
	registry: Phaser.Data.DataManager,
	aura: Auras
): boolean {
	return getActiveAuras(registry).includes(aura);
}

export function deactivateAura(registry: Phaser.Data.DataManager, aura: Auras) {
	const auras = getActiveAuras(registry).filter((aa) => aa !== aura);
	saveDataToRegistry(registry, "ActiveAuras", auras);
	MainEvents.emit(Events.AuraEquipped);
}

export function activateAura(registry: Phaser.Data.DataManager, aura: Auras) {
	const auras = getActiveAuras(registry);
	auras.push(aura);
	saveDataToRegistry(registry, "ActiveAuras", auras);
	MainEvents.emit(Events.AuraEquipped);
}

export function getActiveAuras(registry: Phaser.Data.DataManager): Auras[] {
	return getDataFromRegistry(registry, "ActiveAuras") ?? [];
}

export function getPowerEquippedKey(
	power: Powers | Auras
): keyof SaveDataHasCard {
	switch (power) {
		case "ClockCard":
			return "hasClockCard";
		case "MountainCard":
			return "hasMountainCard";
		case "SwordCard":
			return "hasSwordCard";
		case "SunCard":
			return "hasSunCard";
		case "HeartCard":
			return "hasHeartCard";
		case "WindCard":
			return "hasWindCard";
		case "IceCard":
			return "hasIceCard";
		case "PlantCard":
			return "hasPlantCard";
		case "FireCard":
			return "hasFireCard";
		case "SpiritCard":
			return "hasSpiritCard";
		case "CloudCard":
			return "hasCloudCard";
		case "FishCard":
			return "hasFishCard";
		default:
			throw new Error(`Unknown power ${power}`);
	}
}

export function getIconForPower(power: Powers | Auras): {
	texture: string;
	frame: number;
} {
	switch (power) {
		case "FishCard":
			return { texture: "cards", frame: 68 };
		case "ClockCard":
			return { texture: "cards", frame: 43 };
		case "SunCard":
			return { texture: "cards", frame: 24 };
		case "MountainCard":
			return { texture: "cards", frame: 26 };
		case "SwordCard":
			return { texture: "cards", frame: 29 };
		case "HeartCard":
			return { texture: "cards", frame: 17 };
		case "WindCard":
			return { texture: "cards", frame: 44 };
		case "IceCard":
			return { texture: "cards", frame: 19 };
		case "PlantCard":
			return { texture: "cards", frame: 25 };
		case "FireCard":
			return { texture: "cards", frame: 18 };
		case "SpiritCard":
			return { texture: "cards", frame: 37 };
		case "CloudCard":
			return { texture: "cards", frame: 20 };
		default:
			throw new Error(`Unknown power ${power}`);
	}
}

export function isDynamicSprite(
	obj: unknown
): obj is Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
	const dynObj = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	return "body" in dynObj && dynObj.body && "enable" in dynObj.body;
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
	return hasXandY(obj) && "layer" in tile;
}

export function isTileWithPropertiesObject(
	obj: unknown
): obj is { properties: Record<string, any> } {
	const tile = obj as Phaser.Tilemaps.Tile;
	return "properties" in tile && !Array.isArray(tile.properties);
}

export type ObjectWithXandY = { x: number; y: number };

export function hasXandY(obj: unknown): obj is ObjectWithXandY {
	const test = obj as ObjectWithXandY;
	return (
		"x" in test && "y" in test && test.x !== undefined && test.y !== undefined
	);
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

export function isPlayerInArea(
	player: { x: number; y: number },
	area: { x?: number; y?: number; width?: number; height?: number }
): boolean {
	const playerPosition = {
		x: player.x + config.playerHitBoxWidth * config.playerOriginX,
		y: player.y + config.playerHitBoxHeight * config.playerOriginY,
		width: config.playerHitBoxWidth,
		height: config.playerHitBoxHeight,
	};
	return doRectanglesOverlap(playerPosition, {
		x: area.x ?? 0,
		y: area.y ?? 0,
		width: area.width ?? 0,
		height: area.height ?? 0,
	});
}

export function isPlayerInMetaArea(
	map: Phaser.Tilemaps.Tilemap,
	player: { x: number; y: number },
	metaKey: (typeof MapMetaKeys)[keyof typeof MapMetaKeys]
): boolean {
	const areas = map.filterObjects("MetaObjects", (obj) => obj.name === metaKey);
	return areas?.some((area) => isPlayerInArea(player, area)) ?? false;
}

function isValueInRange(value: number, min: number, max: number): boolean {
	return value >= min && value <= max;
}

export function getRooms(
	map: Phaser.Tilemaps.Tilemap
): Phaser.Types.Tilemaps.TiledObject[] {
	return map.getObjectLayer("Rooms")?.objects ?? [];
}

export function getRoomsInRegion(
	map: Phaser.Tilemaps.Tilemap,
	region: Region
): Phaser.Types.Tilemaps.TiledObject[] {
	return getRooms(map).filter((room) => {
		return room.name.startsWith(region);
	});
}

export function getRoomsVisited(registry: Phaser.Data.DataManager): string[] {
	return getDataFromRegistry(registry, "RoomsVisited") ?? [];
}

export function addVisitedRoom(
	registry: Phaser.Data.DataManager,
	room: string
): void {
	const rooms = getRoomsVisited(registry);
	if (rooms.some((roomName) => roomName === room)) {
		return;
	}
	rooms.push(room);
	saveDataToRegistry(registry, "RoomsVisited", rooms);
}

export function getRegionColor(code: Region): number {
	switch (code) {
		case "MK":
			return 0xf89211;
		case "CK":
			return 0xcbcac8;
		case "IK":
			return 0x21d3da;
		case "PK":
			return 0x3fe048;
		case "FK":
			return 0xce0000;
		case "SK":
			return 0xb33fe0;
		case "FB":
			return 0xf2f433;
	}
}

export function isPointInRegion(
	map: Phaser.Tilemaps.Tilemap,
	x: number,
	y: number,
	region: Region
): boolean {
	return getRoomsInRegion(map, region).some((room) => {
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
	});
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

export function getDoorsInRoom(
	doors: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[],
	room: Phaser.Types.Tilemaps.TiledObject
) {
	return doors.filter((door) => {
		return isPointInRoom(door.x, door.y, room);
	});
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
	room: Phaser.Types.Tilemaps.TiledObject,
	allowedLayers?: string[]
) {
	const tiles: Phaser.Tilemaps.Tile[] = [];
	let layers = map.getTileLayerNames();
	if (allowedLayers) {
		layers = layers.filter((layer) => allowedLayers.includes(layer));
	}
	layers.forEach(
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
	activeRoom: Phaser.Types.Tilemaps.TiledObject,
	spawnPoints: Phaser.Types.Tilemaps.TiledObject[]
) {
	const rooms = getRooms(map);
	rooms.forEach((room) => {
		const tiles = getTilesInRoom(map, room);
		if (activeRoom.id === room.id) {
			// show room
			tiles.forEach((tile) => {
				tile.visible = true;
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
				// Restore each surviving enemy to spawnPoints in main scene so it can
				// be respawned when that room is entered again, then destroy it.
				const newSpawnPoint = map.findObject("Creatures", (point) => {
					if (!hasXandY(point)) {
						return false;
					}
					if (!("id" in point)) {
						return false;
					}
					if (!("mapSpawnPointId" in enemy)) {
						return false;
					}
					return point.id === enemy.mapSpawnPointId;
				});
				if (
					newSpawnPoint &&
					!spawnPoints.some((x) => x.id === newSpawnPoint.id)
				) {
					spawnPoints.push(newSpawnPoint);
				}
				enemy.destroy(true);
			});
			getItemsInRoom(items, room).forEach((item) => {
				item.visible = false;
			});
		}
	});
}

export function getRegionName(code: Region) {
	switch (code) {
		case "MK":
			return "Mountain Kingdom";
		case "CK":
			return "Cloud Kingdom";
		case "IK":
			return "Ice Kingdom";
		case "PK":
			return "Plant Kingdom";
		case "FK":
			return "Fire Kingdom";
		case "SK":
			return "Spirit Kingdom";
		case "FB":
			return "Final Boss";
	}
}

export function getRegionFromRoomName(name: string): Region {
	if (name.startsWith("FB")) {
		return "FB";
	}
	if (name.startsWith("MK")) {
		return "MK";
	}
	if (name.startsWith("CK")) {
		return "CK";
	}
	if (name.startsWith("PK")) {
		return "PK";
	}
	if (name.startsWith("FK")) {
		return "FK";
	}
	if (name.startsWith("SK")) {
		return "SK";
	}
	if (name.startsWith("IK")) {
		return "IK";
	}
	throw new Error(`Unknown region for room ${name}`);
}

export function getDoorDestinationCoordinates(
	destinationTile: Phaser.Types.Tilemaps.TiledObject,
	/**
	 * The direction of the target door's *entrance*, so you will come out in the
	 * opposite direction of this. So if you are walking up, and pass through a
	 * door, this will be SpriteDown because the target door's entrance is down.
	 */
	destinationDirection: SpriteDirection
): [number, number] {
	if (destinationTile.x == undefined || destinationTile.y === undefined) {
		throw new Error("Destination tile has no position");
	}
	if (
		destinationTile.width == undefined ||
		destinationTile.height === undefined
	) {
		throw new Error("Destination tile has no size");
	}
	// If the player enters a door, teleport them just past the corresponding
	// door in the opposite direction of the target door. That way they won't
	// trigger the door on the other side and end up in a loop.
	//
	// Note that these positions have to account for the visual illusion that the
	// room is 3D, so the "up" and "down" are not quite even.
	const destinationX = (() => {
		// Player walking right
		if (destinationDirection === SpriteLeft) {
			return (
				destinationTile.x + destinationTile.width + config.playerHitBoxWidth
			);
		}
		// Player walking left
		if (destinationDirection === SpriteRight) {
			return destinationTile.x - destinationTile.width / 2;
		}
		// Player walking up or down
		return destinationTile.x + destinationTile.width / 2;
	})();
	const destinationY = (() => {
		// Player walking down
		if (destinationDirection === SpriteUp) {
			return destinationTile.y + destinationTile.height / 2;
		}
		// Player walking up
		if (destinationDirection === SpriteDown) {
			return destinationTile.y - destinationTile.height * 2;
		}
		// Player walking left or right
		return destinationTile.y - destinationTile.height;
	})();
	return [destinationX, destinationY];
}

/**
 * Custom version of createFromObjects that provides callbacks
 *
 * The callback argument will be called for each sprite after it has been
 * created. Its arguments are the object that the sprite was created from and
 * the sprite itself.
 *
 * Similar to https://github.com/samme/phaser/blob/master/src/tilemaps/Tilemap.js#L770
 */
export function createSpritesFromObjectLayer(
	map: Phaser.Tilemaps.Tilemap,
	layerName: string,
	config?: {
		filterCallback?: (
			layerObject: Phaser.Types.Tilemaps.TiledObject
		) => boolean;
		callback?: (
			layerObject: Phaser.Types.Tilemaps.TiledObject,
			sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
		) => void;
		getTilesetKeyByName?: (tilesetName: string) => string | undefined;
	}
): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] {
	const created: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
	const gidToTextureMap: Record<string, Phaser.Tilemaps.Tileset> = {};
	map.tilesets.forEach((tileset) => {
		for (let i = 0; i < tileset.total; i++) {
			gidToTextureMap[tileset.firstgid + i] = tileset;
		}
	});

	const layer = map.getObjectLayer(layerName);
	if (!layer) {
		throw new Error(
			`Could not find layer "${layerName}" to convert to sprites`
		);
	}
	layer.objects.forEach((obj) => {
		const filterResult = config?.filterCallback?.(obj) ?? true;
		if (
			!filterResult ||
			!hasXandY(obj) ||
			!hasGid(obj) ||
			!hasWidthAndHeight(obj)
		) {
			return;
		}

		const tileset = gidToTextureMap[obj.gid];
		if (!tileset) {
			console.warn(`No tileset found for layer object "${obj.gid}"`, obj);
			console.warn("tilesets are", gidToTextureMap);
			return;
		}
		let tilesetKey = tileset.image?.key;
		if (!tilesetKey) {
			tilesetKey = config?.getTilesetKeyByName?.(tileset.name);
		}
		if (!tilesetKey) {
			console.warn(`No tileset key found for layer object "${obj.gid}"`, obj);
			console.warn("tileset is", tileset);
			return;
		}

		const frame = obj.gid - tileset.firstgid;
		const sprite = new Phaser.GameObjects.Sprite(
			map.scene,
			obj.x,
			obj.y,
			tilesetKey,
			frame
		);
		sprite.setDisplaySize(obj.width, obj.height);
		sprite.setDataEnabled();
		setSpritePropertiesFromJSON(sprite, obj.properties);
		sprite.setName(obj.name);
		map.scene.physics.add.existing(sprite);
		map.scene.add.existing(sprite);

		const offset = {
			x: sprite.originX * obj.width,
			y: (sprite.originY - (obj.gid ? 1 : 0)) * obj.height,
		};
		if (obj.rotation) {
			const angle = Phaser.Math.DegToRad(obj.rotation);

			Phaser.Math.Rotate(offset, angle);

			sprite.rotation = angle;
		}

		sprite.x += offset.x;
		sprite.y += offset.y;

		if (
			obj.flippedHorizontal !== undefined ||
			obj.flippedVertical !== undefined
		) {
			sprite.setFlip(
				obj.flippedHorizontal ?? false,
				obj.flippedVertical ?? false
			);
		}

		if (!obj.visible) {
			sprite.visible = false;
		}

		if (!isDynamicSprite(sprite)) {
			throw new Error("Created sprite is not dynamic");
		}

		config?.callback?.(obj, sprite);

		created.push(sprite);
	});

	return created;
}

export function hasGid(obj: unknown): obj is { gid: number } {
	const test = obj as { gid: number };
	return "gid" in test;
}

export function hasWidthAndHeight(
	obj: unknown
): obj is { width: number; height: number } {
	const test = obj as { width: number; height: number };
	return (
		"width" in test &&
		"height" in test &&
		test.width !== undefined &&
		test.height !== undefined
	);
}

/**
 * Copied from https://github.com/samme/phaser/blob/master/src/tilemaps/ObjectHelper.js#L177
 */
function setSpritePropertiesFromJSON(
	sprite: Phaser.GameObjects.Sprite,
	properties: unknown
) {
	if (!properties) {
		return;
	}

	if (Array.isArray(properties)) {
		for (var i = 0; i < properties.length; i++) {
			var prop = properties[i];

			if (sprite[prop.name as keyof typeof sprite] !== undefined) {
				(sprite as any)[prop.name as keyof typeof sprite] = prop.value;
			} else {
				sprite.setData(prop.name, prop.value);
			}
		}

		return;
	}

	for (var key in properties) {
		if (sprite[key as keyof typeof sprite] !== undefined) {
			(sprite as any)[key as keyof typeof sprite] =
				properties[key as keyof typeof properties];
		} else {
			sprite.setData(key, properties[key as keyof typeof properties]);
		}
	}
}

export interface SaveDataHasCard {
	hasClockCard?: boolean;
	hasMountainCard?: boolean;
	hasSwordCard?: boolean;
	hasSunCard?: boolean;
	hasHeartCard?: boolean;
	hasWindCard?: boolean;
	hasIceCard?: boolean;
	hasPlantCard?: boolean;
	hasFireCard?: boolean;
	hasSpiritCard?: boolean;
	hasCloudCard?: boolean;
	hasFishCard?: boolean;
}

export interface SaveDataPlayerPosition {
	playerActiveRoom?: string;
	playerRoomX?: number;
	playerRoomY?: number;
}

export type SaveData = {
	activePower?: Powers;
	potionCount?: number;
	potionTotalCount?: number;
	keyCount?: number;
	DefeatedBosses?: string[];
	itemsRemoved?: number[];
	itemsRevealed?: number[];
	SecretRoomsFound?: string[];
	SecretRoomsTotal?: number;
	ActiveAuras?: Auras[];
	RoomsVisited?: string[];
	SwitchesPressed?: string[];
	playerHalfHearts?: number;
	playerTotalHitPoints?: number;
	playerHitPoints?: number;
	hasSword?: boolean;
} & SaveDataHasCard &
	SaveDataPlayerPosition;

export function getDataFromRegistry<K extends keyof SaveData>(
	registry: Phaser.Data.DataManager,
	key: K
): SaveData[K] {
	return registry.get(key);
}

export function saveDataToRegistry<K extends keyof SaveData>(
	registry: Phaser.Data.DataManager,
	key: K,
	value: SaveData[K]
): void {
	registry.set(key, value);
}

export function getAllSavedDataFromRegistry(
	registry: Phaser.Data.DataManager
): SaveData {
	return registry.getAll();
}

export function loadSavedRegistry(
	registry: Phaser.Data.DataManager,
	saveData: SaveData
): void {
	registry.reset();
	Object.keys(saveData).forEach((key) => {
		if (key === "playerHitPoints") {
			// Always give player full HP when they load
			return;
		}
		saveDataToRegistry(
			registry,
			key as keyof SaveData,
			saveData[key as keyof SaveData]
		);
	});
}

export function loadSavedData(): SaveData | undefined {
	const rawSaveData = localStorage.getItem(saveGameKey);
	if (!rawSaveData) {
		return undefined;
	}
	const saveData = JSON.parse(rawSaveData);
	if (typeof saveData !== "object") {
		return undefined;
	}
	return saveData;
}

export function savePlayerPositionToRegistry(
	registry: Phaser.Data.DataManager,
	position: SaveDataPlayerPosition
): void {
	saveDataToRegistry(registry, "playerActiveRoom", position.playerActiveRoom);
	saveDataToRegistry(registry, "playerRoomY", position.playerRoomY);
	saveDataToRegistry(registry, "playerRoomX", position.playerRoomX);
}

export function getPlayerCoordinates(
	saveData: SaveDataPlayerPosition,
	map: Phaser.Tilemaps.Tilemap
): { x: number; y: number } | undefined {
	if (
		!saveData.playerRoomX ||
		!saveData.playerRoomY ||
		!saveData.playerActiveRoom
	) {
		return undefined;
	}
	const playerRoomX = saveData.playerRoomX;
	const playerRoomY = saveData.playerRoomY;
	const roomName = saveData.playerActiveRoom;
	const matchingRoom = getRooms(map).find((room) => room.name === roomName);
	if (matchingRoom?.x === undefined || matchingRoom.y === undefined) {
		return undefined;
	}
	const globalX = matchingRoom.x + playerRoomX;
	const globalY = matchingRoom.y + playerRoomY;
	// Just double-check
	if (!isPointInRoom(globalX, globalY, matchingRoom)) {
		return undefined;
	}
	return {
		x: globalX,
		y: globalY,
	};
}

export function getSavedDataPlayerPosition(
	map: Phaser.Tilemaps.Tilemap,
	globalPlayerX: number,
	globalPlayerY: number
): SaveDataPlayerPosition {
	const room = getRoomForPoint(map, globalPlayerX, globalPlayerY);
	if (typeof room.x !== "number" || typeof room.y !== "number") {
		throw new Error("Could not get position for room with player");
	}
	return {
		playerActiveRoom: room.name,
		playerRoomX: globalPlayerX - room.x,
		playerRoomY: globalPlayerY - room.y,
	};
}

export function isEnemy(
	sprite: Phaser.GameObjects.Sprite
): sprite is BaseMonster {
	const test = sprite as BaseMonster;
	return "hitPoints" in test;
}

export function moveHitboxInFrontOfSprite(
	sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
	direction: SpriteDirection,
	hitbox: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
) {
	const xOffset = (() => {
		if (direction === SpriteLeft) {
			return -sprite.body.height / 2;
		}
		if (direction === SpriteRight) {
			return sprite.body.height / 2;
		}
		return 0;
	})();
	const yOffset = (() => {
		if (direction === SpriteUp) {
			return -sprite.body.height / 2;
		}
		if (direction === SpriteDown) {
			return sprite.body.height / 2;
		}
		return 0;
	})();

	hitbox.setOrigin(0.5);
	hitbox.x = sprite.body.center.x + xOffset;
	hitbox.y = sprite.body.center.y + yOffset;
}

export function getControllerType(
	scene: Phaser.Scene
): "dualshock" | "xbox" | undefined {
	if (scene.input.gamepad?.pad1?.id.toLowerCase().includes("dual")) {
		return "dualshock";
	}
	if (scene.input.gamepad?.pad1?.id.toLowerCase().includes("xbox")) {
		return "xbox";
	}
}

export interface ButtonNames {
	ok: string;
	power: string;
	heal: string;
	map: string;
	rotatePower: string;
}

export function getButtonNames(scene: Phaser.Scene): ButtonNames {
	switch (getControllerType(scene)) {
		case "dualshock":
			return {
				ok: "X (or A)",
				power: "SQUARE (or X)",
				heal: "TRIANGLE (or Y)",
				map: "START",
				rotatePower: "L1 and R1",
			};
		case "xbox":
			return {
				ok: "A",
				power: "X",
				heal: "Y",
				map: "START",
				rotatePower: "L1 and R1",
			};
		default:
			return {
				ok: "SPACE",
				power: "SHIFT",
				heal: "R or P",
				map: "TAB or M",
				rotatePower: "[ and ]",
			};
	}
}

export function vibrate(
	scene: Phaser.Scene,
	intensity: 1 | 2,
	duration: number
) {
	scene.input.gamepad?.pad1?.vibration?.playEffect("dual-rumble", {
		duration,
		strongMagnitude: intensity === 1 ? 0.1 : 0.3,
		weakMagnitude: intensity === 1 ? 0.2 : 0.5,
	});
}

export function getCardNameForPower(card: Powers | Auras): string {
	switch (card) {
		case "MountainCard":
			return "Mountain Card";
		case "FishCard":
			return "Fish Card";
		case "ClockCard":
			return "Clock Card";
		case "SwordCard":
			return "Sword Card";
		case "HeartCard":
			return "Heart Card";
		case "SunCard":
			return "Sun Card";
		case "IceCard":
			return "Ice Card";
		case "PlantCard":
			return "Plant Card";
		case "SpiritCard":
			return "Spirit Card";
		case "WindCard":
			return "Wind Card";
		case "FireCard":
			return "Fire Card";
		case "CloudCard":
			return "Cloud Card";
	}
}

export function getAuraDescription(card: Auras): string {
	switch (card) {
		case "FishCard":
			return "You can walk through water or lava safely.";
		case "ClockCard":
			return "Your powers can be used more frequently.";
		case "HeartCard":
			return "Your hearts will slowly restore on their own.";
		case "MountainCard":
			return "You can no longer be pushed by attacks.";
		case "SwordCard":
			return "Your sword will deal more damage per hit.";
		case "SunCard":
			return "You will be invincible for longer after being hit.";
	}
}

export function knockBack(
	scene: Phaser.Scene,
	body: Phaser.Physics.Arcade.Body,
	time: number,
	speed: number,
	direction: SpriteDirection,
	completeCallback?: () => void
) {
	scene.time.addEvent({
		delay: time,
		callback: () => {
			body.stop();
			completeCallback?.();
		},
	});

	body.stop();
	switch (direction) {
		case SpriteUp:
			body.setVelocityY(-speed);
			break;
		case SpriteRight:
			body.setVelocityX(speed);
			break;
		case SpriteDown:
			body.setVelocityY(speed);
			break;
		case SpriteLeft:
			body.setVelocityX(-speed);
			break;
	}
}

export function isSpriteInsideSolidTile(
	sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
	tileLayer: Phaser.Tilemaps.TilemapLayer
) {
	const x = sprite.body.center.x;
	const y = sprite.body.center.y;
	const tiles = tileLayer.getTilesWithinWorldXY(x, y, 2, 2, {
		isColliding: true,
	});

	return tiles.length > 0;
}

export function jumpToTileWithArc({
	sprite,
	targetX,
	targetY,
	jumpHeight,
	duration,
	shadow,
}: {
	sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	targetX: number;
	targetY: number;
	jumpHeight: number;
	duration: number;
	shadow?: Phaser.GameObjects.Sprite;
}) {
	const startX = sprite.x;
	const startY = sprite.y;

	sprite.scene.tweens.add({
		targets: sprite,
		duration: duration,
		ease: "Power2",
		x: targetX,
		y: targetY,
		onUpdate: function (tween) {
			const progress = tween.progress;

			// Linear interpolation for X movement
			sprite.x = startX + (targetX - startX) * progress;

			// Parabolic arc for Y movement (creates the jump effect)
			const arcProgress = 4 * progress * (1 - progress); // Parabolic curve
			const currentHeight = jumpHeight * arcProgress;

			sprite.y = startY + (targetY - startY) * progress - currentHeight;

			if (shadow) {
				// Shadow follows the ground path (no height offset)
				shadow.x = startX + (targetX - startX) * progress;
				shadow.y = startY + (targetY - startY) * progress;
			}
		},
	});

	// Create the jump tween
	return sprite.scene.tweens.add({
		targets: sprite,
		duration: duration,
		ease: "Power2",
		x: targetX,
		y: targetY,
		onUpdate: function (tween) {
			const progress = tween.progress;

			// Linear interpolation for X movement
			sprite.x = startX + (targetX - startX) * progress;

			// Parabolic arc for Y movement (creates the jump effect)
			const arcProgress = 4 * progress * (1 - progress); // Parabolic curve
			const currentHeight = jumpHeight * arcProgress;

			sprite.y = startY + (targetY - startY) * progress - currentHeight;

			if (shadow) {
				// Shadow follows the ground path (no height offset)
				shadow.x = startX + (targetX - startX) * progress;
				shadow.y = startY + (targetY - startY) * progress;
			}
		},
	});
}

export function createShadowSprite({
	scene,
	x,
	y,
}: {
	scene: Phaser.Scene;
	x: number;
	y: number;
}) {
	let shadow;

	// Create a simple circular shadow using graphics
	const shadowGraphics = scene.add.graphics();
	shadowGraphics.fillStyle(0x000000, 0.6);
	const shadowWidth = 16;
	const shadowHeight = 10;
	shadowGraphics.fillEllipse(
		shadowWidth / 2,
		shadowHeight / 2,
		shadowWidth,
		shadowHeight
	);
	shadowGraphics.generateTexture("dynamicShadow", shadowWidth, shadowHeight);
	shadowGraphics.destroy();

	shadow = scene.add.sprite(x, y, "dynamicShadow");

	shadow.setTint(0x000000);
	shadow.setAlpha(0.6);

	return shadow;
}

export function getLimitedEndPoint({
	startX,
	startY,
	endX,
	endY,
	maxLength,
}: {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	maxLength: number;
}) {
	const dx = endX - startX;
	const dy = endY - startY;
	const distance = Math.sqrt(dx * dx + dy * dy);

	if (distance <= maxLength) {
		return { x: endX, y: endY };
	} else {
		const ratio = maxLength / distance;
		return {
			x: startX + dx * ratio,
			y: startY + dy * ratio,
		};
	}
}

export function createPromiseTimer(scene: Phaser.Scene, delay: number) {
	return new Promise<void>((resolve) => {
		scene.time.delayedCall(delay, () => {
			resolve();
		});
	});
}

export interface MapMonsterProperties {
	doNotRespawn?: boolean;
}

export interface TiledObjectProperty {
	name: string;
	type: "bool" | "string" | "number";
	value: string | boolean | number;
}

export function getPropertiesFromPoint(
	point: Phaser.Types.Tilemaps.TiledObject
): MapMonsterProperties {
	if (!point.properties) {
		return {};
	}
	const result: MapMonsterProperties = {};
	point.properties.forEach((property: TiledObjectProperty) => {
		if (property.name === "doNotRespawn") {
			result.doNotRespawn = Boolean(property.value);
		}
	});
	return result;
}

export function areMonstersInRoom(
	enemyManager: EnemyManager,
	ignoreMonsters?: BaseMonster[]
): boolean {
	const activeRoom = getActiveRoom();
	if (!activeRoom) {
		return false;
	}
	const enemiesInRoom = getEnemiesInRoom(enemyManager.enemies, activeRoom);
	return (
		enemiesInRoom.filter(
			(_enemy) =>
				isEnemy(_enemy) &&
				!ignoreMonsters?.some(
					(ignoreMonster) =>
						ignoreMonster.mapSpawnPointId === _enemy.mapSpawnPointId
				)
		).length > 0
	);
}

export const tilePropertiesThatDoNotBlockFire = [
	"isHole",
	"isLava",
	"isWater",
	"isSpikes",
	"isSlime",
	"isSky",
];

export function doesTileBlockFire(
	tile: Phaser.Tilemaps.Tile | Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
): boolean {
	let properties = isTileWithPropertiesObject(tile) ? tile.properties : {};
	if (isDynamicSprite(tile)) {
		properties = tile.data.values;
	}
	if (!properties.collides) {
		return false;
	}
	if (tilePropertiesThatDoNotBlockFire.some((prop) => properties[prop])) {
		return false;
	}
	return true;
}

export function makeFireExplosion(
	scene: Phaser.Scene,
	target: { x: number; y: number }
): void {
	const effect = scene.add.sprite(target.x, target.y, "fire-power-right", 0);
	effect.setDepth(config.effectDepth);
	effect.anims.play("fire-power-right", true);
	effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
		effect.destroy();
	});
}
