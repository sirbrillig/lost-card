export const SpriteComponent = new Map<
	string,
	Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
>();

export function getPlayerOrThrow(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
	return getSpriteOrThrow("player");
}

export function getSpriteOrThrow(
	entity: string
): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
	const sprite = SpriteComponent.get(entity);
	if (!sprite) {
		throw new Error(`No sprite found for entity ${entity}`);
	}
	return sprite;
}
