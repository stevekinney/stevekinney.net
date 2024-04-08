/**
 * @typedef {{ title: string | undefined, variant: string | undefined, description: string | undefined }} Callout
 */

import { match } from 'assert';

const regexPattern =
	/\[!\s*(\w+)\s*]([+-]?)\s*([^<\n]+)(?:\n|<p>)?([\s\S]*?)(?=(<\/p>\s*<\/blockquote>|$))/;
/**
 * Parse callout text into an object.
 * @param {string} markup
 * @returns {Callout | null}
 */
export function parseCallout(markup) {
	// Adjust the regex pattern to make handling of whitespace and case insensitivity
	const matches = markup.match(regexPattern);

	if (!matches) {
		console.error('No matches found in the provided markup.');
		return null;
	}

	// Normalize the variant to lowercase
	const variant = matches[1].toLowerCase();
	const foldable = matches[2] === '+' || matches[2] === '-';
	const title = matches[3].trim();

	// The description is optional; it may not be present
	const description = matches[4] ? matches[4].trim() : undefined;

	return {
		title,
		variant,
		description,
		foldable,
	};
}
