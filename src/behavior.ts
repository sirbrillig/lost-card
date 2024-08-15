import { EnemyManager } from "./EnemyManager";

export type Subscriber = (event: "init" | "update") => void;
export type Unsubscribe = () => void;

export interface BehaviorMachineInterface<Key extends string> {
	getCurrentState(): Key;
	pushState(state: Key): void;
	popState(): void;
	update(): void;
	subscribe(callback: Subscriber): Unsubscribe;
}

export interface Behavior<
	Key extends string,
	Sprite extends Phaser.GameObjects.Sprite,
> {
	name: Key;
	init(
		sprite: Sprite,
		stateMachine: BehaviorMachineInterface<Key>,
		enemyManager: EnemyManager
	): void;
	update(
		sprite: Sprite,
		stateMachine: BehaviorMachineInterface<Key>,
		enemyManager: EnemyManager
	): void;
}

export class StateMachine<AllStates extends string>
	implements BehaviorMachineInterface<AllStates>
{
	#currentPlayingState: AllStates;
	#stateStack: Array<AllStates> = [];
	#subscribers: Array<Subscriber> = [];

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

	update() {
		// Get the current state.
		const state = this.getCurrentState();

		// If the state has changed since the last update, emit an init event.
		if (state !== this.#currentPlayingState) {
			this.#currentPlayingState = state;
			this.#emit("init");
			return;
		}

		// If the state has not changed since the last update, emit an update event.
		this.#emit("update");
	}

	#emit(event: "init" | "update"): void {
		this.#subscribers.forEach((callback) => callback(event));
	}

	subscribe(callback: Subscriber) {
		this.#subscribers.push(callback);
		return () => {
			this.#subscribers = this.#subscribers.filter((s) => s != callback);
		};
	}
}
