import { isDynamicSprite } from "./shared";
import { EnemyManager } from "./EnemyManager";
import { Behavior, BehaviorMachineInterface, StateMachine } from "./behavior";
import { WaitForActive, Roar, SpawnEnemies, PostSpawn } from "./behaviors";

type AllStates = "initial" | "roar1" | "spawn1" | "spawn2" | "idle1" | "idle2";

export class BossA extends Phaser.Physics.Arcade.Sprite {
	#isBeingHit: boolean = false;
	#freeTimeAfterHit: number = 600;
	#hitPoints: number = 6;
	#stateMachine: BehaviorMachineInterface<AllStates>;
	#currentPlayingState: Behavior<AllStates, BossA> | undefined;
	#enemyManager: EnemyManager;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	) {
		super(scene, x, y, "bosses1", 84);

		this.#enemyManager = enemyManager;

		scene.add.existing(this);
		scene.physics.add.existing(this);

		if (!this.body) {
			throw new Error("Could not create monster");
		}

		this.setDepth(1);
		this.setSize(this.width * 0.6, this.height * 0.65);
		this.setOffset(this.body.offset.x, this.body.offset.y + 10);
		this.setOrigin(0.5, 0.75);
		this.setCollideWorldBounds(true);
		this.setPushable(false);
		this.setScale(1);
		this.setDataEnabled();
		this.data.set("monsterPosition", new Phaser.Math.Vector2(x, y));
		this.data.set("hittable", true);
		this.on("hit", this.hit);

		this.#stateMachine = new StateMachine("initial");

		this.initSprites();
	}

	initSprites() {
		this.anims.create({
			key: "roar",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 48,
				end: 50,
			}),
			frameRate: 10,
			repeat: 8,
		});
		this.anims.create({
			key: "spawn",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 72,
				end: 74,
			}),
			frameRate: 10,
			repeat: 8,
		});
		this.anims.create({
			key: "idle",
			frames: this.anims.generateFrameNumbers("bosses1", {
				start: 60,
				end: 62,
			}),
			frameRate: 10,
			repeat: 8,
		});
		this.anims.create({
			key: "explode-boss",
			frames: this.anims.generateFrameNumbers("monster_explode1"),
			frameRate: 24,
			repeat: 4,
			repeatDelay: 2,
		});
	}

	update() {
		if (!this.body || !isDynamicSprite(this)) {
			throw new Error("Could not update monster");
		}
		this.data.set("hittable", this.isHittable());

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
				case "initial":
					this.#currentPlayingState = new WaitForActive(state, "roar1");
					break;
				case "roar1":
					this.#currentPlayingState = new Roar(state, "spawn1");
					break;
				case "spawn1":
					this.#currentPlayingState = new SpawnEnemies(state, "spawn2");
					break;
				case "spawn2":
					this.#currentPlayingState = new SpawnEnemies(state, "idle1");
					break;
				case "idle1":
					this.#currentPlayingState = new PostSpawn(state, "idle2");
					break;
				case "idle2":
					this.#currentPlayingState = new PostSpawn(state, "roar1");
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
		if (!this.isHittable()) {
			return;
		}
		console.log("hit boss");

		this.#isBeingHit = true;
		this.tint = 0xff0000;
		setTimeout(() => {
			this.clearTint();
			this.#isBeingHit = false;
		}, this.#freeTimeAfterHit);
		this.#hitPoints -= 1;

		if (this.#hitPoints === 0) {
			this.emit("dying");
			this.setVelocity(0);
			this.data.set("stunned", true);
			this.setOrigin(0.5, 0.3);
			this.setDisplaySize(this.width * 2, this.height * 2);
			this.anims.play("explode-boss", true);
			this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
				this.emit("defeated");
				this.destroy();
			});
		}
	}

	isHittable(): boolean {
		return (
			this.#stateMachine.getCurrentState() !== "initial" &&
			!this.#stateMachine.getCurrentState().includes("roar") &&
			!this.#isBeingHit
		);
	}
}
