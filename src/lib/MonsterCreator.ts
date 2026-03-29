import { EnemyManager } from "../lib/EnemyManager";
import { BaseMonster } from "../monsters/BaseMonster";
import { MountainMonster } from "../monsters/MountainMonster";
import { HopPot } from "../monsters/HopPot";
import { RockDigger } from "../monsters/RockDigger";
import { LavaBlorp } from "../monsters/LavaBlorp";
import { AirCannon } from "../monsters/AirCannon";
import { Ghost } from "../monsters/Ghost";
import { BlackOrb } from "../monsters/BlackOrb";
import { FinalBoss } from "../monsters/FinalBoss";
import { Skeleton } from "../monsters/Skeleton";
import { CloudGoblin } from "../monsters/CloudGoblin";
import { SkyBlob } from "../monsters/SkyBlob";
import { Slime } from "../monsters/Slime";
import { Spike } from "../monsters/Spike";
import { Flower } from "../monsters/Flower";
import { PoisonShroom } from "../monsters/PoisonShroom";
import { Snakey } from "../monsters/Snakey";
import { PlantBug } from "../monsters/PlantBug";
import { IceMonster } from "../monsters/IceMonster";
import { IceHopper } from "../monsters/IceHopper";
import { FireSlug } from "../monsters/FireSlug";
import { FireGiant } from "../monsters/FireGiant";
import { FireSpout } from "../monsters/FireSpout";
import { WaterDipper } from "../monsters/WaterDipper";
import { GreatGhost } from "../monsters/GreatGhost";
import { MountainBoss } from "../monsters/MountainBoss";
import { SlowPunch } from "../monsters/SlowPunch";
import { PlantSpitter } from "../monsters/PlantSpitter";
import { SkyBlobSpitter } from "../monsters/SkyBlobSpitter";
import { IceBoss } from "../monsters/IceBoss";
import { PlantBoss } from "../monsters/PlantBoss";
import { SpiritBoss } from "../monsters/SpiritBoss";
import { CloudBoss } from "../monsters/CloudBoss";
import { FireBoss } from "../monsters/FireBoss";
import { EvilFog } from "../monsters/EvilFog";
import {
	DataKeys,
	Events,
	getDataFromRegistry,
	saveDataToRegistry,
	isSpriteDirection,
	type MapMonsterProperties,
} from "../lib/shared";

type MonsterConstructor = new (
	scene: Phaser.Scene,
	enemyManager: EnemyManager,
	x: number,
	y: number
) => BaseMonster;

class MonsterRegistry {
	private static registry = new Map<string, MonsterConstructor>();

	// Register a monster class
	static register(name: string, constructor: MonsterConstructor): void {
		this.registry.set(name, constructor);
	}

	// Create a monster with type-safe arguments
	static createMonster(
		className: string,
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		x: number,
		y: number
	): BaseMonster {
		const Constructor = this.registry.get(className);
		if (!Constructor) {
			throw new Error(`No monster found with name ${className}`);
		}
		return new Constructor(scene, enemyManager, x, y);
	}
}

MonsterRegistry.register("MountainMonster", MountainMonster);
MonsterRegistry.register("RockDigger", RockDigger);
MonsterRegistry.register("MountainBoss", MountainBoss);
MonsterRegistry.register("HopPot", HopPot);
MonsterRegistry.register("LavaBlorp", LavaBlorp);
MonsterRegistry.register("Ghost", Ghost);
MonsterRegistry.register("GreatGhost", GreatGhost);
MonsterRegistry.register("BlackOrb", BlackOrb);
MonsterRegistry.register("FinalBoss", FinalBoss);
MonsterRegistry.register("Skeleton", Skeleton);
MonsterRegistry.register("CloudGoblin", CloudGoblin);
MonsterRegistry.register("CloudBoss", CloudBoss);
MonsterRegistry.register("SkyBlob", SkyBlob);
MonsterRegistry.register("Slime", Slime);
MonsterRegistry.register("Spike", Spike);
MonsterRegistry.register("Flower", Flower);
MonsterRegistry.register("PoisonShroom", PoisonShroom);
MonsterRegistry.register("Snakey", Snakey);
MonsterRegistry.register("PlantBug", PlantBug);
MonsterRegistry.register("IceMonster", IceMonster);
MonsterRegistry.register("IceHopper", IceHopper);
MonsterRegistry.register("FireSlug", FireSlug);
MonsterRegistry.register("FireGiant", FireGiant);
MonsterRegistry.register("FireSpout", FireSpout);
MonsterRegistry.register("AirCannon", AirCannon);
MonsterRegistry.register("WaterDipper", WaterDipper);
MonsterRegistry.register("PlantSpitter", PlantSpitter);
MonsterRegistry.register("SlowPunch", SlowPunch);
MonsterRegistry.register("SkyBlobSpitter", SkyBlobSpitter);
MonsterRegistry.register("IceBoss", IceBoss);
MonsterRegistry.register("PlantBoss", PlantBoss);
MonsterRegistry.register("CloudBoss", CloudBoss);
MonsterRegistry.register("SpiritBoss", SpiritBoss);
MonsterRegistry.register("FireBoss", FireBoss);
MonsterRegistry.register("EvilFog", EvilFog);

const monstersThatSaveAfterDefeat = [
	"MountainBoss",
	"FireBoss",
	"IceBoss",
	"SpiritBoss",
	"CloudBoss",
	"PlantBoss",
];

export class MonsterCreator {
	#scene: Phaser.Scene;
	#enemyManager: EnemyManager;
	#saveGame: () => void;

	constructor(
		scene: Phaser.Scene,
		enemyManager: EnemyManager,
		saveGame: () => void
	) {
		this.#enemyManager = enemyManager;
		this.#scene = scene;
		this.#saveGame = saveGame;
	}

	createMonster(
		name: string,
		location: { x: number; y: number },
		properties: MapMonsterProperties | undefined
	) {
		const monster = MonsterRegistry.createMonster(
			name,
			this.#scene,
			this.#enemyManager,
			location.x,
			location.y
		);
		if (properties?.doNotRespawn) {
			monster.doNotRespawn = properties.doNotRespawn;
		}
		if (properties?.timeBeforeActivate) {
			monster.timeBeforeActivate = properties.timeBeforeActivate;
		}
		if (properties?.isMiniBoss) {
			monster.isMiniBoss = properties.isMiniBoss;
		}
		if (properties?.facing && isSpriteDirection(properties.facing)) {
			monster.facing = properties.facing;
		}
		if (properties?.moveUpDown !== undefined && "moveUpDown" in monster) {
			(monster as unknown as { moveUpDown: boolean }).moveUpDown =
				properties.moveUpDown;
		}
		monster.once(Events.MonsterDefeated, () => {
			if (monster.doNotRespawn) {
				this.#rememberMonsterDefeated(name);
			}
			if (monstersThatSaveAfterDefeat.includes(name)) {
				this.#saveGame();
			}
		});
		return monster;
	}

	shouldMonsterRespawn(name: string): boolean {
		const defeated =
			getDataFromRegistry(this.#scene.registry, DataKeys.DefeatedMonsters) ??
			[];
		return !defeated.includes(name);
	}

	#rememberMonsterDefeated(name: string): void {
		const defeated =
			getDataFromRegistry(this.#scene.registry, DataKeys.DefeatedMonsters) ??
			[];
		defeated.push(name);
		saveDataToRegistry(
			this.#scene.registry,
			DataKeys.DefeatedMonsters,
			defeated
		);
	}
}
