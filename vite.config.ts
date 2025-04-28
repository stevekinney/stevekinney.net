import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { imagetools } from 'vite-imagetools';

export default defineConfig({
  plugins: [sveltekit(), enhancedImages(), imagetools()],
  assetsInclude: ['**/*.woff2', '**/*.woff'],
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
