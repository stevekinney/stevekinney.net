import type { TemplateNode } from 'svelte/types/compiler/interfaces';

import { isNode } from './is-node';

export type Visitor = {
	enter: <T extends TemplateNode>(node: T) => void | false;
	exit?: <T extends TemplateNode>(node: T) => void;
	cancelled?: boolean;
};

export class Walker {
	private visited = new Set<TemplateNode>();

	constructor(
		private node: TemplateNode,
		private visitor: Visitor,
	) {}

	private visit(node: TemplateNode): void {
		if (this.visitor.cancelled || this.visited.has(node)) return;
		this.visited.add(node);

		const result = this.visitor.enter(node);

		if (result === false) {
			this.visitor.cancelled = true;
			return;
		}

		this.walkChildren(node);
		if (this.visitor.exit) this.visitor.exit(node);
	}

	private walkChildren(node: TemplateNode): void {
		const childrenArrays = [node.children, node.body];
		for (const children of childrenArrays) {
			if (children && Array.isArray(children)) {
				for (const child of children) {
					if (isNode(child)) this.visit(child);
					if (this.visitor.cancelled) return;
				}
			}
		}

		if (node.content && isNode(node.content)) {
			this.visit(node.content);
		}

		for (const key in node) {
			const value = node[key];
			if (isNode(value)) this.visit(value);
		}
	}

	public walk(): void {
		this.visit(this.node);
	}
}
