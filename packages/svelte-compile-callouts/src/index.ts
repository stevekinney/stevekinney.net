import { parse, type PreprocessorGroup } from 'svelte/compiler';
import MagicString from 'magic-string';

import { parseCallout } from './parse-callout.js';
import { compileCallout } from './compile-callout.js';

import { walk } from 'svelte-tree-walker';

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

			for (const node of walk(html)) {
				if ('name' in node && node.name === 'blockquote') {
					const start = node.start;
					const end = node.end;

					const callout = parseCallout(content.substring(start, end));

					if (callout) {
						hasCallouts = true;
						s.overwrite(start, end, compileCallout(callout));
					}
				}
			}

			// If we found any callouts, we need to import the `Callout` component.
			if (hasCallouts) {
				if (instance) {
					for (const node of walk(instance)) {
						if (node.type === 'Program') {
							s.appendLeft(node.end, `\n\timport Callout from '$lib/components/callout';\n`);
							break;
						}
					}
				}
			}

			return {
				code: s.toString(),
				map: s.generateMap({ hires: true }),
			};
		},
	};
};
