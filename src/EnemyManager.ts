export class EnemyManager {
	enemies: Phaser.Physics.Arcade.Group;
	player: Phaser.Physics.Arcade.Sprite;
	activeRoom: Phaser.Types.Tilemaps.TiledObject | undefined;
	map: Phaser.Tilemaps.Tilemap;

	constructor(
		scene: Phaser.Scene,
		player: Phaser.Physics.Arcade.Sprite,
		map: Phaser.Tilemaps.Tilemap
	) {
		this.enemies = scene.physics.add.group();
		this.player = player;
		this.map = map;
	}
}
