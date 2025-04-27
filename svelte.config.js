import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import rehypeMermaid from '@beoe/rehype-mermaid';
import { escapeSvelte, mdsvex } from 'mdsvex';
import slug from 'rehype-slug';
import unwrapImages from 'rehype-unwrap-images';
import gfm from 'remark-gfm';
import { bundledLanguages, codeToHtml } from 'shiki';

import { fixMarkdownUrls } from './plugins/remark-fix-urls.js';
import { processCallouts } from './plugins/svelte-compile-callouts.js';
import { processImages } from './plugins/svelte-enhance-images.js';

const getAdapter = () => {
  if (process.env.VERCEL) {
    console.log('Using Vercel adapter…');
    return vercelAdapter();
  }

  console.log('Using static adapter…');
  return staticAdapter({
    strict: false,
  });
};

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
  extensions: ['.md'],
  remarkPlugins: [unwrapImages, fixMarkdownUrls, gfm],
  rehypePlugins: [slug, rehypeMermaid],
  layout: {
    _: 'src/lib/markdown/base.svelte',
    page: 'src/lib/markdown/page.svelte',
    contents: 'src/lib/markdown/components/contents.svelte',
  },
  highlight: {
    highlighter: async (code, lang = 'text') => {
      if (!lang) return code;
      if (!(lang in bundledLanguages)) return code;
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
    adapter: getAdapter(),
    alias: {
      '$lib/*': 'src/lib/*',
      '$assets/*': 'src/assets/*',
      '$courses/*': 'content/courses/*',
      'content/*': 'content/*',
      $merge: 'src/lib/merge.ts',
    },
  },
};

export default config;
