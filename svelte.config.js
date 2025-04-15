import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import { mdsvex, escapeSvelte } from 'mdsvex';
import unwrapImages from 'rehype-unwrap-images';
import slug from 'rehype-slug';
import gfm from 'remark-gfm';
import { codeToHtml, bundledLanguages } from 'shiki';

import { processCallouts } from './plugins/svelte-compile-callouts.js';
import { processImages } from './plugins/svelte-enhance-images.js';
import { fixMarkdownUrls } from './plugins/remark-fix-urls.js';

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
  extensions: ['.md'],
  remarkPlugins: [unwrapImages, fixMarkdownUrls, gfm],
  rehypePlugins: [slug],
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

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md'],
  preprocess: [vitePreprocess(), mdsvex(mdsvexOptions), processImages(), processCallouts()],
  kit: {
    adapter: process.env.VERCEL ? vercelAdapter() : staticAdapter({ strict: false }),
    alias: {
      '@/*': 'src/*',
      '$lib/*': 'src/lib/*',
      '$assets/*': 'src/assets/*',
      '$courses/*': 'content/courses/*',
      'content/*': 'content/*',
      $merge: 'src/lib/merge.ts',
    },
  },
};

export default config;
