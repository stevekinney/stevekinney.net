import { parse, walk } from 'svelte/compiler';
import { camelCase } from 'change-case';
import MagicString from 'magic-string';
import { twMerge as merge } from 'tailwind-merge';

const classes = ['max-w-full', 'rounded-md', 'shadow-md'];

/**
 * @typedef {import('svelte/types/compiler/interfaces').Attribute} Attribute
 * @typedef {import('svelte/types/compiler/interfaces').Text} TextNode
 */

/**
 * A typedef for Svelte's ElementNode, simulating the structure.
 * Adjust properties as needed based on actual usage.
 *
 * @typedef {Object} ElementNode
 * @property {string} type - The type of the node (e.g., "Element").
 * @property {string} name - The tag name of the element (e.g., "div").
 * @property {Array<Attribute>} attributes - The attributes of the element.
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
						const src = getAttribute(node, 'src');
						if (!src) return;

						const srcValue = getAttributeValue(src);

						let url = decodeURIComponent(srcValue.data);
						if (url.startsWith('assets/')) url = `./${url}`;
						const id = '_' + camelCase(url);

						images.set(url, { id, url });

						if (isVideo(url)) {
							return formatVideo(s, node, id);
						}

						return formatImage(s, node, id, srcValue);
					}
				},
			});

			if (instance) {
				walk(instance, {
					enter(node) {
						if (node.type === 'Program') {
							const imports = Array.from(images.entries())
								.map(([url, { id }]) => {
									if (!url.endsWith('gif')) url += '?w=700&format=avif&withoutEnlargement';
									return `import ${id} from '${url}';`;
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

const isVideo = (url) => url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg');

/**
 * @param {ElementNode} node
 * @param {string} name
 * @returns {Attribute | undefined}
 **/
const getAttribute = (node, name) => node.attributes.find((attr) => attr.name === name);

/**
 * @param {Attribute} attr
 * @returns {TextNode | undefined}
 */
const getAttributeValue = (attr) => {
	if (attr.value.length === 0) return;
	const [value] = attr.value;
	if (value.type === 'Text') return value;
};

/**
 *
 * @param {MagicString} s
 * @param {Node & ElementNode} node
 * @param {TextNode} src
 * @param {string} id
 */
const formatImage = (s, node, id, src) => {
	s.update(src.start, src.end, `{${id}}`);

	const classAttr = getAttribute(node, 'class');

	if (classAttr) {
		const classValue = getAttributeValue(classAttr);
		s.update(classValue.start, classValue.end, merge(classValue.data, classes));
	} else {
		s.appendLeft(node.start + 4, ` class="${classes.join(' ')}"`);
	}
};

const formatVideo = (s, node, id) => {
	return s.update(
		node.start,
		node.end,
		`<video src={${id}} class="${classes.join(' ')}" controls><track kind="captions"></video>`,
	);
};
