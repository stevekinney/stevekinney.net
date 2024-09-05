import type { Callout } from './callout';

/**
 * A regular expression that *should* match callouts in Markdown.
 */
const pattern = /\[!\s*(\w+)\s*\]([+-]?)\s+([^<>\n]+)/i;

/**
 * Parse callout text into an object.
 * @param {string} markup A string that may or may not be a callout.
 * @returns {Callout | null} The metadata of the callout or `null`, if it's not a callout.
 */
export function parseCallout(markup: string): Callout | null {
	const match = markup.match(pattern);
	if (!match) return null;

	/* Remove the HTML tags. */
	markup = markup.replace('<blockquote>', '').replace('</blockquote>', '');

	const title = match[3].trim();
	const variant = match[1].toLowerCase();
	const foldable = Boolean(match[2] === '+' || match[2] === '-');

	let description: string | undefined = markup
		.replace(pattern, '')
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
