import { isDynamicSprite, BehaviorMachineInterface } from "./shared";
import { MonsterA } from "./MonsterA";

interface Behavior<Key extends string> {
	name: Key;
	init(sprite: BossA): void;
	update(sprite: BossA): void;
}

type AllStates = "initial" | "roar1" | "spawn1" | "spawn2" | "idle1" | "idle2";

class StateMachine implements BehaviorMachineInterface<AllStates> {
	#stateStack: Array<AllStates> = [];

	constructor(initialState: AllStates) {
		this.pushState(initialState);
	}

	pushState(state: AllStates): void {
		console.log("pushing state", state);
		this.#stateStack.push(state);
	}

	popState(): void {
		this.#stateStack.pop();
	}

	getCurrentState(): AllStates {
		if (!this.#stateStack[this.#stateStack.length - 1]) {
			throw new Error("No states in state machine");
		}
		return this.#stateStack[this.#stateStack.length - 1];
	}
}

class WaitForActive implements Behavior<AllStates> {
	#distanceToActivate: number = 100;
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(sprite: BossA): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
		console.log("waiting for player");
		sprite.body.stop();
	}

	update(sprite: BossA): void {
		if (this.#isPlayerNear(sprite)) {
			console.log("waiting ended");
			sprite.stateMachine.popState();
			sprite.stateMachine.pushState(this.#nextState);
		}
	}

	#isPlayerNear(sprite: BossA): boolean {
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

class Roar implements Behavior<AllStates> {
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(sprite: BossA): void {
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
		sprite.scene.registry.set("freezePlayer", true);
		sprite.scene.cameras.main.shake(2000, 0.009);
		sprite.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				console.log("roar complete", anim);
				sprite.scene.registry.set("freezePlayer", false);
				sprite.stateMachine.popState();
				sprite.stateMachine.pushState(this.#nextState);
			}
		);
	}

	update(sprite: BossA): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
	}
}

class SpawnEnemies implements Behavior<AllStates> {
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(sprite: BossA): void {
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

		this.#addEnemy(sprite);
		this.#addEnemy(sprite);
		this.#addEnemy(sprite);
		this.#addEnemy(sprite);

		sprite.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				console.log("spawn complete", anim);
				sprite.stateMachine.popState();
				sprite.stateMachine.pushState(this.#nextState);
			}
		);
	}

	#addEnemy(sprite: BossA) {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}

		if (sprite.spawnedEnemyCount >= sprite.maxSpawnedEnemies) {
			console.log("too many spawned enemies");
			return;
		}

		sprite.spawnedEnemyCount += 1;

		const monster = new MonsterA(
			sprite.scene,
			sprite.body.x + 5,
			sprite.body.y + sprite.body.height,
			sprite.registerEnemy
		);
		monster.once(Phaser.GameObjects.Events.DESTROY, () => {
			sprite.spawnedEnemyCount -= 1;
		});
		sprite.registerEnemy(monster);
		sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
			monster.destroy();
		});
	}

	update(sprite: BossA): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
	}
}

class PostSpawn implements Behavior<AllStates> {
	#nextState: AllStates;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(sprite: BossA): void {
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
				sprite.stateMachine.popState();
				sprite.stateMachine.pushState(this.#nextState);
			}
		);
	}

	update(sprite: BossA): void {
		if (!sprite.body || !isDynamicSprite(sprite)) {
			throw new Error("Could not update monster");
		}
	}
}

export class BossA extends Phaser.Physics.Arcade.Sprite {
	#isBeingHit: boolean = false;
	#freeTimeAfterHit: number = 600;
	#hitPoints: number = 6;
	spawnedEnemyCount: number = 0;
	maxSpawnedEnemies: number = 16;
	stateMachine: BehaviorMachineInterface<AllStates>;
	#currentPlayingState: Behavior<AllStates> | undefined;
	registerEnemy: (enemy: Phaser.Physics.Arcade.Sprite) => void;

	constructor(
		scene: Phaser.Scene,
		x: number,
		y: number,
		registerEnemy: (enemy: Phaser.Physics.Arcade.Sprite) => void
	) {
		super(scene, x, y, "bosses1", 84);

		scene.add.existing(this);
		scene.physics.add.existing(this);
		this.registerEnemy = registerEnemy;
		registerEnemy(this);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setDepth(1);
		this.setSize(this.width * 0.6, this.height * 0.65);
		this.setOffset(this.body.offset.x, this.body.offset.y + 10);
		this.setOrigin(0.5, 0.75);
		this.setCollideWorldBounds(true);
		this.setPushable(false);
		this.setScale(1);
		this.setDataEnabled();
		this.data.set("monsterPosition", new Phaser.Math.Vector2(x, y));
		this.data.set("hittable", true);
		this.on("hit", this.hit);

		this.stateMachine = new StateMachine("initial");

		this.initSprites();
	}

	initSprites() {
		this.anims.create({
			key: "roar",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 48,
				end: 50,
			}),
			frameRate: 10,
			repeat: 8,
		});
		this.anims.create({
			key: "spawn",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 72,
				end: 74,
			}),
			frameRate: 10,
			repeat: 8,
		});
		this.anims.create({
			key: "idle",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 60,
				end: 62,
			}),
			frameRate: 10,
			repeat: 8,
		});
	}

	update() {
		if (!this.body || !isDynamicSprite(this)) {
			throw new Error("Could not update monster");
		}
		this.data.set("hittable", this.isHittable());

		const body = this.body;
		if (!this.active) {
			body.stop();
			return;
		}

		const state = this.stateMachine.getCurrentState();

		// Take init actions
		if (state !== this.#currentPlayingState?.name) {
			console.log(
				"state has changed from",
				this.#currentPlayingState?.name,
				"to",
				state
			);
			switch (state) {
				case "initial":
					this.#currentPlayingState = new WaitForActive("initial", "roar1");
					break;
				case "roar1":
					this.#currentPlayingState = new Roar("roar1", "spawn1");
					break;
				case "spawn1":
					this.#currentPlayingState = new SpawnEnemies("spawn1", "spawn2");
					break;
				case "spawn2":
					this.#currentPlayingState = new SpawnEnemies("spawn2", "idle1");
					break;
				case "idle1":
					this.#currentPlayingState = new PostSpawn("idle1", "idle2");
					break;
				case "idle2":
					this.#currentPlayingState = new PostSpawn("idle2", "roar1");
					break;
			}
			if (!this.#currentPlayingState) {
				throw new Error("No state active");
			}
			this.#currentPlayingState.init(this);
			return;
		}

		// Take update actions
		this.#currentPlayingState?.update(this);
	}

	hit() {
		if (!this.isHittable()) {
			return;
		}
		console.log("hit boss");

		this.#isBeingHit = true;
		this.tint = 0xff0000;
		setTimeout(() => {
			this.clearTint();
			this.#isBeingHit = false;
		}, this.#freeTimeAfterHit);
		this.#hitPoints -= 1;

		if (this.#hitPoints === 0) {
			this.destroy();
		}
	}

	isHittable(): boolean {
		return (
			this.stateMachine.getCurrentState() !== "initial" &&
			!this.stateMachine.getCurrentState().includes("roar") &&
			!this.#isBeingHit
		);
	}
}
