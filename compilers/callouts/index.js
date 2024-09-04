import MagicString from 'magic-string';
import { parse, walk } from 'svelte/compiler';

import { parseCallout } from './parse-callout.js';
import { compileCallout } from './compile-callout.js';

/**
 * @typedef Callout Metadata for a callout.
 * @property {string} title The title of the callout.
 * @property {string} variant The variant of the callout.
 * @property {string | undefined} description The description of the callout.
 * @property {boolean | undefined} foldable Whether the callout is foldable.
 */

/**
 * Turn Obsidian callouts into Svelte components.
 * @returns {import("svelte/compiler").PreprocessorGroup}
 */
export const processCallouts = () => {
	return {
		name: 'markdown-process-callouts',
		/**
		 * @param {object} options
		 * @param {string} options.content
		 * @param {string} options.filename
		 */
		markup: ({ content, filename }) => {
			if (!filename.endsWith('.md')) return;
			const { instance, html } = parse(content, { filename });
			const s = new MagicString(content);

			/** Did we find any callouts in the Markdown file? */
			let hasCallouts = false;

			walk(html, {
				enter(node) {
					if (node.type === 'Element' && node.name === 'blockquote') {
						const start = node.start;
						const end = node.end;

						const callout = parseCallout(content.substring(start, end));

						// If it's not a callout, bail.
						if (!callout) return;

						// We found a callout!
						hasCallouts = true;

						// Replace the callout with a component.
						s.overwrite(start, end, compileCallout(callout));
					}
				},
			});

			// If we found any callouts, we need to import the `Callout` component.
			if (hasCallouts) {
				if (instance) {
					walk(instance, {
						enter(node) {
							if (node.type === 'Program') {
								// Add the import statement at the top of the file.
								s.appendLeft(node.end, `\n\timport Callout from '$lib/components/callout';\n`);
							}
						},
					});
				}
			}

			return {
				code: s.toString(),
				map: s.generateMap({ hires: true }),
			};
		},
	};
};
