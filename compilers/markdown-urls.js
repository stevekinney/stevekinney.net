import { visit } from 'unist-util-visit';

/**
 * @type {import('unified').Plugin}
 */
export const fixMarkdownUrls = () => {
	return (tree) => {
		let baseUrl = '';

		visit(tree, 'yaml', (/** @type import('mdast').YAML */ node) => {
			if (node.type !== 'yaml') return;
			const { value } = node;
			const match = value.match(/base: (.*)/);
			if (!match) return;
			const [, url] = match;
			baseUrl = url + '/';
		});

		visit(tree, 'link', (/** @type import('mdast').Link */ node) => {
			const { url } = node;
			node.url = baseUrl + url.replace(/\.md/, '');
		});
	};
};
