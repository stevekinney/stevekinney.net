import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import remarkCallouts from '@stevekinney/plugins/remark-callouts';
import remarkEscapeComparators from '@stevekinney/plugins/remark-escape-comparators';
import { fixMarkdownUrls } from '@stevekinney/plugins/remark-fix-urls';
import remarkTailwindPlayground from '@stevekinney/plugins/remark-tailwind-playground';
import rehypeEnhanceImages from '@stevekinney/plugins/rehype-enhance-images';
import { extractAnnotations, injectAnnotations } from './src/lib/code-annotations.js';

import { escapeSvelte, mdsvex } from 'mdsvex';
import rehypeSlug from 'rehype-slug';
import unwrapImages from 'rehype-unwrap-images';
import remarkGfm from 'remark-gfm';
import { bundledLanguages, codeToHtml } from 'shiki';
import { transformerMetaHighlight } from '@shikijs/transformers';

// Node.js path utilities
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Determine site URL for prerendering (used in Open Graph meta tags)
const siteUrl =
  process.env.PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:4444');

// Define directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// No in-memory highlight cache — each code block is processed exactly once
// during build. Caching just accumulates memory that persists into the adapter phase.

/**
 * Extract title="..." from the metastring.
 * @param {string | null | undefined} metastring
 * @returns {{ title: string | null, remaining: string }}
 */
function parseTitle(metastring) {
  if (!metastring) return { title: null, remaining: '' };
  const match = metastring.match(/title="([^"]+)"/);
  const title = match ? match[1] : null;
  const remaining = metastring.replace(/title="[^"]+"\s*/, '').trim();
  return { title, remaining };
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
    /** @type {any} */ ([fixMarkdownUrls, ['../../writing', '../../courses']]),
    remarkGfm,
    remarkCallouts,
    remarkTailwindPlayground,
  ],
  rehypePlugins: [
    rehypeSlug,
    unwrapImages,
    /** @type {any} */ ([
      rehypeEnhanceImages,
      {
        sizes: '(min-width: 1280px) 800px, (min-width: 768px) 80vw, 100vw',
        firstImagePriority: true,
        classes: ['max-w-full'],
      },
    ]),
  ],

  // Layout templates for markdown content
  layout: {
    _: join(__dirname, './src/lib/markdown/base.svelte'),
    page: join(__dirname, './src/lib/markdown/page.svelte'),
  },

  highlight: {
    highlighter: async (code, lang = 'text', metastring) => {
      if (!lang) lang = 'text';

      // Mermaid blocks are rendered client-side as diagrams, not syntax-highlighted.
      // HTML-escape < and > so Svelte's compiler doesn't treat them as elements.
      // The client-side renderer reads via textContent, which decodes entities automatically.
      if (lang === 'mermaid') {
        const escaped = escapeSvelte(code.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        return `<div data-mermaid class="not-prose overflow-x-auto rounded-md border-2 border-slate-800 bg-[#011627] p-4 not-last:mb-4"><pre class="mermaid-source" style="margin:0;color:#d6deeb;white-space:pre-wrap">${escaped}</pre></div>`;
      }

      const { title, remaining: remainingMeta } = parseTitle(metastring);
      const { cleanedCode, annotations } = extractAnnotations(code);

      const baseClasses = [
        'bg-[#011627]',
        'not-prose',
        'rounded-md',
        'border-2',
        'border-slate-800',
        'not-last:mb-4',
      ];

      // Languages not supported by Shiki (e.g. "text") get a plain <pre>
      // wrapper so whitespace and newlines are preserved.
      // HTML-escape < and > so Svelte's compiler doesn't treat them as elements.
      if (!(lang in bundledLanguages)) {
        const escaped = escapeSvelte(
          cleanedCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        );
        let inner = `<pre style="background:transparent;margin:0;padding:0;color:#d6deeb"><code>${escaped}</code></pre>`;

        const titleHtml = title
          ? `<div class="code-block-header">${escapeSvelte(title)}</div>`
          : '';
        const wrapperClasses = title ? baseClasses : [...baseClasses, 'overflow-x-scroll', 'p-4'];
        const contentWrapper = title ? `<div class="overflow-x-auto p-4">${inner}</div>` : inner;

        return `<div class="${wrapperClasses.join(' ')}" data-language="${lang}">${titleHtml}${contentWrapper}</div>`;
      }

      const transformers = [];
      if (remainingMeta && /\{[\d,\s-]+\}/.test(remainingMeta)) {
        transformers.push(transformerMetaHighlight());
      }

      let html = escapeSvelte(
        await codeToHtml(cleanedCode, {
          lang,
          theme: 'night-owl',
          meta: { __raw: remainingMeta || '' },
          transformers,
        }),
      ).replace(/\stabindex="[^"]*"/g, '');

      if (annotations.size > 0) {
        html = injectAnnotations(html, annotations);
      }

      const titleHtml = title ? `<div class="code-block-header">${escapeSvelte(title)}</div>` : '';
      const wrapperClasses = title ? baseClasses : [...baseClasses, 'overflow-x-scroll', 'p-4'];
      const contentWrapper = title ? `<div class="overflow-x-auto p-4">${html}</div>` : html;

      return `<div class="${wrapperClasses.join(' ')}" data-language="${lang}">${titleHtml}${contentWrapper}</div>`;
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
  preprocess: [vitePreprocess(), /** @type {any} */ (mdsvex(mdsvexOptions))],

  kit: {
    // Choose adapter based on deployment target
    adapter: process.env.VERCEL
      ? vercelAdapter({ runtime: 'nodejs24.x' })
      : staticAdapter({
          strict: false,
          fallback: '404.html',
        }),

    // Path aliases for imports
    alias: {
      '@/*': 'src/*',
      '$lib/*': 'src/lib/*',
      '$lib/components': '../../packages/components',
      '$lib/components/*': '../../packages/components/*',
      '$assets/*': 'src/assets/*',
      '$courses/*': '../../courses/*',
      '$writing/*': '../../writing/*',
      'content/*': '../../content/*',
      'courses/*': '../../courses/*',
      $merge: 'src/lib/merge.ts',
    },

    prerender: {
      origin: siteUrl,
      // Be strict, but ignore only malformed multi-URL fetch attempts from srcset
      handleHttpError: ({ status, path, message }) => {
        if (status === 404 && path.startsWith('/_app/immutable/assets/') && path.includes(',')) {
          return;
        }
        // Dynamic endpoints served at runtime but not during prerendering
        if (status === 404 && (path.endsWith('/llms.txt') || path.endsWith('/open-graph.jpg'))) {
          return;
        }
        // Broken .md cross-references in course content — warn instead of failing
        if (status === 404 && path.endsWith('.md')) {
          console.warn(`[prerender] Broken link: ${path}`);
          return;
        }
        throw new Error(message);
      },
      // Paginated routes may have no entries when post count fits on one page
      handleUnseenRoutes: 'ignore',
    },
  },
};

export default config;
