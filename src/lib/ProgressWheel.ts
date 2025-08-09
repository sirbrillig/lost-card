export class ProgressWheel {
	private scene: Phaser.Scene;
	private x: number;
	private y: number;
	private radius: number;
	private progress: number = 0;
	private bgCircle: Phaser.GameObjects.Graphics;
	private progressCircle: Phaser.GameObjects.Graphics;
	private progressColor: number = 0x00ff00;

	constructor(scene: Phaser.Scene, x: number, y: number, radius: number) {
		this.scene = scene;
		this.x = x;
		this.y = y;
		this.radius = radius;

		this.createGraphicsWheel();
	}

	private createGraphicsWheel(): void {
		this.bgCircle = this.scene.add.graphics();
		this.bgCircle.lineStyle(8, 0x555555, 1);
		this.bgCircle.strokeCircle(this.x, this.y, this.radius);
		this.progressCircle = this.scene.add.graphics();
	}

	public setDepth(depth: number): void {
		this.bgCircle.setDepth(depth);
		this.progressCircle.setDepth(depth);
	}

	public setOpacity(opacity: number): void {
		this.bgCircle.setAlpha(opacity);
		this.progressCircle.setAlpha(opacity);
	}

	public setColor(color: number): void {
		this.progressColor = color;
	}

	/**
	 * A progress of 0 is empty and 1 is complete.
	 */
	public setProgress(progress: number): void {
		this.progress = Math.max(0, Math.min(1, progress));
		this.updateGraphicsProgress();
	}

	private updateGraphicsProgress(): void {
		this.progressCircle.clear();

		if (this.progress > 0) {
			this.progressCircle.lineStyle(8, this.progressColor, 1);

			// Calculate the arc angle (starting from top, going clockwise)
			const startAngle = -Math.PI / 2; // Start at top
			const endAngle = startAngle + this.progress * 2 * Math.PI;

			this.progressCircle.beginPath();
			this.progressCircle.arc(
				this.x,
				this.y,
				this.radius,
				startAngle,
				endAngle,
				false
			);
			this.progressCircle.strokePath();
		}
	}

	public getProgress(): number {
		return this.progress;
	}

	public setPosition(x: number, y: number): void {
		const deltaX = x - this.x;
		const deltaY = y - this.y;

		this.x = x;
		this.y = y;

		this.bgCircle.x += deltaX;
		this.bgCircle.y += deltaY;
		this.progressCircle.x += deltaX;
		this.progressCircle.y += deltaY;
	}

	public destroy(): void {
		this.bgCircle?.destroy();
		this.progressCircle?.destroy();
	}
}
