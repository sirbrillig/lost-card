import {
	isDynamicSprite,
	HittableSprite,
	BehaviorMachineInterface,
	Behavior,
} from "../shared";
import { MonsterA } from "./MonsterA";

type AllStates =
	| "initial"
	| "roar1"
	| "roar2"
	| "spawn1"
	| "spawn2"
	| "idle1"
	| "idle2"
	| "idle3"
	| "rocks1"
	| "rocks2"
	| "rocks3"
	| "postRocks";

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
	#nextState: AllStates;
	#isReady: boolean = false;
	name: AllStates;

	constructor(name: AllStates, nextState: AllStates) {
		this.name = name;
		this.#nextState = nextState;
	}

	init(sprite: BossA): void {
		if (!sprite.body || !isDynamicSprite(sprite.body)) {
			throw new Error("Could not update monster");
		}
		console.log("waiting for player");
		sprite.body.stop();
		setTimeout(() => {
			this.#isReady = true;
			sprite.scene.cameras.main.shake(1000, 0.0005);
		}, 2000);
	}

	update(sprite: BossA): void {
		if (this.#isReady) {
			console.log("waiting ended");
			// TODO: wait for the player to be nearby
			sprite.stateMachine.popState();
			sprite.stateMachine.pushState(this.#nextState);
		}
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
		if (!sprite.body || !isDynamicSprite(sprite.body)) {
			throw new Error("Could not update monster");
		}
		console.log("roar");
		sprite.body.stop();
		// TODO: make actual animation for this
		sprite.anims.play(
			{
				key: "logman-down-walk",
				repeat: 5,
			},
			true
		);
		sprite.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				console.log("roar complete", anim);
				sprite.stateMachine.popState();
				sprite.stateMachine.pushState(this.#nextState);
			}
		);
	}

	update(sprite: BossA): void {
		if (!sprite.body || !isDynamicSprite(sprite.body)) {
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
		if (!sprite.body || !isDynamicSprite(sprite.body)) {
			throw new Error("Could not update monster");
		}
		console.log("spawn");
		sprite.body.stop();
		// TODO: make actual animation for this
		sprite.anims.play(
			{
				key: "logman-right-walk",
				repeat: 5,
			},
			true
		);

		this.#addEnemy(sprite);

		sprite.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				if (anim.key !== "logman-right-walk") {
					return;
				}
				console.log("spawn complete", anim);
				sprite.stateMachine.popState();
				sprite.stateMachine.pushState(this.#nextState);
			}
		);
	}

	#addEnemy(sprite: BossA) {
		if (!sprite.body || !isDynamicSprite(sprite.body)) {
			throw new Error("Could not update monster");
		}
		const monster = new MonsterA(
			sprite.scene,
			sprite.body.x + 5,
			sprite.body.y,
			sprite.registerEnemy
		);
		sprite.registerEnemy(monster);
		sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
			monster.destroy();
		});
	}

	update(sprite: BossA): void {
		if (!sprite.body || !isDynamicSprite(sprite.body)) {
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
		if (!sprite.body || !isDynamicSprite(sprite.body)) {
			throw new Error("Could not update monster");
		}
		console.log("post-spawn");
		sprite.body.stop();
		// TODO: make actual animation for this
		sprite.anims.play(
			{
				key: "logman-left-walk",
				repeat: 5,
			},
			true
		);
		sprite.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				if (anim.key !== "logman-left-walk") {
					return;
				}
				console.log("post-spawn complete", anim);
				sprite.stateMachine.popState();
				sprite.stateMachine.pushState(this.#nextState);
			}
		);
	}

	update(sprite: BossA): void {
		if (!sprite.body || !isDynamicSprite(sprite.body)) {
			throw new Error("Could not update monster");
		}
	}
}

export class BossA
	extends Phaser.Physics.Arcade.Sprite
	implements HittableSprite
{
	#isBeingHit: boolean = false;
	#freeTimeAfterHit: number = 600;
	#hitPoints: number = 6;
	stateMachine: BehaviorMachineInterface<AllStates>;
	#currentPlayingState: Behavior<AllStates> | undefined;
	registerEnemy: (enemy: Phaser.Physics.Arcade.Sprite) => void;

	constructor(
		scene: Phaser.Scene,
		x: number,
		y: number,
		registerEnemy: (enemy: Phaser.Physics.Arcade.Sprite) => void
	) {
		super(scene, x, y, "logman");

		scene.add.existing(this);
		scene.physics.add.existing(this);
		this.registerEnemy = registerEnemy;
		registerEnemy(this);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setDepth(1);
		this.setSize(this.width * 0.55, this.height * 0.65);
		this.setOffset(this.body.offset.x, this.body.offset.y + 5);
		this.setCollideWorldBounds(true);
		this.setPushable(false);
		this.setScale(2);

		this.stateMachine = new StateMachine("initial");
	}

	update() {
		if (!this.body || !isDynamicSprite(this.body)) {
			throw new Error("Could not update monster");
		}
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
					this.#currentPlayingState = new Roar("roar1", "roar2");
					break;
				case "roar2":
					this.#currentPlayingState = new Roar("roar2", "spawn1");
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

		console.log("state has not changed from", state);
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
			this.stateMachine.getCurrentState() !== "initial" && !this.#isBeingHit
		);
	}
}
