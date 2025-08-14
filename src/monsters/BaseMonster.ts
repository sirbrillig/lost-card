import {
	isDynamicSprite,
	Events,
	DataKeys,
	isPointInRoom,
	knockBack,
} from "../lib/shared";
import { HealthBar } from "../lib/HealthBar";
import { EnemyManager } from "../lib/EnemyManager";
import { MainEvents } from "../lib/MainEvents";
import { config } from "../lib/config";
import { getPlayerOrThrow, getActiveRoom } from "../lib/components";
import type { Behavior } from "../lib/Behavior";

export class BaseMonster extends Phaser.Physics.Arcade.Sprite {
	nextState: string;
	#currentState: string | undefined;
	#currentActiveBehavior: Behavior | undefined;
	#enemyManager: EnemyManager;
	#isBeingHit: boolean = false;
	#freeTimeAfterHit: number = 600;
	#healthBar: HealthBar | undefined;
	#maxHitPoints: number;
	#activationStatus: "not-started" | "waiting" | "ready" = "not-started";
	isDying = false;
	isStunned = false;

	mapSpawnPointId: number;
	hitPoints: number = 1;
	primaryColor: number = 0xc7a486;
	isBoss: boolean = false;
	isMiniBoss: boolean = false;
	doNotRespawn: boolean = false;
	timeBeforeActivate: number = 0;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number,
		texture: string,
		initialFrame: number | string,
		options?: {
			shouldCenterHitbox?: boolean;
		}
	) {
		super(
			scene,
			// Adjust position to account for the hitbox offset below.
			x + config.monsterHitBoxOffsetY,
			y - config.monsterHitBoxOffsetY,
			texture,
			initialFrame
		);

		this.#enemyManager = enemyManager;
		const initialState = this.getInitialState();
		this.nextState = initialState;

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

		this.setDepth(config.playerDepth);
		this.setCollideWorldBounds(true);
		this.setPushable(false);
		this.setDataEnabled();
		this.data?.set(DataKeys.MonsterPosition, new Phaser.Math.Vector2(x, y));
		this.data?.set(DataKeys.Hittable, true);
		this.data?.set(DataKeys.Pushable, true);
		this.data?.set(DataKeys.Freezable, true);
		this.on(Events.MonsterHit, (damage: number) => this.hit(damage));
		this.on(Events.MonsterStun, this.setStunned);
		this.on(Events.MonsterKillRequest, this.kill);
		this.on(Events.MonsterSilentRemoveRequest, this.silentKill);

		MainEvents.on(Events.LeavingRoom, () => {
			this.active = false;
			this.#currentActiveBehavior?.cleanUp?.(this, this.#enemyManager);
			this.#currentActiveBehavior = undefined;
		});
		MainEvents.on(Events.EnteredRoom, () => {
			if (this.isInActiveRoom()) {
				this.active = true;
			}
		});

		this.initSprites();
		this.initHitbox(options ?? {});
	}

	silentKill() {
		this.#currentActiveBehavior?.cleanUp?.(this, this.#enemyManager);
		this.#currentActiveBehavior = undefined;
		this.body?.stop();
		this.anims?.stop();
		this.#currentState = undefined;
		this.setStunned(true);
		this.emit(Events.MonsterDying);
		this.#healthBar?.destroy();
		this.#healthBar = undefined;
		this.destroy();
	}

	isInActiveRoom(): boolean {
		const activeRoom = getActiveRoom();
		if (!activeRoom || !this.body) {
			return false;
		}
		return isPointInRoom(this.body.center.x, this.body.center.y, activeRoom);
	}

	initHitbox({ shouldCenterHitbox }: { shouldCenterHitbox?: boolean }): void {
		// Set the monster's hitbox to be smaller than its sprite.
		this.setSize(
			this.width * config.monsterHitBoxSizePercentage,
			this.height * config.monsterHitBoxSizePercentage
		);
		if (!this.body) {
			return;
		}
		// Move the monster's hitbox down towards its base to simulate the 3d angle.
		if (!shouldCenterHitbox) {
			this.setOffset(
				this.body.offset.x,
				this.body.offset.y + config.monsterHitBoxOffsetY
			);
		}
	}

	getInitialState(): string {
		throw new Error("getInitialState must be overridden");
	}

	initSprites() {
		throw new Error("initSprites must be overridden");
	}

	constructNewBehaviorFor(_: string): Behavior | undefined {
		throw new Error("constructNewBehaviorFor must be overridden");
	}

	doesCollideWithTile(
		_: Phaser.Tilemaps.Tile | Phaser.Types.Physics.Arcade.GameObjectWithBody
	): boolean {
		return true;
	}

	#changeCurrentPlayingState(newState: string): void {
		this.#currentState = newState;
	}

	getCurrentState(): string | undefined {
		return this.#currentState;
	}

	goToNextState(): void {
		this.#currentActiveBehavior?.cleanUp?.(this, this.#enemyManager);
		this.#changeCurrentPlayingState(this.nextState);
	}

	initNewState(state: Behavior | undefined) {
		this.#currentActiveBehavior = state;
		if (!this.#currentActiveBehavior) {
			throw new Error("No state active");
		}
		this.#currentActiveBehavior.init(
			this,
			this.goToNextState.bind(this),
			this.#enemyManager
		);
	}

	update() {
		if (!this.#maxHitPoints) {
			this.#maxHitPoints = this.hitPoints;
		}
		this.#initHealthBar();

		this.#updateHealthBar();
		if (!this.body || !isDynamicSprite(this)) {
			throw new Error("Could not update monster");
		}
		if (!this.active) {
			this.body.stop();
			this.anims.pause();
			return;
		}
		if (this.#activationStatus === "not-started") {
			this.#activationStatus = "waiting";
			this.scene.time.addEvent({
				delay: this.timeBeforeActivate,
				callback: () => {
					this.#activationStatus = "ready";
				},
			});
		}
		if (this.#activationStatus !== "ready") {
			return;
		}

		if (this.isStunned) {
			return;
		}
		if (this.hitPoints <= 0) {
			return;
		}

		const state = this.#currentState;
		if (!state && this.nextState) {
			this.goToNextState();
		}

		// Take init actions
		if (state && state !== this.#currentActiveBehavior?.name) {
			this.initNewState(this.constructNewBehaviorFor(state));
			return;
		}

		// Take update actions
		this.#currentActiveBehavior?.update?.(
			this,
			this.goToNextState.bind(this),
			this.#enemyManager
		);

		this.updateAfterBehavior();
	}

	updateAfterBehavior(): void {}

	#initHealthBar(): void {
		if (this.#activationStatus !== "not-started") {
			return;
		}
		if (!this.isMiniBoss && !this.isBoss) {
			return;
		}
		const position = this.#getHealthBarPosition();
		this.#healthBar = new HealthBar(
			this.scene,
			position.x,
			position.y,
			this.width + 14,
			8,
			0 // We can't use hitPoints because it doesn't exist yet; we are still in the constructor.
		);
		MainEvents.on(Events.MakeRoomDark, () => {
			this.#healthBar?.setVisible(false);
		});
		MainEvents.on(Events.MakeRoomLight, () => {
			this.#healthBar?.setVisible(true);
		});
	}

	#getHealthBarPosition(): { x: number; y: number } {
		return { x: this.x - this.width / 2, y: this.y - this.height / 2 - 15 };
	}

	#updateHealthBar(): void {
		if (!this.#healthBar) {
			return;
		}
		const position = this.#getHealthBarPosition();
		this.#healthBar?.setPosition(position.x, position.y);
		this.#healthBar?.setMaxHealth(this.#maxHitPoints);
		this.#healthBar?.setHealth(this.hitPoints);
	}

	updateAfterHit() {}

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

		if (this.isBoss && damage > config.maxBossDamageTakenPerHit) {
			damage = config.maxBossDamageTakenPerHit;
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
		this.updateAfterHit();
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
		effect.setDepth(config.effectDepth);
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
		if (this.data?.get(DataKeys.Pushable) === true) {
			this.setStunned(true);
			const player = getPlayerOrThrow();
			knockBack(
				this.scene,
				this.body,
				config.enemyKnockbackTime,
				config.enemyKnockBackSpeed,
				player.data.get(DataKeys.PlayerDirection),
				() => {
					this.setStunned(false);
				}
			);
		}
	}

	showMiniBossExplosion() {
		if (!this.body) {
			throw new Error("Could not update monster");
		}
		const bossX = this.body.center.x;
		const bossY = this.body.center.y;
		const explosionPoints = [
			{ x: bossX - this.width / 2, y: bossY - this.height / 2 },
			{ x: bossX + this.width / 2, y: bossY - this.height / 2 },
			{ x: bossX, y: bossY - this.height / 2 },
			{ x: bossX - this.width / 2, y: bossY },
			{ x: bossX + this.width / 2, y: bossY },
			{ x: bossX, y: bossY + this.height / 2 },
			{ x: bossX - this.width / 4, y: bossY - this.height / 3 },
			{ x: bossX + this.width / 4, y: bossY - this.height / 3 },
			{ x: bossX, y: bossY },
		];
		const delay = 300;
		explosionPoints.forEach((point, i) => {
			this.scene.time.delayedCall(i * delay, () => {
				this.#makeExplosion(point);
			});
		});
		this.scene.time.delayedCall(explosionPoints.length * delay, () => {
			if (this.shouldRemovePostKill()) {
				this.removeDeadMonster();
			}
		});
	}

	showBossExplosion() {
		this.scene.cameras.main.flash();
		if (!this.body?.center?.x) {
			return;
		}

		const star = this.scene.add
			.star(this.body.center.x, this.body.center.y - 5, 20, 4, 90, 0xffffff)
			.setDepth(4);
		star.setAlpha(0);
		this.scene.tweens.add({
			targets: star,
			alpha: 0.8,
			duration: 850,
		});
		this.scene.tweens.add({
			targets: star,
			rotation: 1,
			duration: 2500,
		});
		this.scene.time.addEvent({
			delay: 2000,
			callback: () => {
				this.scene.tweens.add({
					targets: star,
					alpha: 0,
					duration: 900,
					onComplete: () => {
						star?.destroy();
					},
				});
			},
		});
		this.scene.time.addEvent({
			delay: 1900,
			callback: () => {
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
				lifespan: 1000,
				speed: { min: 40, max: 80 },
				scale: { start: 0.7, end: 0 },
				alpha: 0.9,
				tint: this.primaryColor,
				duration: 2000,
			}
		);

		let c1 = Phaser.Display.Color.HexStringToColor("#ffffff"); // From no tint
		let c2 = Phaser.Display.Color.HexStringToColor("#ff0000"); // To RED
		this.setTint(0xffffff);
		this.scene.tweens.addCounter({
			from: 0,
			to: 100,
			duration: 1200,
			onUpdate: (twn) => {
				const value = twn.getValue();
				let col = Phaser.Display.Color.Interpolate.ColorWithColor(
					c1,
					c2,
					100,
					value
				);
				let colourInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
				this.setTint(colourInt);
			},
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
		effect.setDepth(config.effectDepth);
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
				frame: [0, 1],
				lifespan: 800,
				speed: { min: 150, max: 400 },
				scale: { start: 0.9, end: 0 },
				tint: this.primaryColor,
				emitting: false,
			}
		);
		emitter.explode(50);

		const circleGraphics = this.scene.add.graphics();
		const circleThickness = 4;
		const circle = new Phaser.Geom.Circle(
			this.body.center.x,
			this.body.center.y,
			10
		);
		circleGraphics.postFX.addGlow(this.primaryColor);
		circleGraphics.lineStyle(circleThickness, this.primaryColor);
		circleGraphics.strokeCircleShape(circle);
		circleGraphics.setDepth(config.effectDepth);
		this.scene.tweens.addCounter({
			from: 10,
			to: 300,
			duration: 1000,
			onUpdate: (twn) => {
				circleGraphics.clear();
				circleGraphics.lineStyle(circleThickness, this.primaryColor);
				circle.radius = twn.getValue();
				circleGraphics.strokeCircleShape(circle);
			},
		});

		this.playDestroySound();
		emitter.once(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
			emitter.destroy();
			circleGraphics.destroy();
			this.emit(Events.MonsterDefeated);
			this.destroy();
		});
	}

	#makeExplosion(point: { x: number; y: number }): Promise<void> {
		return new Promise((resolve) => {
			const effect = this.scene.add.sprite(point.x, point.y, "explode", 0);
			effect.setDepth(config.effectDepth);
			effect.setTint(this.primaryColor);
			effect.anims.play("explode");
			this.playDestroySound();
			effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
				effect.destroy();
				resolve();
			});
		});
	}

	showRegularExplosion() {
		this.setVisible(false);
		if (!this.body?.center?.x) {
			return;
		}
		this.#makeExplosion(this.body.center).then(() => {
			if (this.shouldRemovePostKill()) {
				this.removeDeadMonster();
			}
		});
	}

	shouldRemovePostKill(): boolean {
		return true;
	}

	removeDeadMonster(): void {
		this.emit(Events.MonsterDefeated);
		this.destroy();
	}

	setStunned(setting: boolean) {
		this.isStunned = setting;
		this.data?.set(DataKeys.Stunned, setting);
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

		this.#currentActiveBehavior?.cleanUp?.(this, this.#enemyManager);
		this.#currentActiveBehavior = undefined;
		this.body.stop();
		this.anims.stop();
		this.#currentState = undefined;
		this.setStunned(true);
		this.emit(Events.MonsterDying);
		this.#healthBar?.destroy();
		this.#healthBar = undefined;

		MainEvents.emit(Events.MonsterDying, this);
		if (this.isBoss) {
			this.showBossExplosion();
		} else if (this.isMiniBoss) {
			this.showMiniBossExplosion();
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
