import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import remarkCallouts from '@stevekinney/markdown/remark-callouts';
import remarkEscapeComparators from '@stevekinney/markdown/remark-escape-comparators';
import { fixMarkdownUrls } from '@stevekinney/markdown/remark-fix-urls';
import remarkTailwindPlayground from '@stevekinney/markdown/remark-tailwind-playground';
import rehypeEnhanceImages from '@stevekinney/markdown/rehype-enhance-images';
import type { Config } from '@sveltejs/kit';
import type { MdsvexOptions } from 'mdsvex';
import { escapeSvelte, mdsvex } from 'mdsvex';
import rehypeSlug from 'rehype-slug';
import unwrapImages from 'rehype-unwrap-images';
import remarkGfm from 'remark-gfm';
import { bundledLanguages, codeToHtml } from 'shiki';
import { transformerMetaHighlight } from '@shikijs/transformers';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractAnnotations, injectAnnotations } from './src/lib/code-annotations.ts';

// Determine site URL for prerendering (used in Open Graph meta tags)
const siteUrl =
  process.env.PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:4444');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const imageManifestPath = join(__dirname, '../../image-manifest.json');
const strictImageManifest =
  process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL) || Boolean(process.env.CI);

const parseTitle = (
  metastring: string | null | undefined,
): { title: string | null; remaining: string } => {
  if (!metastring) return { title: null, remaining: '' };
  const match = metastring.match(/title="([^"]+)"/);
  const title = match ? match[1] : null;
  const remaining = metastring.replace(/title="[^"]+"\s*/, '').trim();
  return { title, remaining };
};

// mdsvex bundles an older `unified` type than the remark/rehype plugins
// resolve to, so the Plugin shapes don't line up here. `asPluggable`
// collapses both worlds to a single opaque plugin entry; content:validate
// and the Playwright content-pages specs exercise the actual behaviour.
type Pluggable = NonNullable<MdsvexOptions['remarkPlugins']>[number];
const asPluggable = (value: unknown): Pluggable => value as Pluggable;
const asPreprocess = (value: unknown): NonNullable<Config['preprocess']> =>
  value as NonNullable<Config['preprocess']>;

const mdsvexOptions: MdsvexOptions = {
  extensions: ['.md'],

  remarkPlugins: [
    asPluggable(remarkEscapeComparators),
    asPluggable([fixMarkdownUrls, ['../../writing', '../../courses']]),
    asPluggable(remarkGfm),
    asPluggable(remarkCallouts),
    asPluggable(remarkTailwindPlayground),
  ],
  rehypePlugins: [
    asPluggable(rehypeSlug),
    asPluggable(unwrapImages),
    asPluggable([
      rehypeEnhanceImages,
      {
        manifestPath: imageManifestPath,
        sizes: '(min-width: 1280px) 800px, (min-width: 768px) 80vw, 100vw',
        firstImagePriority: true,
        classes: ['max-w-full'],
        strictManifest: strictImageManifest,
      },
    ]),
  ],

  layout: {
    _: join(__dirname, './src/lib/markdown/base.svelte'),
    page: join(__dirname, './src/lib/markdown/page.svelte'),
  },

  highlight: {
    highlighter: async (code, lang = 'text', metastring) => {
      if (!lang) lang = 'text';

      // Mermaid blocks render as diagrams on the client, not syntax-highlighted.
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

      // Unsupported Shiki languages (e.g. "text") get a plain <pre>
      // wrapper so whitespace and newlines are preserved.
      if (!(lang in bundledLanguages)) {
        const escaped = escapeSvelte(
          cleanedCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        );
        const inner = `<pre style="background:transparent;margin:0;padding:0;color:#d6deeb"><code>${escaped}</code></pre>`;

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

const config: Config = {
  extensions: ['.svelte', '.md'],
  // mdsvex's exported preprocessor type predates SvelteKit's PreprocessorGroup.
  preprocess: asPreprocess([vitePreprocess(), mdsvex(mdsvexOptions)]),
  kit: {
    adapter: process.env.VERCEL
      ? vercelAdapter({ runtime: 'nodejs24.x' })
      : staticAdapter({
          strict: false,
          fallback: '404.html',
        }),

    alias: {
      '@/*': 'src/*',
      '$lib/*': 'src/lib/*',
      '$lib/components': '../../packages/components',
      '$lib/components/*': '../../packages/components/*',
      '$assets/*': 'src/assets/*',
      '$courses/*': '../../courses/*',
      '$writing/*': '../../writing/*',
      'courses/*': '../../courses/*',
      $merge: 'src/lib/merge.ts',
    },

    prerender: {
      origin: siteUrl,
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
      handleMissingId: ({ path, id, referrers }) => {
        console.warn(
          `[prerender] Missing id "${id}" on ${path} referenced from ${referrers.join(', ')}`,
        );
      },
      // Paginated routes may have no entries when post count fits on one page
      handleUnseenRoutes: 'ignore',
    },
  },
};

export default config;
