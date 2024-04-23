/**
 * @typedef {import('.').Callout} Callout
 */

const pattern = /\[!\s*(\w+)\s*\]([+-]?)/i; // Capture the variant and foldability only.

/**
 * Parse callout text into an object.
 * @param {string} markup
 * @returns {Callout | null}
 */
export function parseCallout(markup) {
	// Strip blockquote tags and trim whitespace.
	markup = markup.replace(/<\/?blockquote>/g, '').trim();

	// Match the variant and foldability at the start.
	const headerMatch = markup.match(pattern);
	if (!headerMatch) return null;

	let variant = headerMatch[1].toLowerCase();
	let foldable = headerMatch[2] === '+' || headerMatch[2] === '-';

	// Remove the detected header to process the rest.
	let contentStart = markup.indexOf(headerMatch[0]) + headerMatch[0].length;
	let content = markup.substring(contentStart).trim();

	// Isolate the title correctly, taking care not to capture trailing HTML tags.
	let titleEndIndex = content.indexOf('\n');
	if (titleEndIndex === -1) {
		// If no new line, it could be single line without description.
		titleEndIndex = content.length;
	}
	let title = content
		.substring(0, titleEndIndex)
		.replace(/<\/?p>/g, '')
		.trim();

	// Assume everything after the first newline character is description, if present.
	let description = content.substring(titleEndIndex).trim();
	if (description) {
		if (!description.startsWith('<p>')) {
			description = '<p>' + description;
		}
		if (!description.endsWith('</p>')) {
			description += '</p>';
		}
		description = description.replace(/<\/p>\s*<p>/g, '</p><p>'); // Normalize paragraph breaks
	} else {
		description = undefined;
	}

	return {
		title,
		variant,
		description,
		foldable,
	};
}
