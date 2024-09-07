import type { TemplateNode } from 'svelte/types/compiler/interfaces';

import { Walker, type Visitor } from './walker';

export function walk<T extends TemplateNode>(node: T, visitor: Visitor): void {
	const walker = new Walker(node, visitor);
	walker.walk();
}

export type * from 'svelte/types/compiler/interfaces';
export type { Visitor };
