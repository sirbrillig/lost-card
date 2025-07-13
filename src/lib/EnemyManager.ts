export class EnemyManager {
	enemies: Phaser.Physics.Arcade.Group;
	activeRoom: Phaser.Types.Tilemaps.TiledObject | undefined;
	map: Phaser.Tilemaps.Tilemap;

	constructor(scene: Phaser.Scene, map: Phaser.Tilemaps.Tilemap) {
		this.enemies = scene.physics.add.group();
		this.map = map;
	}
}
