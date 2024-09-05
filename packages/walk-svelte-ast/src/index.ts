import type { TemplateNode, Attribute, Text } from 'svelte/types/compiler/interfaces';

type Node = TemplateNode;

type Visitor = {
	enter: <T extends TemplateNode>(node: T) => void | false;
	exit?: <T extends TemplateNode>(node: T) => void;
	cancelled?: boolean;
};

export const isNode = (node: unknown): node is Node => {
	if (typeof node !== 'object' || !node) return false;
	if (Array.isArray(node)) return false;

	if (!('type' in node)) return false;
	if (!('start' in node)) return false;
	if (!('end' in node)) return false;

	if (typeof node.type !== 'string') return false;
	if (typeof node.start !== 'number') return false;
	if (typeof node.end !== 'number') return false;

	return true;
};

class Walker {
	private visited = new Set<Node>();

	constructor(
		private node: Node,
		private visitor: Visitor,
	) {}

	public walk(node: Node = this.node) {
		if (this.visitor.cancelled) return;
		if (this.visited.has(node)) return;

		this.visited.add(node);

		const result = this.visitor.enter(node);

		if (result === false) {
			this.visitor.cancelled = true;
		}

		if (node.children && Array.isArray(node.children)) {
			for (const child of node.children) {
				if (isNode(child)) this.walk(child);
				if (this.visitor.cancelled) return;
			}
		}

		if (node.content && isNode(node.content)) {
			this.walk(node.content);
			if (this.visitor.cancelled) return;
		}

		if (node.body && Array.isArray(node.body)) {
			for (const child of node.body) {
				if (isNode(child)) this.walk(child);
				if (this.visitor.cancelled) return;
			}
		}

		for (const key in node) {
			if (isNode(node[key])) {
				this.walk(node[key]);
				if (this.visitor.cancelled) return;
			}
		}

		if (this.visitor.exit) this.visitor.exit(node);
	}
}

export function walk<T extends Node>(node: T, visitor: Visitor): void {
	const walker = new Walker(node, visitor);
	return walker.walk.call(walker);
}

export { type Node, type Attribute, type Visitor, type Text };
