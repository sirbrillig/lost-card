export class EnemyManager {
	enemies: Phaser.Physics.Arcade.Group;

	constructor(scene: Phaser.Scene) {
		this.enemies = scene.physics.add.group();
	}
}
