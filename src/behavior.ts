export interface BehaviorMachineInterface<Key extends string> {
	getCurrentState(): Key;
	pushState(state: Key): void;
	popState(): void;
}

export interface Behavior<
	Key extends string,
	Sprite extends Phaser.GameObjects.Sprite,
> {
	name: Key;
	init(sprite: Sprite): void;
	update(sprite: Sprite): void;
}

export class StateMachine<AllStates extends string>
	implements BehaviorMachineInterface<AllStates>
{
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
