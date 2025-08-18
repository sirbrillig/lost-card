export type Component = Map<string, any>;

export class ComponentManager {
	#components = new Map<string, Component>();

	register<C extends Component>(key: string, component: C): void {
		this.#components.set(key, component);
	}

	get(key: string) {
		return this.#components.get(key);
	}

	clear(): void {
		this.#components.forEach((component) => component.clear());
	}
}
