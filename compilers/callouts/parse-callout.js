/**
 * @typedef {{ title: string | undefined, variant: string | undefined, description: string | undefined }} Callout
 */

import { match } from 'assert';

const regexPattern = /\[!\s*(\w+)\s*\]([+-]?)\s+(\w+)/i;
/**
 * Parse callout text into an object.
 * @param {string} markup
 * @returns {Callout | null}
 */
export function parseCallout(markup) {
	const match = markup.match(regexPattern);
	if (!match) return null;

	markup = markup.replace('<blockquote>', '').replace('</blockquote>', '');

	let title = match[3].trim();
	let variant = match[1].toLowerCase();
	let foldable = Boolean(match[2] === '+' || match[2] === '-');

	let description = markup
		.replace(regexPattern, '')
		.replace(/<p>\s+/, '<p>')
		.trim();

	if (description === '<p></p>') {
		description = undefined;
	}

	return {
		title,
		variant,
		description,
		foldable,
	};
}
