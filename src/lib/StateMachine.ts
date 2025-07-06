export interface BehaviorMachineInterface<Key extends string> {
	getCurrentState(): Key | undefined;
	setCurrentState(state: Key): void;
	empty(): void;
}

export class StateMachine<AllStates extends string>
	implements BehaviorMachineInterface<AllStates>
{
	#currentPlayingState: AllStates | undefined;

	constructor(initialState: AllStates) {
		this.#currentPlayingState = initialState;
	}

	setCurrentState(state: AllStates): void {
		this.#currentPlayingState = state;
	}

	empty() {
		this.#currentPlayingState = undefined;
	}

	getCurrentState(): AllStates | undefined {
		return this.#currentPlayingState;
	}
}
