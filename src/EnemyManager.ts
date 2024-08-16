export class EnemyManager {
	enemies: Phaser.Physics.Arcade.Group;
	player: Phaser.Physics.Arcade.Sprite;

	constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite) {
		this.enemies = scene.physics.add.group();
		this.player = player;
	}
}
