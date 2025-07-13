export const SpriteComponent = new Map<
	string,
	Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
>();

export function getPlayerOrThrow(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
	const player = SpriteComponent.get("player");
	if (!player) {
		throw new Error("No player found");
	}
	return player;
}
