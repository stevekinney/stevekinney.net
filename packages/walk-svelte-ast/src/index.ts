import type { Attribute, TemplateNode, Text } from 'svelte/types/compiler/interfaces';

type Node = TemplateNode;

export const isNode = (node: unknown): node is Node => {
	if (typeof node !== 'object' || !node) return false;
	if (Array.isArray(node)) return false;
	if (!('type' in node)) return false;
	if (!('start' in node)) return false;
	if (!('end' in node)) return false;
	return true;
};

export const walk = <T extends TemplateNode>(
	node: T,
	visitor: <U extends TemplateNode>(node: U) => void,
): void => {
	// Visit the current node
	visitor(node);

	// Recursively walk through child nodes if they exist
	if (node.children && Array.isArray(node.children)) {
		for (const child of node.children) {
			if (isNode(child)) walk(child, visitor);
		}
	}

	// Walk through other possible node-specific child properties
	for (const key in node) {
		if (isNode(node[key])) {
			walk(node[key], visitor);
		}
	}
};

export { type Attribute, type Node, type Text };
