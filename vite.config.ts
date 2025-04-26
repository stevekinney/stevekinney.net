import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { imagetools } from 'vite-imagetools';
import { openGraphPlugin } from './plugins/open-graph';

export default defineConfig({
  plugins: [sveltekit(), enhancedImages(), imagetools(), openGraphPlugin()],
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
