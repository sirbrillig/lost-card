import {
	isDynamicSprite,
	Events,
	DataKeys,
	isPointInRoom,
	knockBack,
} from "./shared";
import { BehaviorMachineInterface, Behavior, StateMachine } from "./behavior";
import { EnemyManager } from "./EnemyManager";
import { MainEvents } from "./MainEvents";
import { config } from "./config";

export class BaseMonster<AllStates extends string> extends Phaser.Physics.Arcade
	.Sprite {
	stateMachine: BehaviorMachineInterface<AllStates>;
	#currentPlayingState: Behavior<AllStates, BaseMonster<AllStates>> | undefined;
	#enemyManager: EnemyManager;
	#isBeingHit: boolean = false;
	#freeTimeAfterHit: number = 600;
	isDying = false;
	isStunned = false;

	hitPoints: number = 1;
	primaryColor: number = 0xc7a486;
	isBoss: boolean = false;

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
		if (this.isStunned) {
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
		this.showParticlesForHurtMonster();
		this.#isBeingHit = true;
		this.scene.time.addEvent({
			delay: this.#freeTimeAfterHit,
			callback: () => {
				this.#isBeingHit = false;
			},
		});
		this.hitPoints -= damage;

		if (this.hitPoints <= 0) {
			this.kill();
		}

		this.knockBackForHurtMonster();
	}

	playEffectForHurtMonster() {
		this.setTintFill();
		this.scene.time.addEvent({
			delay: 160,
			callback: () => {
				this.clearTint();
			},
		});

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
			effect?.destroy();
		});
	}

	showParticlesForHurtMonster() {
		if (!this.body?.center?.x) {
			return;
		}
		const emitter = this.scene.add.particles(
			this.body.center.x,
			this.body.center.y - 5,
			"monster_explode1",
			{
				frame: [1, 2, 3],
				lifespan: 800,
				speed: { min: 40, max: 80 },
				scale: { start: 0.7, end: 0 },
				alpha: 0.9,
				tint: this.primaryColor,
				emitting: false,
			}
		);
		emitter.explode(10);
		emitter.once(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
			emitter?.destroy();
		});
	}

	knockBackForHurtMonster() {
		if (this.hitPoints <= 0) {
			return;
		}
		if (!this.body || !isDynamicSprite(this)) {
			throw new Error("Could not update monster");
		}
		if (this.data.get(DataKeys.Pushable) === true) {
			this.setStunned(true);
			knockBack(
				this.scene,
				this.body,
				config.enemyKnockbackTime,
				config.enemyKnockBackSpeed,
				this.#enemyManager.player.data.get(DataKeys.PlayerDirection),
				() => {
					this.setStunned(false);
				}
			);
		}
	}

	showBossExplosion() {
		this.scene.cameras.main.flash();
		if (!this.body?.center?.x) {
			return;
		}

		const star = this.scene.add
			.star(this.body.center.x, this.body.center.y - 5, 20, 4, 70, 0xffffff)
			.setDepth(4);
		star.setAlpha(0);
		this.scene.tweens.add({
			targets: star,
			alpha: 0.7,
			duration: 800,
		});
		this.scene.tweens.add({
			targets: star,
			rotation: 2,
			duration: 1500,
		});
		this.scene.time.addEvent({
			delay: 1500,
			callback: () => {
				this.scene.tweens.add({
					targets: star,
					alpha: 0,
					duration: 300,
				});
			},
		});
		this.scene.time.addEvent({
			delay: 1800,
			callback: () => {
				star.destroy();
				this.showBossExplosion2();
			},
		});
		this.scene.sound.play("dark-void");
	}

	showBossExplosion2() {
		if (!this.body?.center?.x) {
			return;
		}
		const emitter = this.scene.add.particles(
			this.body.center.x,
			this.body.center.y - 5,
			"monster_explode1",
			{
				frame: [1, 2, 3, 4, 5, 6, 7, 8],
				lifespan: 800,
				speed: { min: 40, max: 80 },
				scale: { start: 0.7, end: 0 },
				alpha: 0.9,
				tint: this.primaryColor,
				duration: 2000,
			}
		);
		// This flashes red
		this.scene.tweens.add({
			targets: this,
			tint: 0xf0f0f0,
			duration: 3000,
		});
		emitter.once(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
			emitter?.destroy();
			this.showBossExplosion3();
		});
	}

	showBossExplosion3() {
		this.setVisible(false);
		if (!this.body?.center?.x) {
			return;
		}
		const effect = this.scene.add.sprite(
			this.body.center.x + 1,
			this.body.center.y - 1,
			"explode",
			0
		);
		effect.setDepth(5);
		effect.setScale(3);
		effect.setTintFill();
		effect.anims.play("explode");
		this.showBossExplosion4();
		effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect.destroy();
		});
	}

	showBossExplosion4() {
		this.scene.cameras.main.flash();
		if (!this.body?.center?.x) {
			return;
		}
		const emitter = this.scene.add.particles(
			this.body.center.x,
			this.body.center.y - 5,
			"player-hit",
			{
				frame: 0,
				lifespan: 800,
				speed: 350,
				emitting: false,
			}
		);
		emitter.explode(40);
		this.playDestroySound();
		emitter.once(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
			emitter.destroy();
			this.emit(Events.MonsterDefeated);
			this.destroy();
		});
	}

	showRegularExplosion() {
		this.setVisible(false);
		if (!this.body?.center?.x) {
			return;
		}
		const effect = this.scene.add.sprite(
			this.body.center.x + 1,
			this.body.center.y - 1,
			"explode",
			0
		);
		effect.setDepth(5);
		effect.setTint(this.primaryColor);
		effect.anims.play("explode");
		this.playDestroySound();
		effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect.destroy();
			this.emit(Events.MonsterDefeated);
			this.destroy();
		});
	}

	setStunned(setting: boolean) {
		this.isStunned = setting;
		this.data.set(DataKeys.Stunned, setting);
		this.setVelocity(0);
	}

	kill() {
		if (!this.body || !isDynamicSprite(this)) {
			throw new Error("Could not update monster");
		}
		if (this.isDying) {
			return;
		}
		this.isDying = true;

		this.body.stop();
		this.anims.stop();
		this.stateMachine.empty();
		this.setStunned(true);
		this.emit(Events.MonsterDying);

		MainEvents.emit(Events.MonsterDying, this);
		if (this.isBoss) {
			this.showBossExplosion();
		} else {
			this.showRegularExplosion();
		}
	}

	baseIsHittable(): boolean {
		if (this.#isBeingHit) {
			return false;
		}
		if (this.isDying) {
			return false;
		}
		return this.isHittable();
	}

	isHittable(): boolean {
		return true;
	}
}
