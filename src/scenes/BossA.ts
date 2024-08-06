import {
	SpriteUp,
	SpriteRight,
	SpriteDown,
	SpriteLeft,
	getDirectionOfSpriteMovement,
	isDynamicSprite,
	HittableSprite,
} from "../shared";

interface StateMachineState {
	name: string;
}

interface StateMachineAction {
	getNextState(): StateMachineState;
}

interface StateMachineInterface {
	getPreviousState(): StateMachineState;
	getCurrentState(): StateMachineState;
	takeAction(action: StateMachineAction): void;
}

class StateMachine implements StateMachineInterface {
	#previousState: StateMachineState;
	#currentState: StateMachineState;

	constructor(initialState: StateMachineState) {
		this.#currentState = initialState;
		this.#previousState = initialState;
	}

	getPreviousState(): StateMachineState {
		return this.#previousState;
	}

	getCurrentState(): StateMachineState {
		return this.#currentState;
	}

	takeAction(action: StateMachineAction): void {
		this.#previousState = this.#currentState;
		this.#currentState = action.getNextState();
	}
}

const idleState = { name: "idle" };
const announceState = { name: "announce" };
const walkState = { name: "walk" };
const hitState = { name: "hit" };

class AnnounceAction implements StateMachineAction {
	getNextState(): StateMachineState {
		return announceState;
	}
}

class BeginAction implements StateMachineAction {
	getNextState(): StateMachineState {
		return walkState;
	}
}

class GotHitAction implements StateMachineAction {
	getNextState(): StateMachineState {
		return hitState;
	}
}

export class BossA
	extends Phaser.Physics.Arcade.Sprite
	implements HittableSprite
{
	enemySpeed: number = 40;
	stateMachine: StateMachineInterface;
	#isPlayingState: boolean = false;

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

		this.stateMachine = new StateMachine(idleState);
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

		switch (state) {
			case idleState:
				this.body.stop();
				this.stateMachine.takeAction(new AnnounceAction());
				return;
			case hitState:
				this.#ouch();
				return;
			case announceState:
				this.#announce();
				return;
			case walkState:
				this.#walk();
				return;
		}
	}

	#announce() {
		if (!this.body || !isDynamicSprite(this.body)) {
			throw new Error("Could not update monster");
		}

		if (this.#isPlayingState) {
			return;
		}
		this.#isPlayingState = true;

		console.log("announce");
		this.body.stop();
		this.anims.play(
			{
				key: "logman-down-walk",
				repeat: 8,
			},
			true
		);
		this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.#isPlayingState = false;
			this.stateMachine.takeAction(new BeginAction());
		});
	}

	#ouch() {
		if (!this.body || !isDynamicSprite(this.body)) {
			throw new Error("Could not update monster");
		}
		if (this.#isPlayingState) {
			return;
		}
		this.#isPlayingState = true;

		console.log("ouch");
		this.body.stop();
		this.anims.play(
			{
				key: "logman-up-walk",
				repeat: 8,
			},
			true
		);
		this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.#isPlayingState = false;
			// TODO: this will re-start the state we were in before being hit; instead we should return to the point in the state.
			switch (this.stateMachine.getPreviousState()) {
				case announceState:
					this.stateMachine.takeAction(new AnnounceAction());
					return;
				case walkState:
					this.stateMachine.takeAction(new BeginAction());
					return;
			}
		});
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
		switch (direction) {
			case SpriteUp:
				this.anims.play("logman-up-walk", true);
				this.body.setVelocityY(-this.enemySpeed);
				break;
			case SpriteRight:
				this.anims.play("logman-right-walk", true);
				this.body.setVelocityX(this.enemySpeed);
				break;
			case SpriteDown:
				this.anims.play("logman-down-walk", true);
				this.body.setVelocityY(this.enemySpeed);
				break;
			case SpriteLeft:
				this.anims.play("logman-left-walk", true);
				this.body.setVelocityX(-this.enemySpeed);
				break;
		}
	}

	hit() {
		console.log("hit boss");
		this.stateMachine.takeAction(new GotHitAction());
	}

	isHittable(): boolean {
		return this.stateMachine.getCurrentState() !== hitState;
	}
}
