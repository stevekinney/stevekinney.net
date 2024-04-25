/**
 * @typedef {import('.').Callout} Callout
 */

const pattern = /\[!\s*(\w+)\s*\]([+-]?)\s+([^<>\n]+)/i;

/**
 * Parse callout text into an object.
 * @param {string} markup
 * @returns { | null}
 */
export function parseCallout(markup) {
	const match = markup.match(pattern);
	if (!match) return null;

	markup = markup.replace('<blockquote>', '').replace('</blockquote>', '');

	let title = match[3].trim();
	let variant = match[1].toLowerCase();
	let foldable = Boolean(match[2] === '+' || match[2] === '-');

	let description = markup
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
