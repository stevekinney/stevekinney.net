import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { importTailwindPlayground } from '@stevekinney/plugins/import-tailwind-playground';
import remarkCallouts from '@stevekinney/plugins/remark-callouts';
import remarkEscapeComparators from '@stevekinney/plugins/remark-escape-comparators';
import { fixMarkdownUrls } from '@stevekinney/plugins/remark-fix-urls';
import remarkTailwindPlayground from '@stevekinney/plugins/remark-tailwind-playground';
import { processImages } from '@stevekinney/plugins/svelte-enhance-images';

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
const skipImageOptimizations = process.env.SKIP_IMAGE_OPTIMIZATION === '1';

// Define directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache for highlighted code blocks
const highlightCache = new Map();

/**
 * Extract title="..." from the metastring.
 * @param {string | undefined} metastring
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
 * Annotation patterns for different comment styles.
 * Each captures the annotation text in group 1.
 */
const ANNOTATION_PATTERNS = [
  /^\s*\/\/\s*\[!note\s+(.*?)\]\s*$/,
  /^\s*#\s*\[!note\s+(.*?)\]\s*$/,
  /^\s*\/\*\s*\[!note\s+(.*?)\]\s*\*\/\s*$/,
  /^\s*<!--\s*\[!note\s+(.*?)\]\s*-->\s*$/,
];

/**
 * Strip annotation comment lines from code. Returns cleaned code and a map
 * of line indices (0-based, in the cleaned output) to annotation text.
 * Each annotation attaches to the code line immediately above it.
 * @param {string} code
 * @returns {{ cleanedCode: string, annotations: Map<number, string> }}
 */
function extractAnnotations(code) {
  const lines = code.split('\n');
  const cleanedLines = [];
  const annotations = new Map();

  for (const line of lines) {
    let annotationText = null;
    for (const pattern of ANNOTATION_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        annotationText = match[1];
        break;
      }
    }

    if (annotationText !== null) {
      const previousIndex = cleanedLines.length - 1;
      if (previousIndex >= 0) {
        annotations.set(previousIndex, annotationText);
      }
    } else {
      cleanedLines.push(line);
    }
  }

  return { cleanedCode: cleanedLines.join('\n'), annotations };
}

/**
 * Escape characters that Svelte would interpret as template syntax.
 * Used for annotation text injected after escapeSvelte has already run.
 * @param {string} text
 * @returns {string}
 */
function escapeSvelteText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/`/g, '&#96;');
}

/**
 * Inject annotation HTML elements after the specified lines in Shiki output.
 * Splits on <span class="line"> boundaries and inserts annotation spans.
 * @param {string} html
 * @param {Map<number, string>} annotations
 * @returns {string}
 */
function injectAnnotations(html, annotations) {
  if (annotations.size === 0) return html;

  const parts = html.split(/(?=<span class="line">)/);
  const result = [];
  let lineIndex = 0;

  for (const part of parts) {
    if (part.startsWith('<span class="line">')) {
      if (lineIndex > 0) {
        const annotation = annotations.get(lineIndex - 1);
        if (annotation !== undefined) {
          result.push(
            `<span class="code-annotation"><span class="code-annotation-indicator">Note</span> ${escapeSvelteText(annotation)}</span>`,
          );
        }
      }
      lineIndex++;
    }
    result.push(part);
  }

  // Handle annotation on the very last line
  const lastAnnotation = annotations.get(lineIndex - 1);
  if (lastAnnotation !== undefined) {
    const last = result.length - 1;
    result[last] = result[last].replace(
      '</code></pre>',
      `<span class="code-annotation"><span class="code-annotation-indicator">Note</span> ${escapeSvelteText(lastAnnotation)}</span></code></pre>`,
    );
  }

  return result.join('');
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
    /** @type {any} */ (fixMarkdownUrls(['../../content/writing', '../../courses'])),
    remarkGfm,
    remarkCallouts,
    remarkTailwindPlayground,
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

      const cacheKey = `${lang}:${metastring || ''}:${code}`;
      if (highlightCache.has(cacheKey)) {
        return highlightCache.get(cacheKey);
      }

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

        const result = `<div class="${wrapperClasses.join(' ')}" data-language="${lang}">${titleHtml}${contentWrapper}</div>`;
        highlightCache.set(cacheKey, result);
        return result;
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

      const result = `<div class="${wrapperClasses.join(' ')}" data-language="${lang}">${titleHtml}${contentWrapper}</div>`;
      highlightCache.set(cacheKey, result);
      return result;
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
    importTailwindPlayground(),
    ...(skipImageOptimizations
      ? []
      : [
          /** @type {any} */ (
            processImages({
              widths: [480, 1024, 1600],
              mainWidth: 1600,
              sizes: '(min-width: 1280px) 800px, (min-width: 768px) 80vw, 100vw',
              includeMetadata: true,
              firstImagePriority: true,
              lqip: true,
              classes: ['max-w-full'],
            })
          ),
        ]),
  ],

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
      '$writing/*': '../../content/writing/*',
      'content/*': '../../content/*',
      'courses/*': '../../courses/*',
      $merge: 'src/lib/merge.ts',
    },

    prerender: {
      origin: siteUrl,
      // Be strict, but ignore only malformed multi-URL fetch attempts from srcset
      handleHttpError: ({ status, path, message }) => {
        if (status === 404 && path.startsWith('/_app/immutable/assets/') && path.includes(',')) {
          return; // skip this specific bad fetch; real 404s still throw
        }
        throw new Error(message);
      },
      // Paginated routes may have no entries when post count fits on one page
      handleUnseenRoutes: 'ignore',
    },
  },
};

export default config;
