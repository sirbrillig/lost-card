import { Scene } from "phaser";
import {
	Events,
	getRoomForPoint,
	isValueTruthy,
	Region,
	getRoomsInRegion,
	getRegionName,
} from "../lib/shared";
import { MainEvents } from "../lib/MainEvents";
import { getMap } from "../lib/components";

function getLanternRooms(): string[] {
	const map = getMap();
	return (
		map
			?.getObjectLayer("SavePoints")
			?.objects.map((lantern) => {
				if (!lantern.x || !lantern.y) {
					return undefined;
				}
				return getRoomForPoint(map, lantern.x, lantern.y);
			})
			.map((room) => room?.name)
			.filter(isValueTruthy) ?? []
	);
}

const lineHeight = 14;
const startHeight = 12;

class MenuItem {
	title: string;
	action: () => void;

	constructor(title: string, action: () => void) {
		this.title = title;
		this.action = action;
	}
}

class Menu {
	title: string;
	items: MenuItem[];

	constructor(title: string, items: MenuItem[]) {
		this.title = title;
		this.items = items;
	}
}

class MenuManager {
	#activeMenus: Menu[] = [];
	selectedItemIndex: number = 0;

	constructor(initialMenu: Menu) {
		this.#activeMenus.push(initialMenu);
	}

	getActiveMenu(): Menu | undefined {
		if (this.#activeMenus.length === 0) {
			return undefined;
		}
		return this.#activeMenus[this.#activeMenus.length - 1];
	}

	activateMenu(menu: Menu): void {
		this.#activeMenus.push(menu);
		this.selectedItemIndex = 0;
	}

	closeMenu(): void {
		this.#activeMenus.pop();
		this.selectedItemIndex = 0;
	}

	getCurrentlySelectedItem(): MenuItem | undefined {
		return this.getActiveMenu()?.items[this.selectedItemIndex];
	}

	moveSelectionDown(): void {
		const menu = this.getActiveMenu();
		if (!menu) {
			return;
		}
		this.selectedItemIndex += 1;
		if (this.selectedItemIndex >= menu.items.length) {
			this.selectedItemIndex = 0;
		}
	}

	moveSelectionUp(): void {
		const menu = this.getActiveMenu();
		if (!menu) {
			return;
		}
		this.selectedItemIndex -= 1;
		if (this.selectedItemIndex < 0) {
			this.selectedItemIndex = menu.items.length - 1;
		}
	}
}

export class Debug extends Scene {
	#selector: Phaser.GameObjects.Image | undefined;
	#titleText: Phaser.GameObjects.BitmapText | undefined;
	#menuItemText: Phaser.GameObjects.BitmapText[] = [];
	cursors: Phaser.Types.Input.Keyboard.CursorKeys;
	#menuManager: MenuManager;

	constructor() {
		super("Debug");
	}

	create() {
		this.#menuManager = new MenuManager(this.#getMainMenu());
		const initialMenu = this.#menuManager.getActiveMenu();
		if (!initialMenu) {
			throw new Error("No menu found");
		}
		// Add border and background.
		this.add
			.nineslice(5, 5, "panel4", 0, 248, 210, 8, 8, 8, 8)
			.setOrigin(0)
			.setAlpha(0.9);

		this.#renderMenu(initialMenu);
		this.#setUpControls();
	}

	#changeMenu(menu: Menu | undefined): void {
		if (!menu) {
			throw new Error("No menu found");
		}
		this.#menuManager.activateMenu(menu);
		this.#renderMenu(menu);
	}

	#goBackMenu(): void {
		this.#menuManager.closeMenu();
		const menu = this.#menuManager.getActiveMenu();
		if (!menu) {
			this.#close();
			return;
		}
		this.#renderMenu(menu);
	}

	#getMainMenu(): Menu {
		return new Menu("Debug", [
			new MenuItem("Teleport", () => {
				this.#changeMenu(this.#getTeleportMenu());
			}),
		]);
	}

	#getTeleportMenu(): Menu {
		const regions: Region[] = ["MK", "CK", "IK", "PK", "FK", "SK"];
		const items = regions.map(
			(region) =>
				new MenuItem(getRegionName(region), () => {
					this.#changeMenu(this.#getTeleportMenuForRegion(region));
				})
		);
		return new Menu("Teleport to", items);
	}

	#getTeleportMenuForRegion(region: Region): Menu {
		const rooms = getRoomsInRegion(getMap(), region);
		const roomNames = rooms.map((room) => room.name);
		const items = getLanternRooms()
			.filter((room) => {
				return roomNames.includes(room);
			})
			.map(
				(roomName) =>
					new MenuItem(roomName, () => {
						MainEvents.emit(Events.TeleportToLantern, roomName);
						this.#close();
					})
			);
		return new Menu("Teleport to", items);
	}

	#renderMenu(menu: Menu) {
		this.#titleText?.destroy();
		this.#selector?.destroy();
		this.#menuItemText?.map((text) => text.destroy());

		// Add title.
		this.#titleText = this.add
			.bitmapText(
				this.cameras.main.width / 2,
				startHeight,
				"RetroGamingWhiteSmall",
				menu.title,
				12
			)
			.setMaxWidth(this.cameras.main.width - 10)
			.setOrigin(0.5);

		// Add selector.
		this.#selector = this.add.image(
			this.cameras.main.width / 2 - 100,
			startHeight + lineHeight,
			"icons1",
			29
		);

		let y = startHeight + lineHeight;
		this.#menuItemText = menu.items.map((item) => {
			const text = this.add
				.bitmapText(
					this.cameras.main.width / 2,
					y,
					"RetroGamingWhiteSmall",
					item.title,
					12
				)
				.setMaxWidth(this.cameras.main.width - 10)
				.setOrigin(0.5);

			y += lineHeight;
			return text;
		});
	}

	#setUpControls(): void {
		const cursors = this.input.keyboard?.createCursorKeys();
		if (!cursors) {
			throw new Error("Keyboard could not be loaded");
		}
		this.cursors = cursors;

		this.input.gamepad?.on("down", () => {
			if (this.input.gamepad?.pad1?.A) {
				this.#confirmSelection();
			}
			if (this.input.gamepad?.pad1?.X) {
				this.#goBackMenu();
			}
			if (this.input.gamepad?.pad1?.up) {
				this.#changeSelectionBy(-1);
			}
			if (this.input.gamepad?.pad1?.down) {
				this.#changeSelectionBy(1);
			}
		});
	}

	#close(): void {
		this.scene.stop();
		this.scene.resume("Game");
		this.scene.resume("Overlay");
	}

	#changeSelectionBy(change: 1 | -1) {
		if (change === 1) {
			this.#menuManager.moveSelectionDown();
		} else {
			this.#menuManager.moveSelectionUp();
		}
		this.#selector?.setPosition(
			this.#selector.x,
			lineHeight +
				startHeight +
				this.#menuManager.selectedItemIndex * lineHeight
		);
	}

	#confirmSelection() {
		const selectedItem = this.#menuManager.getCurrentlySelectedItem();
		if (!selectedItem) {
			return;
		}
		selectedItem.action();
	}

	update() {
		const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
		const downJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down);
		const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space);
		const backJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.shift);

		if (upJustPressed) {
			this.#changeSelectionBy(-1);
		} else if (downJustPressed) {
			this.#changeSelectionBy(1);
		} else if (backJustPressed) {
			this.#goBackMenu();
		} else if (spaceJustPressed) {
			this.#confirmSelection();
		}
	}
}
