import { isDynamicSprite, Events, DataKeys } from "./shared";
import { BehaviorMachineInterface, Behavior, StateMachine } from "./behavior";
import { EnemyManager } from "./EnemyManager";
import { MainEvents } from "./MainEvents";

export class BaseMonster<AllStates extends string> extends Phaser.Physics.Arcade
	.Sprite {
	stateMachine: BehaviorMachineInterface<AllStates>;
	#currentPlayingState: Behavior<AllStates, BaseMonster<AllStates>> | undefined;
	#enemyManager: EnemyManager;
	#isBeingHit: boolean = false;
	#freeTimeAfterHit: number = 600;

	hitPoints: number = 1;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number,
		texture: string,
		initialFrame: number
	) {
		super(scene, x, y, texture, initialFrame);

		this.#enemyManager = enemyManager;
		this.stateMachine = new StateMachine(this.getInitialState());

		scene.add.existing(this);
		scene.physics.add.existing(this);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.anims.create({
			key: "explode",
			frames: this.anims.generateFrameNumbers("monster_explode1"),
			frameRate: 20,
		});

		this.setDepth(1);
		this.setSize(this.width * 0.35, this.height * 0.35);
		this.setOffset(this.body.offset.x, this.body.offset.y + 9);
		this.setCollideWorldBounds(true);
		this.setPushable(false);
		this.setDataEnabled();
		this.data.set(DataKeys.MonsterPosition, new Phaser.Math.Vector2(x, y));
		this.data.set(DataKeys.Hittable, true);
		this.data.set(DataKeys.Pushable, true);
		this.data.set(DataKeys.Freezable, true);
		this.on(Events.MonsterHit, this.hit);
		this.on(Events.MonsterStun, this.setStunned);
		this.on(Events.MonsterKillRequest, this.kill);

		this.initSprites();
	}

	getInitialState(): AllStates {
		throw new Error("getInitialState must be overridden");
	}

	initSprites() {
		throw new Error("initSprites must be overridden");
	}

	constructNewBehaviorFor(
		_: string
	): Behavior<AllStates, BaseMonster<AllStates>> | undefined {
		throw new Error("constructNewBehaviorFor must be overridden");
	}

	doesCollideWithTile(
		_: Phaser.Tilemaps.Tile | Phaser.Types.Physics.Arcade.GameObjectWithBody
	): boolean {
		return true;
	}

	update() {
		if (!this.body || !isDynamicSprite(this)) {
			throw new Error("Could not update monster");
		}
		if (!this.active) {
			this.body.stop();
			return;
		}
		if (this.data.get(DataKeys.Stunned)) {
			return;
		}
		if (this.hitPoints <= 0) {
			return;
		}

		const state = this.stateMachine.getCurrentState();

		// Take init actions
		if (state && state !== this.#currentPlayingState?.name) {
			this.#currentPlayingState = this.constructNewBehaviorFor(state);
			if (!this.#currentPlayingState) {
				throw new Error("No state active");
			}
			this.#currentPlayingState.init(
				this,
				this.stateMachine,
				this.#enemyManager
			);
			return;
		}

		// Take update actions
		this.#currentPlayingState?.update(
			this,
			this.stateMachine,
			this.#enemyManager
		);
	}

	hit() {
		if (!this.baseIsHittable()) {
			return;
		}

		this.#isBeingHit = true;
		this.tint = 0xff0000;
		this.scene.time.addEvent({
			delay: this.#freeTimeAfterHit,
			callback: () => {
				this.clearTint();
				this.#isBeingHit = false;
			},
		});
		this.hitPoints -= 1;

		if (this.hitPoints <= 0) {
			this.kill();
		}
	}

	setStunned(setting: boolean) {
		this.data.set(DataKeys.Stunned, setting);
		this.setVelocity(0);
	}

	kill() {
		this.body?.stop();
		this.stateMachine.empty();
		this.data.set(DataKeys.Stunned, true);
		this.emit(Events.MonsterDying);
		this.setOrigin(0.5, 0.3);
		this.anims.play("explode", true);
		MainEvents.emit(Events.MonsterDefeated);
		this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.emit(Events.MonsterDefeated);
			this.destroy();
		});
	}

	baseIsHittable(): boolean {
		return !this.#isBeingHit && this.isHittable();
	}

	isHittable(): boolean {
		return true;
	}
}
