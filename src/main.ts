import { Boot } from "./scenes/Boot";
import { Game as MainGame } from "./scenes/Game";
import { GameOver } from "./scenes/GameOver";
import { Victory } from "./scenes/Victory";
import { Opening } from "./scenes/Opening";
import { Overlay } from "./scenes/Overlay";
import { Dialog } from "./scenes/Dialog";
import { GameMap } from "./scenes/Map";
import { Debug } from "./scenes/Debug";
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
	backgroundColor: "#000000",
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
		Opening,
		MainMenu,
		MainGame,
		GameOver,
		Overlay,
		Dialog,
		GameMap,
		Debug,
		Victory,
	],
};

export default new Game(config);
