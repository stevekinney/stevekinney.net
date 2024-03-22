import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import { mdsvex, escapeSvelte } from 'mdsvex';
import remarkUnwrapImages from 'remark-unwrap-images';
import rehypeSlug from 'rehype-slug';
import remarkObsidian from 'remark-obsidian';
import shiki from 'shiki';
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
		visit(tree, 'link', (/** @type import('mdast').Link */ node) => {
			const { url } = node;
			node.url = url.replace(/\.md/, '');
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
	},
	highlight: {
		highlighter: async (code, lang = 'text') => {
			const highlighter = await shiki.getHighlighter({ theme: 'css-variables' });
			const html = escapeSvelte(highlighter.codeToHtml(code, { lang }));
			return `{@html \`${html}\` }`;
		},
	},
};

/**
 * @param {object} options
 * @param {string} options.content
 * @param {string} options.filename
 */
export const processMarkdown = () => {
	return {
		name: 'markdown-image-optimization',
		/**
		 * @param {object} options
		 * @param {string} options.content
		 * @param {string} options.filename
		 */
		markup: ({ content, filename }) => {
			if (!filename.endsWith('.md')) return;
			const { instance, html } = parse(content);
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

						const classes = [
							'max-w-full',
							'rounded-md',
							'shadow-md',
							'border-2',
							'border-slate-300',
						];

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
									const location = url.endsWith('.gif') ? url : `${url}?w=768`;
									return `import ${id} from '${location}';`;
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
	preprocess: [vitePreprocess(), mdsvex(mdsvexOptions), processMarkdown()],
	kit: {
		adapter: process.env.VERCEL ? vercelAdapter() : staticAdapter({ strict: false }),
		alias: {
			'@/*': 'src/*',
			'$assets/*': 'src/assets/*',
		},
	},
};

export default config;
