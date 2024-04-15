/**
 * Takes a callout object and returns HTML.
 * @param {import('.').Callout} callout
 */
export const compileCallout = (callout) => {
	const { title, variant, description, foldable } = callout;

	const attributes = [];
	if (title) attributes.push(`title="${title}"`);
	if (variant) attributes.push(`variant="${variant}"`);
	if (foldable) attributes.push('foldable');

	if (description) return `<Callout ${attributes.join(' ')}>${description}</Callout>`;
	return `<Callout ${attributes.join(' ')} />`;
};
