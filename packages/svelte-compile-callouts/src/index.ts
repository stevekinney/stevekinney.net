import MagicString from 'magic-string';
import { parse, type PreprocessorGroup } from 'svelte/compiler';

import { parseCallout } from './parse-callout.js';
import { compileCallout } from './compile-callout.js';

import { walk } from 'walk-svelte-ast';

/**
 * Turn Obsidian callouts into Svelte components.
 */
export const processCallouts = (): PreprocessorGroup => {
	return {
		name: 'markdown-process-callouts',
		markup: ({ content, filename }) => {
			if (!filename?.endsWith('.md')) return;
			const { instance, html } = parse(content, { filename });
			const s = new MagicString(content);

			/**
			 * Did we find any callouts in the Markdown file?
			 */
			let hasCallouts = false;
			let calloutImported = false;

			walk(html, {
				enter(node) {
					if (node.name === 'blockquote') {
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
								if (calloutImported) return false;
								// Add the import statement to the `<script/>` section.
								s.appendLeft(node.end, `\n\timport Callout from '$lib/components/callout';\n`);
								calloutImported = true;
								// Stop walking.
								return false;
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
