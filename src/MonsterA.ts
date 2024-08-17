import { isDynamicSprite, Events } from "./shared";
import { BehaviorMachineInterface, Behavior, StateMachine } from "./behavior";
import { RandomlyWalk } from "./behaviors";
import { EnemyManager } from "./EnemyManager";

type AllStates = "randomwalk";

export class MonsterA extends Phaser.Physics.Arcade.Sprite {
	#stateMachine: BehaviorMachineInterface<AllStates>;
	#currentPlayingState: Behavior<AllStates, MonsterA> | undefined;
	#enemyManager: EnemyManager;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, x, y, "monsters1", 54);

		this.#enemyManager = enemyManager;
		this.#stateMachine = new StateMachine("randomwalk");

		scene.add.existing(this);
		scene.physics.add.existing(this);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setDepth(1);
		this.setSize(this.width * 0.35, this.height * 0.35);
		this.setOffset(this.body.offset.x, this.body.offset.y + 9);
		this.setPushable(false);
		this.setDataEnabled();
		this.data.set("hittable", true);
		this.on(Events.MonsterHit, this.hit);
		this.on(Events.MonsterKillRequest, this.hit);

		this.initSprites();
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 54,
				end: 56,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 66,
				end: 68,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 78,
				end: 80,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 90,
				end: 92,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "explode",
			frames: this.anims.generateFrameNumbers("monster_explode1"),
			frameRate: 20,
		});
	}

	update() {
		if (!this.body || !isDynamicSprite(this)) {
			throw new Error("Could not update monster");
		}
		const body = this.body;
		if (!this.active) {
			body.stop();
			return;
		}
		if (this.data.get("stunned")) {
			return;
		}

		const state = this.#stateMachine.getCurrentState();

		// Take init actions
		if (state !== this.#currentPlayingState?.name) {
			console.log(
				"state has changed from",
				this.#currentPlayingState?.name,
				"to",
				state
			);
			switch (state) {
				case "randomwalk":
					this.#currentPlayingState = new RandomlyWalk(state, "randomwalk");
					break;
			}
			if (!this.#currentPlayingState) {
				throw new Error("No state active");
			}
			this.#currentPlayingState.init(
				this,
				this.#stateMachine,
				this.#enemyManager
			);
			return;
		}

		// Take update actions
		this.#currentPlayingState?.update(
			this,
			this.#stateMachine,
			this.#enemyManager
		);
	}

	hit() {
		this.setVelocity(0);
		this.data.set("stunned", true);
		this.setOrigin(0.5, 0.3);
		this.anims.play("explode", true);
		this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			this.destroy();
		});
	}
}
