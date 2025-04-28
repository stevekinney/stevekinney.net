import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFile } from 'node:fs/promises';
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite';
import { imagetools } from 'vite-imagetools';
const loadFonts = (): Plugin => {
  return {
    name: 'load-fonts',
    enforce: 'pre',
    async load(id) {
      if (id.endsWith('.woff')) {
        const buffer = await readFile(id);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:font/woff;base64,${base64}`;
        return `export default "${dataUrl}";`;
      }
    },
  };
};

export default defineConfig({
  plugins: [sveltekit(), enhancedImages(), imagetools(), loadFonts()],
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), '/content/**'],
    },
  },
});
