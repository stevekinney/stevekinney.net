import { parse, walk } from 'svelte/compiler';
import { camelCase } from 'change-case';
import MagicString from 'magic-string';
import { twMerge as merge } from 'tailwind-merge';

/**
 * A typedef for Svelte's ElementNode, simulating the structure.
 * Adjust properties as needed based on actual usage.
 *
 * @typedef {Object} ElementNode
 * @property {string} type - The type of the node (e.g., "Element").
 * @property {string} name - The tag name of the element (e.g., "div").
 * @property {Array<Object>} attributes - The attributes of the element.
 * @property {Array<(ElementNode|TextNode)>} children - The child nodes of the element.
 */

export const processImages = () => {
	return {
		name: 'markdown-image-optimization',
		/**
		 * @param {object} options
		 * @param {string} options.content
		 * @param {string} options.filename
		 */
		markup: ({ content, filename }) => {
			if (!filename.endsWith('.md')) return;
			const { instance, html } = parse(content, { filename });
			const s = new MagicString(content);

			/** @type {Map<string, { url: string, id: string }>} */
			const images = new Map();

			/**
			 * @param {} node
			 * @returns {node is ElementNode}
			 */
			const isElement = (node) => node.type === 'Element';

			walk(html, {
				enter(node) {
					if (isElement(node) && node.name === 'img') {
						const src = node.attributes.find((attr) => attr.name === 'src');
						if (!src) return;

						const [srcValue] = src.value;
						let url = decodeURIComponent(srcValue.data);
						if (url.startsWith('assets/')) url = `./${url}`;
						const id = '_' + camelCase(url);

						images.set(url, { id, url });
						s.update(srcValue.start, srcValue.end, `{${id}}`);

						const classes = ['max-w-full', 'rounded-md', 'shadow-md'];
						const classAttr = node.attributes.find((attr) => attr.name === 'class');

						if (classAttr) {
							const [classValue] = classAttr.value;
							s.update(classValue.start, classValue.end, merge(classValue.data, classes));
						} else {
							s.appendLeft(node.start + 4, ` class="${classes.join(' ')}"`);
						}
					}
				},
			});

			if (instance) {
				walk(instance, {
					enter(node) {
						if (node.type === 'Program') {
							const imports = Array.from(images.entries())
								.map(([url, { id }]) => {
									return `\timport ${id} from '${url}';`;
								})
								.join('\n');
							s.appendLeft(node.end, imports);
						}
					},
				});
			}

			return {
				code: s.toString(),
				map: s.generateMap({ hires: true }),
			};
		},
	};
};
