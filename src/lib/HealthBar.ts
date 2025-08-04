export class HealthBar {
	private scene: Phaser.Scene;
	private x: number;
	private y: number;
	private width: number;
	private height: number;
	private maxHealth: number;
	private currentHealth: number;

	private background: Phaser.GameObjects.Rectangle;
	private fill: Phaser.GameObjects.Rectangle;
	private mask: Phaser.GameObjects.Rectangle;

	constructor(
		scene: Phaser.Scene,
		x: number,
		y: number,
		width: number,
		height: number,
		maxHealth: number
	) {
		this.scene = scene;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.maxHealth = maxHealth;
		this.currentHealth = maxHealth;
		this.create();
	}

	private create(): void {
		// Calculate center positions for rectangles (since they use center origin by default)
		const center = this.getPositionForRectangles();

		// Create background (empty bar)
		this.background = this.scene.add.rectangle(
			center.x,
			center.y,
			this.width,
			this.height,
			0x333333
		);
		this.background.setStrokeStyle(2, 0x666666);

		// Create the fill
		this.fill = this.scene.add.rectangle(
			center.x,
			center.y,
			this.width - 4,
			this.height - 4,
			0x8e44ad
		);

		// Create mask for the fill
		this.mask = this.scene.add.rectangle(
			center.x,
			center.y,
			this.width - 4,
			this.height - 4,
			0xffffff
		);
		this.mask.setVisible(false);

		// Apply mask to fill
		this.fill.setMask(this.mask.createBitmapMask());
	}

	private getPositionForRectangles(): { x: number; y: number } {
		const centerX = this.x + this.width / 2;
		const centerY = this.y + this.height / 2;
		return { x: centerX, y: centerY };
	}

	public decreaseHealth(amount: number = 1): void {
		this.currentHealth = Math.max(0, this.currentHealth - amount);
		this.updateBar();
	}

	public increaseHealth(amount: number = 1): void {
		this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
		this.updateBar();
	}

	public setHealth(amount: number): void {
		this.currentHealth = Math.max(0, Math.min(this.maxHealth, amount));
		this.updateBar();
	}

	public getCurrentHealth(): number {
		return this.currentHealth;
	}

	public getMaxHealth(): number {
		return this.maxHealth;
	}

	public setPosition(x: number, y: number): void {
		this.x = x;
		this.y = y;
		const center = this.getPositionForRectangles();
		this.background.setPosition(center.x, center.y);
		this.fill.setPosition(center.x, center.y);
		this.mask.setPosition(center.x, center.y);
	}

	public setMaxHealth(maxHealth: number): void {
		this.maxHealth = maxHealth;
		this.currentHealth = Math.min(this.currentHealth, maxHealth);
		this.updateBar();
	}

	private updateBar(): void {
		const percentage: number = this.currentHealth / this.maxHealth;
		const newWidth: number = (this.width - 4) * percentage;

		// Calculate center positions
		const centerY = this.y + this.height / 2;

		// Update mask width and position (depletes from right to left)
		this.mask.setSize(newWidth, this.height - 4);

		// Adjust X position so it depletes from right to left
		// The mask should be positioned so its left edge aligns with the left edge of the bar
		const maskCenterX = this.x + 2 + newWidth / 2;
		this.mask.setPosition(maskCenterX, centerY);

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
