import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite';
import { imagetools } from 'vite-imagetools';

import { getBaseUrl } from './plugins/get-base-url';
import { getTailwindExamples } from './plugins/process-tailwind-examples';

export default defineConfig({
  plugins: [
    getBaseUrl(),
    getTailwindExamples(),
    sveltekit(),
    enhancedImages(),
    imagetools(),
    tailwindcss() as Plugin[],
  ],

  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), '/content/**'],
    },
  },
  build: {
    rollupOptions: {
      cache: true,
    },
  },
  optimizeDeps: {
    force: false,
  },
  cacheDir: 'node_modules/.vite',
});
