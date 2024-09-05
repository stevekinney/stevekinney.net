import type { Callout } from './callout';

/**
 * Takes a callout object and returns the markup for a Svelte compoonent.
 * @param  callout
 * @returns The markup for a Svelte component.
 */
export const compileCallout = (callout: Callout): string => {
	const { title, variant, description, foldable } = callout;

	const attributes = [];
	if (title) attributes.push(`title="${title}"`);
	if (variant) attributes.push(`variant="${variant}"`);
	if (foldable) attributes.push('foldable');

	if (description) return `<Callout ${attributes.join(' ')}>${description}</Callout>`;
	return `<Callout ${attributes.join(' ')} />`;
};
