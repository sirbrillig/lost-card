import { isDynamicSprite, Events, DataKeys, isPointInRoom } from "./shared";
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
	#isDying = false;

	hitPoints: number = 1;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number,
		texture: string,
		initialFrame: number | string
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
		this.on(Events.MonsterHit, (damage: number) => this.hit(damage));
		this.on(Events.MonsterStun, this.setStunned);
		this.on(Events.MonsterKillRequest, this.kill);

		MainEvents.on(Events.LeavingRoom, () => {
			this.active = false;
		});
		MainEvents.on(Events.EnteredRoom, () => {
			if (this.isInActiveRoom()) {
				this.active = true;
			}
		});

		this.initSprites();
	}

	isInActiveRoom(): boolean {
		if (!this.#enemyManager?.activeRoom || !this.body) {
			return false;
		}
		return isPointInRoom(
			this.body.center.x,
			this.body.center.y,
			this.#enemyManager.activeRoom
		);
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
			this.anims.pause();
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
			this.updateAfterBehaviorInit(this.#currentPlayingState.name);
			this.updateAfterBehavior(this.#currentPlayingState.name);
			return;
		}

		// Take update actions
		this.#currentPlayingState?.update(
			this,
			this.stateMachine,
			this.#enemyManager
		);

		this.updateAfterBehavior(this.#currentPlayingState?.name);
	}

	updateAfterBehavior(_: string | undefined) {}

	updateAfterBehaviorInit(_: string | undefined) {}

	playHitSound() {
		this.scene.sound.play("hit", { volume: 0.7 });
	}

	playDestroySound() {
		this.scene.sound.play("destroy");
	}

	hit(damage: number) {
		if (!this.baseIsHittable()) {
			return;
		}

		this.playHitSound();
		this.playEffectForHurtMonster();
		this.#isBeingHit = true;
		this.setTint(0xff0000);
		this.scene.time.addEvent({
			delay: this.#freeTimeAfterHit,
			callback: () => {
				this.clearTint();
				this.#isBeingHit = false;
			},
		});
		this.hitPoints -= damage;

		if (this.hitPoints <= 0) {
			this.kill();
		}
	}

	playEffectForHurtMonster() {
		if (!this.body?.center?.x) {
			return;
		}
		const effect = this.scene.add.sprite(
			this.body.center.x,
			this.body.center.y - 5,
			"player-hit",
			2
		);
		effect.setDepth(5);
		effect.setAlpha(0.9);
		effect.anims.play("player-hit", true);
		effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect.destroy();
		});
		MainEvents.on(Events.PlayerPositionChanged, () => {
			if (effect?.active && this.body?.center?.x) {
				effect.setPosition(this.body.center.x, this.body.center.y - 5);
			}
		});
	}

	setStunned(setting: boolean) {
		this.data.set(DataKeys.Stunned, setting);
		this.setVelocity(0);
	}

	kill() {
		if (!this.body || !isDynamicSprite(this)) {
			throw new Error("Could not update monster");
		}
		if (this.#isDying) {
			return;
		}
		this.#isDying = true;

		this.body.stop();
		this.setVisible(false);
		this.stateMachine.empty();
		this.data.set(DataKeys.Stunned, true);
		this.emit(Events.MonsterDying);

		const effect = this.scene.add.sprite(
			this.body.center.x + 1,
			this.body.center.y - 1,
			"explode",
			0
		);
		effect.setDepth(5);
		effect.anims.play("explode");
		MainEvents.emit(Events.MonsterDying, this);
		this.playDestroySound();
		effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect.destroy();
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
