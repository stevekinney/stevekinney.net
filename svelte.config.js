import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import remarkUnwrapImages from 'remark-unwrap-images';
import rehypeSlug from 'rehype-slug';
import remarkObsidian from 'remark-obsidian';
import relativeImages from 'mdsvex-relative-images';

import { mdsvex, escapeSvelte } from 'mdsvex';
import shiki from 'shiki';
import { visit } from 'unist-util-visit';

const fixMarkdownUrls = () => {
	/**
	 * @param {import('mdast').Root} tree
	 *   Tree.
	 * @returns {undefined}
	 *   Nothing.
	 */
	return (tree) => {
		visit(tree, 'link', (node) => {
			const { url } = node;
			node.url = url.replace(/\.md/, '');
		});
	};
};

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	extensions: ['.md'],
	remarkPlugins: [remarkUnwrapImages, remarkObsidian, fixMarkdownUrls, relativeImages],
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

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [vitePreprocess(), mdsvex(mdsvexOptions)],
	kit: {
		adapter: process.env.VERCEL ? vercelAdapter() : staticAdapter({ strict: false }),
		alias: {
			'@/*': 'src/*',
			'$assets/*': 'src/assets/*',
		},
	},
};

export default config;
