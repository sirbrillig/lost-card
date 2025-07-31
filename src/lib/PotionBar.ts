export class PotionBar {
	private scene: Phaser.Scene;
	private x: number;
	private y: number;
	private width: number;
	private height: number;
	private maxPotions: number;
	private currentPotions: number;

	private background: Phaser.GameObjects.Rectangle;
	private fill: Phaser.GameObjects.Rectangle;
	private mask: Phaser.GameObjects.Rectangle;

	constructor(
		scene: Phaser.Scene,
		x: number,
		y: number,
		width: number,
		height: number,
		maxPotions: number
	) {
		this.scene = scene;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.maxPotions = maxPotions;
		this.currentPotions = maxPotions;

		this.create();
	}

	private create(): void {
		// Create background (empty bar)
		this.background = this.scene.add.rectangle(
			this.x,
			this.y,
			this.width,
			this.height,
			0x333333
		);
		this.background.setStrokeStyle(2, 0x666666);

		// Create the fill (potion liquid)
		this.fill = this.scene.add.rectangle(
			this.x,
			this.y,
			this.width - 4,
			this.height - 4,
			0x8e44ad
		);

		// Create mask for the fill
		this.mask = this.scene.add.rectangle(
			this.x,
			this.y,
			this.width - 4,
			this.height - 4,
			0xffffff
		);
		this.mask.setVisible(false);

		// Apply mask to fill
		this.fill.setMask(this.mask.createBitmapMask());
	}

	public setHeight(height: number): void {
		this.height = height;
	}

	public usePotions(amount: number = 1): void {
		this.currentPotions = Math.max(0, this.currentPotions - amount);
		this.updateBar();
	}

	public addPotions(amount: number = 1): void {
		this.currentPotions = Math.min(
			this.maxPotions,
			this.currentPotions + amount
		);
		this.updateBar();
	}

	public setPotions(amount: number): void {
		this.currentPotions = Math.max(0, Math.min(this.maxPotions, amount));
		this.updateBar();
	}

	public getCurrentPotions(): number {
		return this.currentPotions;
	}

	public getMaxPotions(): number {
		return this.maxPotions;
	}

	public setMaxPotions(maxPotions: number): void {
		this.maxPotions = maxPotions;
		this.currentPotions = Math.min(this.currentPotions, maxPotions);
		this.updateBar();
	}

	private updateBar(): void {
		const percentage: number = this.currentPotions / this.maxPotions;
		const newHeight: number = (this.height - 4) * percentage;

		// Update mask height and position (depletes from top)
		this.mask.setSize(this.width - 4, newHeight);

		// Adjust Y position so it depletes from top to bottom
		const offsetY: number = (this.height - 4 - newHeight) / 2;
		this.mask.setPosition(this.x, this.y + offsetY);

		// Change color based on potion level
		if (percentage > 0.6) {
			this.fill.setFillStyle(0x8e44ad); // Purple
		} else if (percentage > 0.3) {
			this.fill.setFillStyle(0xe67e22); // Orange
		} else {
			this.fill.setFillStyle(0xe74c3c); // Red
		}
	}

	public destroy(): void {
		this.background.destroy();
		this.fill.destroy();
		this.mask.destroy();
	}
}
