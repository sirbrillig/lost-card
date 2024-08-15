import { isDynamicSprite } from "./shared";
import { EnemyManager } from "./EnemyManager";
import { Behavior, BehaviorMachineInterface } from "./behavior";
import { MainEvents } from "./MainEvents";
import { MonsterA } from "./MonsterA";

export class WaitForActive<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#distanceToActivate: number = 100;
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(sprite: Phaser.GameObjects.Sprite): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		console.log("waiting for player");
		sprite.body.stop();
	}

	update(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (this.#isPlayerNear(sprite)) {
			console.log("waiting ended");
			stateMachine.popState();
			stateMachine.pushState(this.#nextState);
		}
	}

	#isPlayerNear(sprite: Phaser.GameObjects.Sprite): boolean {
		const playerPosition: Phaser.Math.Vector2 =
			sprite.scene.data.get("playerPosition");
		const monsterPosition: Phaser.Math.Vector2 =
			sprite.data.get("monsterPosition");
		const distance = monsterPosition.distance(playerPosition);
		if (distance > this.#distanceToActivate) {
			return false;
		}
		return true;
	}
}

export class Roar<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		console.log("roar");
		sprite.body.stop();
		sprite.anims.play(
			{
				key: "roar",
			},
			true
		);
		MainEvents.emit("freezePlayer", true);
		sprite.scene.cameras.main.shake(2000, 0.009);
		sprite.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				console.log("roar complete", anim);
				MainEvents.emit("freezePlayer", false);
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			}
		);
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
	}
}

export class SpawnEnemies<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	#maxSpawnedEnemies: number = 16;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>,
		enemyManager: EnemyManager
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		console.log("spawn");
		sprite.body.stop();
		sprite.anims.play(
			{
				key: "spawn",
			},
			true
		);

		this.#addEnemy(sprite, enemyManager);
		this.#addEnemy(sprite, enemyManager);
		this.#addEnemy(sprite, enemyManager);
		this.#addEnemy(sprite, enemyManager);

		sprite.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				console.log("spawn complete", anim);
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			}
		);
	}

	#addEnemy(sprite: Phaser.GameObjects.Sprite, enemyManager: EnemyManager) {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		const spawnedEnemyCount = sprite.data.get("spawnedEnemyCount") ?? 0;
		if (spawnedEnemyCount >= this.#maxSpawnedEnemies) {
			console.log("too many spawned enemies");
			return;
		}

		sprite.data.set("spawnedEnemyCount", spawnedEnemyCount + 1);

		const monster = new MonsterA(
			sprite.scene,
			sprite.body.x + 5,
			sprite.body.y + sprite.body.height
		);
		monster.once(Phaser.GameObjects.Events.DESTROY, () => {
			sprite.data.set("spawnedEnemyCount", spawnedEnemyCount - 1);
		});
		enemyManager.enemies.add(monster);
		sprite.once("dying", () => {
			monster.emit("kill");
		});
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
	}
}

export class PostSpawn<AllStates extends string>
	implements Behavior<AllStates, Phaser.GameObjects.Sprite>
{
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(
		sprite: Phaser.GameObjects.Sprite,
		stateMachine: BehaviorMachineInterface<AllStates>
	): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		console.log("post-spawn");
		sprite.body.stop();
		sprite.anims.play(
			{
				key: "idle",
			},
			true
		);
		sprite.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				console.log("post-spawn complete", anim);
				stateMachine.popState();
				stateMachine.pushState(this.#nextState);
			}
		);
	}

	update(sprite: Phaser.GameObjects.Sprite): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
	}
}
