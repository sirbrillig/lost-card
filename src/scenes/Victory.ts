import { Scene } from "phaser";
import {
	powerOrder,
	auraOrder,
	getPowerEquippedKey,
	DataKeys,
} from "../shared";

const showVictoryTimer = 20000;

export class Victory extends Scene {
	constructor() {
		super("Victory");
	}

	create() {
		this.sound.stopAll();
		this.time.addEvent({
			delay: showVictoryTimer,
			callback: () => {
				this.scene.start("MainMenu");
			},
		});

		this.cameras.main.setBackgroundColor("black");

		// The +1 is the CrownCard which came from the final boss.
		const totalCardsCount = 1 + [...powerOrder, ...auraOrder].length;
		let cardCount = 1;
		[...powerOrder, ...auraOrder].forEach((card) => {
			if (this.registry.get(getPowerEquippedKey(card))) {
				cardCount += 1;
			}
		});

		const secretRooms =
			this.registry.get(DataKeys.SecretRoomsFound)?.length ?? 0;
		const secretRoomsTotal = this.registry.get(DataKeys.SecretRoomsTotal) ?? 0;

		this.add
			.bitmapText(
				this.cameras.main.width / 2,
				80,
				"RetroGamingWhiteSmall",
				`With the Crown Card restored, the people of the six kingdoms are free once again. Your spirit may return to its rest.\r\nThe End.\r\n\r\nYou collected ${cardCount} / ${totalCardsCount} cards and found ${secretRooms} / ${secretRoomsTotal} secret rooms.`,
				12
			)
			.setMaxWidth(this.cameras.main.width - 10)
			.setOrigin(0.5);
	}
}
