import { config } from "../lib/config";
import { MainEvents } from "../lib/MainEvents";
import { getPlayerOrThrow, getActiveRoom } from "../lib/components";
import {
	SpriteDirection,
	SpriteDown,
	SpriteUp,
	SpriteLeft,
	SpriteRight,
	createVelocityForDirection,
	getDirectionTowardPoint,
	getSpriteFeetPosition,
	isPointInRoom,
	normalizeRectangle,
	DataKeys,
	Events,
} from "./shared";

export class Platform {
	sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	points: Phaser.Types.Math.Vector2Like[] = [];
	currentPointIndex: number = 0;
	#isIncreasing: boolean = true;
	#originalPoint: Phaser.Types.Math.Vector2Like;
	#speed: number = config.movingPlatformSpeed;
	#currentDirection: SpriteDirection | undefined;
	#pausingTimer: Phaser.Time.TimerEvent | undefined;

	constructor(sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
		this.sprite = sprite;
		this.sprite.setDepth(config.movingPlatformDepth);
		this.sprite.body.pushable = false;
		this.#originalPoint = { x: sprite.x, y: sprite.y };
		const speed = sprite.data.get(DataKeys.MovingPlatformSpeed);
		if (speed) {
			this.#speed = speed;
		}
	}

	addPoint(point: Phaser.Types.Math.Vector2Like): void {
		this.points.push(point);
	}

	start(): void {
		this.#incrementPoint();
		this.#moveToCurrentPoint();
		MainEvents.on(Events.LeavingRoom, () => {
			this.stop();
			this.sprite.setPosition(this.#originalPoint.x, this.#originalPoint.y);
		});
		MainEvents.on(Events.EnteredRoom, () => {
			if (this.#isInActiveRoom()) {
				this.start();
			}
		});
	}

	stop(): void {
		this.sprite.body?.setVelocity(0, 0);
		this.#pausingTimer?.remove();
		this.#pausingTimer = undefined;
	}

	update(): void {
		if (this.#pausingTimer) {
			return;
		}
		if (!this.sprite.body) {
			return;
		}
		const player = getPlayerOrThrow();
		if (this.isPlayerOnPlatform()) {
			player.data.set(DataKeys.IsOnMovingPlatform, true);
			player.setVelocity(
				player.body.velocity.x + this.sprite.body.velocity.x,
				player.body.velocity.y + this.sprite.body.velocity.y
			);
		} else {
			player.data.remove(DataKeys.IsOnMovingPlatform);
		}
		if (this.#hasReachedPoint()) {
			this.stop();
			this.#pausingTimer = this.sprite.scene.time.addEvent({
				delay: config.movingPlatformPauseTime,
				callback: () => {
					this.#incrementPoint();
					this.#moveToCurrentPoint();
					this.#pausingTimer = undefined;
				},
			});
		}
	}

	#isInActiveRoom(): boolean {
		const activeRoom = getActiveRoom();
		if (!activeRoom) {
			return false;
		}
		if (!this.sprite.body) {
			return false;
		}
		return isPointInRoom(
			this.sprite.body.center.x,
			this.sprite.body.center.y,
			activeRoom
		);
	}

	#hasReachedPoint(): boolean {
		const relativePoint = this.#getCurrentPoint();
		if (!relativePoint) {
			throw new Error("platform has no current point");
		}
		const point = this.#getPointForRelativePoint(relativePoint);
		const direction = getDirectionTowardPoint(this.sprite, point);
		if (direction === undefined) {
			return true;
		}
		if (direction !== this.#currentDirection) {
			// In case we pass the point
			return true;
		}
		return false;
	}

	isPlayerNearPlatform(): boolean {
		if (!this.sprite.body) {
			return false;
		}
		const player = getPlayerOrThrow();
		if (player.data.get(DataKeys.IsFalling)) {
			return false;
		}
		const bottomCenter = getSpriteFeetPosition(player);
		const direction = player.data.get(DataKeys.PlayerDirection) ?? SpriteDown;
		const longLength = 20;
		const shortLength = 5;
		const width = (() => {
			switch (direction) {
				case SpriteUp:
					return shortLength;
				case SpriteDown:
					return shortLength;
				case SpriteLeft:
					return -longLength;
				case SpriteRight:
					return longLength;
			}
		})();
		const height = (() => {
			switch (direction) {
				case SpriteUp:
					return -longLength;
				case SpriteDown:
					return longLength;
				case SpriteLeft:
					return shortLength;
				case SpriteRight:
					return shortLength;
			}
		})();
		const playerRect = normalizeRectangle(
			new Phaser.Geom.Rectangle(bottomCenter.x, bottomCenter.y, width, height)
		);
		const bounds = this.sprite.getBounds();
		return Phaser.Geom.Rectangle.Overlaps(playerRect, bounds);
	}

	isPlayerOnPlatform(): boolean {
		if (!this.sprite.body) {
			return false;
		}
		const player = getPlayerOrThrow();
		if (player.data.get(DataKeys.IsFalling)) {
			return false;
		}
		const bottomCenter = getSpriteFeetPosition(player);
		return this.sprite.body.hitTest(bottomCenter.x, bottomCenter.y);
	}

	#getCurrentPoint(): Phaser.Types.Math.Vector2Like | undefined {
		// Reverse direction at ends
		if (this.currentPointIndex >= this.points.length) {
			this.currentPointIndex -= 2;
			this.#isIncreasing = false;
		}
		if (this.currentPointIndex < 0) {
			this.currentPointIndex += 2;
			this.#isIncreasing = true;
		}

		return this.points[this.currentPointIndex];
	}

	#incrementPoint(): void {
		if (this.#isIncreasing) {
			this.currentPointIndex += 1;
		} else {
			this.currentPointIndex -= 1;
		}
	}

	#getPointForRelativePoint(
		relativePoint: Phaser.Types.Math.Vector2Like
	): Phaser.Types.Math.Vector2Like {
		return {
			x: this.#originalPoint.x + relativePoint.x,
			y: this.#originalPoint.y + relativePoint.y,
		};
	}

	#moveToCurrentPoint(): void {
		const relativePoint = this.#getCurrentPoint();
		if (!relativePoint) {
			throw new Error("No point to move platform to");
		}
		const point = this.#getPointForRelativePoint(relativePoint);
		const direction = getDirectionTowardPoint(this.sprite, point);
		this.#currentDirection = direction;
		if (direction === undefined) {
			return;
		}
		if (!this.sprite.body) {
			return;
		}
		const velocity = createVelocityForDirection(this.#speed, direction);
		this.sprite.body.setVelocity(velocity.x, velocity.y);
	}
}
