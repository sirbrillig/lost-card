import { BaseMonster } from "./BaseMonster";

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
	StunPlayer: "stunPlayer",
	FreezePlayer: "freezePlayer",
	GameSaved: "gameSaved",
	PowerEquipped: "PowerEquipped",
	AuraEquipped: "AuraEquipped",
	LeavingRoom: "LeavingRoom",
	EnteredRoom: "EnteredRoom",
	PlayerMoved: "PlayerMoved",
};

export const DataKeys = {
	Stunned: "stunned",
	Hittable: "hittable",
	Pushable: "pushable",
	Freezable: "freezable",
	MonsterPosition: "monsterPosition",
	ActivePower: "activePower",
	PotionCount: "potionCount",
	PotionTotalCount: "potionTotalCount",
	KeyCount: "keyCount",
	SwordAttackActive: "attackActive",
	DefeatedBosses: "DefeatedBosses",
	CollectedItems: "itemsRemoved",
	RevealedItems: "itemsRevealed",
	ItemObjectId: "objectId",
};

export type Region = "MK" | "IK" | "CK" | "FK" | "PK" | "SK" | "FB";

export type Auras = "SunCard" | "HeartCard" | "SwordCard";

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

export const auraOrder: Auras[] = ["HeartCard", "SwordCard", "SunCard"];

export function getPowerEquippedKey(power: Powers | Auras): string {
	switch (power) {
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
		default:
			throw new Error(`Unknown power ${power}`);
	}
}

export function getIconForPower(power: Powers | Auras): {
	texture: string;
	frame: number;
} {
	switch (power) {
		case "SunCard":
			return { texture: "cards", frame: 24 };
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
			return destinationTile.x - 24;
		}
		if (destinationDirection === SpriteRight) {
			return destinationTile.x + 24;
		}
		return destinationTile.x;
	})();
	const destinationY = (() => {
		if (destinationDirection === SpriteUp) {
			return destinationTile.y - 34;
		}
		if (destinationDirection === SpriteDown) {
			return destinationTile.y + 10;
		}
		return destinationTile.y - 12;
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

export type SaveData = Record<string, string | number | boolean> & {
	playerX: number;
	playerY: number;
};

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
		registry.set(key, saveData[key]);
	});
}

export function loadSavedData(): SaveData | undefined {
	const rawSaveData = localStorage.getItem("lost-card-save");
	if (!rawSaveData) {
		return undefined;
	}
	const saveData = JSON.parse(rawSaveData);
	if (saveData?.playerX === undefined || saveData.playerY === undefined) {
		return undefined;
	}
	return saveData;
}

export function isEnemy(
	sprite: Phaser.GameObjects.Sprite
): sprite is BaseMonster<"test"> {
	const test = sprite as BaseMonster<"test">;
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
