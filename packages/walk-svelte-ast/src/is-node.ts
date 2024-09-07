import type { TemplateNode } from 'svelte/types/compiler/interfaces';

export const isNode = (node: unknown): node is TemplateNode => {
	if (typeof node !== 'object' || node === null || Array.isArray(node)) return false;

	const n = node as Partial<TemplateNode>;
	return typeof n.type === 'string' && typeof n.start === 'number' && typeof n.end === 'number';
};
