import { parse, type PreprocessorGroup } from 'svelte/compiler';
import { camelCase } from 'change-case';
import MagicString from 'magic-string';
import { twMerge as merge } from 'tailwind-merge';

import { walk } from 'svelte-tree-walker';
import { Attribute, TemplateNode, Text } from 'svelte/types/compiler/interfaces';

const classes = ['max-w-full', 'rounded-md', 'shadow-md'];

/**
 * Add image optimization to the Markdown content.
 */
export const processImages = (): PreprocessorGroup => {
	return {
		name: 'markdown-image-optimization',
		markup: ({ content, filename }) => {
			if (!filename?.endsWith('.md')) return;

			// Parse the content with the Svelte Compiler and create a MagicString instance.
			const { instance, html } = parse(content, { filename });
			const s = new MagicString(content);

			const images = new Map<string, { url: string; id: string }>();

			// Walk the HTML AST and find all the image elements.
			for (const node of walk(html)) {
				if ('name' in node && node.name === 'img') {
					const src = getAttribute(node, 'src');

					if (!src) continue;

					const srcValue = getAttributeValue(src);

					if (!srcValue) continue;

					let url = decodeURIComponent(srcValue.data);

					if (url.startsWith('assets/')) url = `./${url}`;

					const id = '_' + camelCase(url);

					images.set(url, { id, url });

					if (isVideo(url)) {
						formatVideo(s, node, id);
						continue;
					}

					formatImage(s, node, id, srcValue);
				}
			}

			// Add the correct import statements at the top of the file.
			if (instance) {
				for (const node of walk(instance)) {
					if (node.type === 'Program') {
						const imports = Array.from(images.entries())
							.map(([url, { id }]) => {
								if (!url.endsWith('gif')) url += '?w=700&format=avif&withoutEnlargement';
								return `import ${id} from '${url}';`;
							})
							.join('\n');

						s.appendLeft(node.end, imports);
						break;
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

const isVideo = (url: string) =>
	url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg');

/**
 * Gets an attribute by name.
 **/
const getAttribute = (node: TemplateNode, name: string): Attribute | undefined =>
	node.attributes.find((attr: Attribute) => attr.name === name);

/**
 * Gets the value of an attribute.
 */
const getAttributeValue = (attr: Attribute): Text | undefined => {
	if (attr.value.length === 0) return;
	const [value] = attr.value;
	if (value.type === 'Text') return value;
};

/**
 * Adds the imported image refernce to as the image `src`.
 * Adds the Tailwind classes to the element.
 */
const formatImage = (s: MagicString, node: TemplateNode, id: string, src: Text) => {
	s.update(src.start, src.end, `{${id}}`);

	const classAttr = getAttribute(node, 'class');

	if (classAttr) {
		const classValue = getAttributeValue(classAttr);
		if (!classValue) return;
		s.update(classValue.start, classValue.end, merge(classValue.data, classes));
	} else {
		// Add the class attributes right after `<img`.
		s.appendLeft(node.start + 4, ` class="${classes.join(' ')}"`);
	}
};

const formatVideo = (s: MagicString, node: TemplateNode, id: string) => {
	return s.update(
		node.start,
		node.end,
		`<video src={${id}} class="${classes.join(' ')}" controls><track kind="captions"></video>`,
	);
};
