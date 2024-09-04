import { visit } from 'unist-util-visit';

/**
 * @type {import('unified').Plugin}
 */
export const fixMarkdownUrls = () => {
	return (tree) => {
		let baseUrl = '';

		// Find the base URL in the YAML frontmatter.
		visit(tree, 'yaml', (/** @type import('mdast').YAML */ node) => {
			if (node.type !== 'yaml') return;

			const { value } = node;
			const match = value.match(/base: (.*)/);

			if (!match) return;

			const [, url] = match;

			baseUrl = url + '/';
		});

		// Fix the URLs in the Markdown files by removing the `.md` extension.
		visit(tree, 'link', (/** @type import('mdast').Link */ node) => {
			const { url } = node;
			node.url = baseUrl + url.replace(/\.md/, '');
		});
	};
};
