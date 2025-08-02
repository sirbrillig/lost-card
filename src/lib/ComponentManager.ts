export type Component = Map<string, any>;

export class ComponentManager {
	#components: Component[] = [];

	register(component: Component): void {
		this.#components.push(component);
	}

	clear(): void {
		this.#components.forEach((component) => component.clear());
	}
}
