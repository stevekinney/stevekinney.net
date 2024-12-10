/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Icon as IconType } from 'lucide-svelte';
import type { Snippet } from 'svelte';
import type { HTMLAttributes, SvelteHTMLElements } from 'svelte/elements';

export type ElementName = keyof SvelteHTMLElements;

export type WithIcon = {
	icon?: typeof IconType;
};

export type WithChildren = {
	children: Snippet;
};

export type BaseAttributes = HTMLAttributes<HTMLElement>;

export type ExtendElement<
	Element extends ElementName | HTMLAttributes<HTMLElement> = HTMLAttributes<HTMLElement>,
	Props extends Record<string, any> = {},
> = Element extends ElementName
	? Omit<SvelteHTMLElements[Element], keyof Props> & Props
	: Omit<Element, keyof Props> & Props;
