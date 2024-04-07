import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import { mdsvex, escapeSvelte } from 'mdsvex';
import remarkUnwrapImages from 'remark-unwrap-images';
import rehypeSlug from 'rehype-slug';
import remarkObsidian from 'remark-obsidian';
import { codeToHtml, bundledLanguages } from 'shiki';
import { visit } from 'unist-util-visit';
import { parse, walk } from 'svelte/compiler';
import { camelCase } from 'change-case';
import MagicString from 'magic-string';
import { twMerge as merge } from 'tailwind-merge';

/**
 * @type {import('unified').Plugin}
 */
const fixMarkdownUrls = () => {
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

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	extensions: ['.md'],
	remarkPlugins: [remarkUnwrapImages, remarkObsidian, fixMarkdownUrls],
	// @ts-expect-error - rehypeSlug is not in the types
	rehypePlugins: [rehypeSlug],
	layout: {
		_: './src/lib/markdown/base.svelte',
		page: './src/lib/markdown/page.svelte',
		contents: './src/lib/markdown/contents/contents.svelte',
	},
	highlight: {
		highlighter: async (code, lang = 'text') => {
			if (!bundledLanguages[lang]) return code;
			const html = escapeSvelte(await codeToHtml(code, { lang, theme: 'night-owl' }));
			return `{@html \`${html}\` }`;
		},
	},
};

/**
 * @param {object} options
 * @param {string} options.content
 * @param {string} options.filename
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

			/** @param {BaseNode} node
			 * @returns {node is ElementNode}
			 */
			const isElement = (node) => node.type === 'Element';

			walk(html, {
				enter(node) {
					if (isElement(node) && node.name === 'img') {
						const src = node.attributes.find((attr) => attr.name === 'src');
						if (!src) return;

						const [srcValue] = src.value;
						const url = decodeURIComponent(srcValue.data);
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

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [vitePreprocess(), mdsvex(mdsvexOptions), processImages()],
	kit: {
		adapter: process.env.VERCEL ? vercelAdapter() : staticAdapter({ strict: false }),
		alias: {
			'@/*': 'src/*',
			'$assets/*': 'src/assets/*',
			'$courses/*': 'src/courses/*',
		},
	},
};

export default config;
