import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Markdown plugins
import rehypeMermaid from '@beoe/rehype-mermaid';
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

/**
 * MDSvex configuration options
 * @type {import('mdsvex').MdsvexOptions}
 */
const mdsvexOptions = {
  extensions: ['.md'],
  
  // Process markdown content
  remarkPlugins: [unwrapImages, fixMarkdownUrls, remarkGfm],
  rehypePlugins: [rehypeSlug, rehypeMermaid],
  
  // Layout templates for markdown content
  layout: {
    _: join(__dirname, './src/lib/markdown/base.svelte'),
    page: join(__dirname, './src/lib/markdown/page.svelte'),
    contents: join(__dirname, './src/lib/markdown/components/contents.svelte'),
  },
  
  // Syntax highlighting configuration
  highlight: {
    highlighter: async (code, lang = 'text') => {
      if (!lang || !(lang in bundledLanguages)) return code;
      
      const html = escapeSvelte(
        await codeToHtml(code, { 
          lang, 
          theme: 'night-owl' 
        })
      );
      
      return `{@html \`${html}\` }`;
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
    processCallouts()
  ],
  
  kit: {
    // Choose adapter based on deployment target
    adapter: process.env.VERCEL 
      ? vercelAdapter() 
      : staticAdapter({ strict: false }),
    
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