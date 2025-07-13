export class EnemyManager {
	enemies: Phaser.Physics.Arcade.Group;
	sword: Phaser.Physics.Arcade.Sprite;
	activeRoom: Phaser.Types.Tilemaps.TiledObject | undefined;
	map: Phaser.Tilemaps.Tilemap;

	constructor(
		scene: Phaser.Scene,
		sword: Phaser.Physics.Arcade.Sprite,
		map: Phaser.Tilemaps.Tilemap
	) {
		this.enemies = scene.physics.add.group();
		this.sword = sword;
		this.map = map;
	}
}
