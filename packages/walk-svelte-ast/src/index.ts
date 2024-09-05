import type { TemplateNode, Attribute, Text } from 'svelte/types/compiler/interfaces';

type Node = TemplateNode;
type Visitor = <T extends Node>(node: T) => void;

export const isNode = (node: unknown): node is Node => {
	if (typeof node !== 'object' || !node) return false;
	if (Array.isArray(node)) return false;

	if (!('type' in node)) return false;
	if (!('start' in node)) return false;
	if (!('end' in node)) return false;
	if (!('children' in node)) return false;

	if (typeof node.type !== 'string') return false;
	if (typeof node.start !== 'number') return false;
	if (typeof node.end !== 'number') return false;
	if (!Array.isArray(node.children)) return false;

	return true;
};

export function walk<T extends Node>(node: T, enter: Visitor, exit?: Visitor): void {
	enter(node);

	// Recursively walk through child nodes if they exist
	if (node.children && Array.isArray(node.children)) {
		for (const child of node.children) {
			if (isNode(child)) walk(child, enter);
		}
	}

	// Walk through other possible node-specific child properties
	for (const key in node) {
		if (isNode(node[key])) {
			walk(node[key], enter);
		}
	}

	if (exit) exit(node);
}

export { type Node, type Attribute, type Visitor, type Text };
