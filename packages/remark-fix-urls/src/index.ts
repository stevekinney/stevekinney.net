import { visit } from 'unist-util-visit';
import { parse } from 'yaml';

import type { Plugin } from 'unified';
import type { Yaml, Link } from 'mdast';

/**
 * A remark plugin to fix the URLs in Markdown files.
 */
export const fixMarkdownUrls: Plugin = () => {
	return (tree) => {
		let baseUrl = '';

		// Find the base URL in the YAML frontmatter.
		visit(tree, 'yaml', (node: Yaml) => {
			const { base } = parse(node.value);

			if (base) {
				baseUrl = `${base}/`;
			}
		});

		// Fix the URLs in the Markdown files by removing the `.md` extension.
		visit(tree, 'link', (node: Link) => {
			const { url } = node;
			node.url = baseUrl + url.replace(/\.md/, '');
		});
	};
};
