import { EnemyManager } from "./EnemyManager";

export type BehaviorCompleteCallback = () => void;

export interface Behavior<
	Key extends string,
	Sprite extends Phaser.GameObjects.Sprite,
> {
	name: Key;
	init(
		sprite: Sprite,
		goToNextState: BehaviorCompleteCallback,
		enemyManager: EnemyManager
	): void;
	update?: (
		sprite: Sprite,
		goToNextState: BehaviorCompleteCallback,
		enemyManager: EnemyManager
	) => void;
	cleanUp?: (sprite: Sprite, enemyManager: EnemyManager) => void;
}
