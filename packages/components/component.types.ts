import type { HTMLAttributes, SvelteHTMLElements } from 'svelte/elements';

type ElementName = keyof SvelteHTMLElements;

export type BaseAttributes = HTMLAttributes<HTMLElement>;

export type ExtendElement<
  Element extends ElementName | HTMLAttributes<HTMLElement> = HTMLAttributes<HTMLElement>,
  Props extends object = Record<never, never>,
> = Element extends ElementName
  ? Omit<SvelteHTMLElements[Element], keyof Props> & Props
  : Omit<Element, keyof Props> & Props;
