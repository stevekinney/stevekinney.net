import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import { escapeSvelte, mdsvex } from 'mdsvex';
import rehypeSlug from 'rehype-slug';
import unwrapImages from 'rehype-unwrap-images';
import remarkGfm from 'remark-gfm';
import { bundledLanguages, createHighlighterCore } from 'shiki';

// Node.js path utilities
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Custom plugins
import { fixMarkdownUrls } from './plugins/remark-fix-urls.js';
import remarkEscapeComparators from './plugins/remark-escape-comparators.js';
import { processCallouts } from './plugins/svelte-compile-callouts.js';
import { processImages } from './plugins/svelte-enhance-images.js';
import { importTailwindPlayground } from './plugins/import-tailwind-playground.js';

// Define directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a singleton highlighter instance
let highlighterPromise = null;
async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createOnigurumaEngine } = await import('shiki/engine/oniguruma');

      // Dynamically import languages, handling special cases
      const langImports = await Promise.all(
        Object.keys(bundledLanguages).map(async (lang) => {
          try {
            // Handle special language names that need escaping
            const langName =
              lang === 'c++' ? 'cpp' : lang === 'c#' ? 'csharp' : lang === 'f#' ? 'fsharp' : lang;
            return await import(`shiki/langs/${langName}.mjs`);
          } catch {
            console.warn(`Failed to load language: ${lang}`);
            return null;
          }
        }),
      );

      return createHighlighterCore({
        themes: [await import('shiki/themes/night-owl.mjs')],
        langs: langImports.filter(Boolean),
        engine: createOnigurumaEngine(import('shiki/wasm')),
      });
    })();
  }
  return highlighterPromise;
}

/**
 * MDSvex configuration options
 * @type {import('mdsvex').MdsvexOptions}
 */
const mdsvexOptions = {
  extensions: ['.md'],

  // Process markdown content
  // Custom remark plugins (typed via casts to satisfy TS)
  remarkPlugins: [
    /** @type {any} */ (remarkEscapeComparators),
    /** @type {any} */ (fixMarkdownUrls),
    remarkGfm,
  ],
  rehypePlugins: [rehypeSlug, unwrapImages],

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

      const highlighter = await getHighlighter();
      const html = escapeSvelte(
        highlighter.codeToHtml(code, {
          lang,
          theme: 'night-owl',
        }),
      ).replace(/\stabindex="[^"]*"/g, '');

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

      return `<div class="${classes.join(' ')}" data-language="${lang}" data-metastring="${metastring}">${html}</div>`;
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
    /** @type {any} */ (
      processImages({
        // Reduce variants to speed up build
        widths: [480, 768],
        mainWidth: 800,
      })
    ),
    processCallouts(),
    importTailwindPlayground(),
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

    prerender: {
      // Be strict, but ignore only malformed multi-URL fetch attempts from srcset
      handleHttpError: ({ status, path, message }) => {
        if (status === 404 && path.startsWith('/_app/immutable/assets/') && path.includes(',')) {
          return; // skip this specific bad fetch; real 404s still throw
        }
        throw new Error(message);
      },
    },
  },
};

export default config;
