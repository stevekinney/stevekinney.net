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

// Define directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { parse } from 'svelte/compiler';
import { walk } from 'svelte-tree-walker';
import MagicString from 'magic-string';

/**
 * Creates a preprocessor to handle <tailwind-example> components in markdown files.
 * @returns {import('svelte/compiler').PreprocessorGroup}
 */
const processTailwindExamples = () => {
  return {
    name: 'tailwind-example',
    markup: ({ content, filename }) => {
      if (!filename?.endsWith('.md')) return;

      // Parse the content with the Svelte Compiler
      const { instance, html } = parse(content, { filename });
      const s = new MagicString(content);

      // Find all <tailwind-example> components and process them
      for (const node of walk(html)) {
        if ('name' in node && node.name === 'TailwindExample') {
          s.appendRight(
            instance.content.end,
            `\nimport TailwindExample from '$lib/components/tailwind-example.svelte';\n`,
          );
          break;
        }
      }

      return { code: s.toString(), map: s.generateMap({ hires: true }) };
    },
  };
};

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
    contents: join(__dirname, './src/lib/markdown/components/contents.svelte'),
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

      const codeBlock = `<div class="${classes.join(' ')}" data-language="${lang}" data-metastring="${metastring}">{@html \`${html}\` }</div>`;

      if (metastring === 'tailwind') {
        const encoded = Buffer.from(
          `<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><title>Tailwind Example</title><link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css'></head><body class='bg-white dark:bg-slate-950 p-4'>${code}</body></html>`,
        ).toString('base64');
        return `<TailwindExample code="data:text/html;base64,${encoded}">${codeBlock}</TailwindExample>`;
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
