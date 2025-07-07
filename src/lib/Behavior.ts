import { EnemyManager } from "./EnemyManager";

export type BehaviorCompleteCallback = () => void;

export interface Behavior {
	name: string;
	init(
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback,
		enemyManager: EnemyManager
	): void;
	update?: (
		sprite: Phaser.GameObjects.Sprite,
		goToNextState: BehaviorCompleteCallback,
		enemyManager: EnemyManager
	) => void;
	cleanUp?: (
		sprite: Phaser.GameObjects.Sprite,
		enemyManager: EnemyManager
	) => void;
}
