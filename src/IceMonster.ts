import { isDynamicSprite } from "./shared";
import { BehaviorMachineInterface, Behavior, StateMachine } from "./behavior";
import { RandomlyWalk, PowerUp, IceAttack } from "./behaviors";
import { EnemyManager } from "./EnemyManager";

type AllStates = "randomwalk" | "powerup" | "iceattack";

export class IceMonster extends Phaser.Physics.Arcade.Sprite {
	#stateMachine: BehaviorMachineInterface<AllStates>;
	#currentPlayingState: Behavior<AllStates, IceMonster> | undefined;
	#enemyManager: EnemyManager;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, x, y, "monsters1", 51);

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
		this.on("hit", this.hit);
		this.on("kill", this.hit);

		this.initSprites();
	}

	initSprites() {
		this.anims.create({
			key: "down",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 51,
				end: 53,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 63,
				end: 65,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 75,
				end: 77,
			}),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: "up",
			frames: this.anims.generateFrameNumbers("monsters1", {
				start: 87,
				end: 89,
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
					this.#currentPlayingState = new RandomlyWalk(state, "powerup");
					break;
				case "powerup":
					this.#currentPlayingState = new PowerUp(state, "iceattack");
					break;
				case "iceattack":
					this.#currentPlayingState = new IceAttack(state, "randomwalk");
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
