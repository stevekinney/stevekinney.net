import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFile } from 'fs/promises';
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite';
import { imagetools } from 'vite-imagetools';

const loadFont = (): Plugin => {
  return {
    name: 'load-font',
    enforce: 'pre',
    async load(id) {
      if (id.endsWith('.woff')) {
        console.log('Loading font:', id);
        const font = await readFile(id);
        const uint8Array = new Uint8Array(font);
        const bytes = Array.from(uint8Array).join(',');
        const code = [
          `export default (function() {`,
          `  const byteArray = new Uint8Array([${bytes}]);`,
          `  return byteArray.buffer;`,
          `})();`,
        ].join('\n');
        return {
          code,
          map: null,
        };
      }
    },
  };
};

export default defineConfig({
  plugins: [sveltekit(), enhancedImages(), imagetools(), loadFont()],

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
