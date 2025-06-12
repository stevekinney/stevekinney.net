import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import { escapeSvelte, mdsvex } from 'mdsvex';
import rehypeSlug from 'rehype-slug';
import unwrapImages from 'rehype-unwrap-images';
import remarkGfm from 'remark-gfm';
import { bundledLanguages, codeToHtml } from 'shiki';

// Node.js path utilities
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Custom plugins
import { fixMarkdownUrls } from './plugins/remark-fix-urls.js';
import { processCallouts } from './plugins/svelte-compile-callouts.js';
import { processImages } from './plugins/svelte-enhance-images.js';
import {
  processTailwindExamples,
  toTailwindPlayground,
} from './plugins/tailwind-playground/index.js';

// Define directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * MDSvex configuration options
 * @type {import('mdsvex').MdsvexOptions}
 */
const mdsvexOptions = {
  extensions: ['.md'],

  // Process markdown content
  remarkPlugins: [unwrapImages, fixMarkdownUrls, remarkGfm],
  rehypePlugins: [rehypeSlug],

  // Layout templates for markdown content
  layout: {
    _: join(__dirname, './src/lib/markdown/base.svelte'),
    page: join(__dirname, './src/lib/markdown/page.svelte'),
    contents: join(__dirname, './src/lib/markdown/contents.svelte'),
  },

  highlight: {
    highlighter: async (code, lang = 'text', metastring) => {
      if (!lang) return code;
      if (!(lang in bundledLanguages)) return code;

      const html = escapeSvelte(
        await codeToHtml(code, {
          lang,
          theme: 'night-owl',
        }),
      );

      const classes = [
        'bg-[#011627]',
        'not-prose',
        'overflow-x-scroll',
        'rounded-md',
        'border-2',
        'border-slate-800',
        'p-4',
        'not-last:mb-4',
      ];

      const codeBlock = `<div class="${classes.join(' ')}" data-language="${lang}" data-metastring="${metastring}">${html}</div>`;

      if (metastring === 'tailwind') {
        return toTailwindPlayground(code, codeBlock);
      }

      return codeBlock;
    },
  },
};

/**
 * SvelteKit configuration
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
  // File extensions to process
  extensions: ['.svelte', '.md'],

  // Preprocessing steps for content
  preprocess: [
    vitePreprocess(),
    mdsvex(mdsvexOptions),
    processImages(),
    processCallouts(),
    processTailwindExamples(),
  ],

  kit: {
    // Choose adapter based on deployment target
    adapter: process.env.VERCEL
      ? vercelAdapter()
      : staticAdapter({
          strict: false,
          fallback: '404.html',
        }),

    // Path aliases for imports
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
