import { Boot } from "./scenes/Boot";
import { Game as MainGame } from "./scenes/Game";
import { GameOver } from "./scenes/GameOver";
import { Overlay } from "./scenes/Overlay";
import { Dialog } from "./scenes/Dialog";
import { GameMap } from "./scenes/Map";
import { MainMenu } from "./scenes/MainMenu";
import { Preloader } from "./scenes/Preloader";

import { Game, Types } from "phaser";

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
	type: Phaser.AUTO,
	width: 256,
	height: 224,
	parent: "game-container",
	backgroundColor: "#028af8",
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	input: {
		gamepad: true,
	},
	physics: {
		default: "arcade",
		arcade: {
			gravity: { y: 0, x: 0 },
			debug: false,
		},
	},
	scene: [
		Boot,
		Preloader,
		MainMenu,
		MainGame,
		GameOver,
		Overlay,
		Dialog,
		GameMap,
	],
};

export default new Game(config);
