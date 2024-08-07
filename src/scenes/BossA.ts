import {
	SpriteUp,
	SpriteRight,
	SpriteDown,
	SpriteLeft,
	getDirectionOfSpriteMovement,
	isDynamicSprite,
	HittableSprite,
	BehaviorState,
	BehaviorMachineInterface,
} from "../shared";

class StateMachine implements BehaviorMachineInterface {
	#currentState: BehaviorState;

	constructor(initialState: BehaviorState) {
		this.#currentState = initialState;
	}

	setState(state: BehaviorState): void {
		console.log("moving to", state);
		this.#currentState = state;
	}

	getCurrentState(): BehaviorState {
		return this.#currentState;
	}

	moveToNextState(): void {
		this.setState(this.getCurrentState().getNextState());
	}
}

const initialState: BehaviorState = {
	name: "initial",
	getNextState() {
		return roar1State;
	},
};
const roar1State: BehaviorState = {
	name: "roar1",
	getNextState: () => roar2State,
};
const roar2State: BehaviorState = {
	name: "roar2",
	getNextState: () => spawn1State,
};
const spawn1State: BehaviorState = {
	name: "spawn1",
	getNextState: () => spawn2State,
};
const spawn2State: BehaviorState = {
	name: "spawn2",
	getNextState: () => idle1State,
};
const idle1State: BehaviorState = {
	name: "idle1",
	getNextState: () => idle2State,
};
const idle2State: BehaviorState = {
	name: "idle2",
	getNextState: () => idle3State,
};
const idle3State: BehaviorState = {
	name: "idle3",
	getNextState: () => rocks1State,
};
const rocks1State: BehaviorState = {
	name: "rocks1",
	getNextState: () => rocks2State,
};
const rocks2State: BehaviorState = {
	name: "rocks2",
	getNextState: () => rocks3State,
};
const rocks3State: BehaviorState = {
	name: "rocks3",
	getNextState: () => spawn1State,
};
const makeHitState = (enemy: HittableSprite) => ({
	name: "hit",
	getNextState: () => enemy.getPreviousState().getNextState(),
});

export class BossA
	extends Phaser.Physics.Arcade.Sprite
	implements HittableSprite
{
	enemySpeed: number = 40;
	stateMachine: BehaviorMachineInterface;
	#currentPlayingState: BehaviorState | undefined;
	#previousState: BehaviorState;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, "logman");

		scene.add.existing(this);
		scene.physics.add.existing(this);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setDepth(1);
		this.setSize(this.width * 0.55, this.height * 0.65);
		this.setOffset(this.body.offset.x, this.body.offset.y + 5);
		this.setCollideWorldBounds(true);
		this.setPushable(false);
		this.setScale(2);

		this.stateMachine = new StateMachine(initialState);
		this.#previousState = initialState;
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
		// Only take an action when the state changes
		if (state.name === this.#currentPlayingState?.name) {
			// TODO: this hack should not be necessary for this actual behavior
			if (state.name.startsWith("rocks")) {
				this.#walk();
			}
			return;
		}
		this.#currentPlayingState = state;
		switch (state.name) {
			case initialState.name:
				this.body.stop();
				// TODO: do nothing until character is nearby
				this.stateMachine.moveToNextState();
				return;
			case roar1State.name:
			case roar2State.name:
				this.#announce();
				return;
			case spawn1State.name:
			case spawn2State.name:
				this.#spawnEnemies();
				return;
			case idle1State.name:
			case idle2State.name:
			case idle3State.name:
				this.#wait();
				return;
			case rocks1State.name:
			case rocks2State.name:
			case rocks3State.name:
				// TODO: implement rocks
				this.#walk();
				return;
			case "hit":
				this.#ouch();
				return;
		}
	}

	#wait() {
		if (!this.body || !isDynamicSprite(this.body)) {
			throw new Error("Could not update monster");
		}

		console.log("waiting");
		this.body.stop();
		// TODO: make actual animation for this
		this.anims.play(
			{
				key: "logman-left-walk",
				repeat: 8,
			},
			true
		);
		this.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				if (anim.key !== "logman-left-walk") {
					return;
				}
				console.log("waiting complete", anim);
				this.stateMachine.moveToNextState();
			}
		);
	}

	#announce() {
		if (!this.body || !isDynamicSprite(this.body)) {
			throw new Error("Could not update monster");
		}

		console.log("announce");
		this.body.stop();
		// TODO: make actual animation for this
		this.anims.play(
			{
				key: "logman-down-walk",
				repeat: 3,
			},
			true
		);
		this.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				if (anim.key !== "logman-down-walk") {
					return;
				}
				console.log("announce complete", anim);
				this.stateMachine.moveToNextState();
			}
		);
	}

	#spawnEnemies() {
		if (!this.body || !isDynamicSprite(this.body)) {
			throw new Error("Could not update monster");
		}

		console.log("spawn");
		this.body.stop();
		// TODO: make actual animation for this
		this.anims.play(
			{
				key: "logman-right-walk",
				repeat: 5,
			},
			true
		);
		this.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				if (anim.key !== "logman-right-walk") {
					return;
				}
				console.log("spawn complete", anim);
				this.stateMachine.moveToNextState();
			}
		);
	}

	#ouch() {
		if (!this.body || !isDynamicSprite(this.body)) {
			throw new Error("Could not update monster");
		}

		console.log("ouch");

		// TODO: make actual animation for this
		this.anims.play(
			{
				key: "logman-up-walk",
				repeat: 8,
			},
			true
		);
		this.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				if (anim.key !== "logman-up-walk") {
					return;
				}
				console.log("ouch complete", anim);
				this.stateMachine.moveToNextState();
			}
		);
	}

	#walk() {
		if (!this.body || !isDynamicSprite(this.body)) {
			throw new Error("Could not update monster");
		}

		// If we are not moving, move in a random direction. If we are moving, keep
		// moving in that direction.
		const previousDirection = getDirectionOfSpriteMovement(this.body);
		if (previousDirection) {
			return;
		}

		const direction = Phaser.Math.Between(0, 3);
		let key: string = "logman-up-walk";
		switch (direction) {
			case SpriteUp:
				key = "logman-up-walk";
				this.body.setVelocityY(-this.enemySpeed);
				break;
			case SpriteRight:
				key = "logman-right-walk";
				this.body.setVelocityX(this.enemySpeed);
				break;
			case SpriteDown:
				key = "logman-down-walk";
				this.body.setVelocityY(this.enemySpeed);
				break;
			case SpriteLeft:
				key = "logman-left-walk";
				this.body.setVelocityX(-this.enemySpeed);
				break;
		}

		this.anims.play(
			{
				key,
				repeat: 4,
			},
			true
		);
		this.once(
			Phaser.Animations.Events.ANIMATION_COMPLETE,
			(anim: Phaser.Animations.Animation) => {
				console.log("move complete", anim);
				this.stateMachine.moveToNextState();
			}
		);
	}

	hit() {
		console.log("hit boss");
		this.#previousState = this.stateMachine.getCurrentState();
		this.stateMachine.setState(makeHitState(this));
	}

	getPreviousState() {
		return this.#previousState;
	}

	isHittable(): boolean {
		return this.stateMachine.getCurrentState().name !== "hit";
	}
}
