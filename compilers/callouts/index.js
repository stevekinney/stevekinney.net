import MagicString from 'magic-string';
import { parse, walk } from 'svelte/compiler';

import { parseCallout } from './parse-callout.js';
import { compileCallout } from './compile-callout.js';

/**
 * @typedef Callout
 * @property {string} title
 * @property {string} variant
 * @property {string | undefined} description
 * @property {boolean | undefined} foldable
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

			let hasCallouts = false;

			walk(html, {
				enter(node) {
					if (node.type === 'Element' && node.name === 'blockquote') {
						const start = node.start;
						const end = node.end;

						const details = parseCallout(content.substring(start, end));

						if (!details) return;
						hasCallouts = true;

						s.overwrite(start, end, compileCallout(details));
					}
				},
			});

			if (hasCallouts) {
				if (instance) {
					walk(instance, {
						enter(node) {
							if (node.type === 'Program') {
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
