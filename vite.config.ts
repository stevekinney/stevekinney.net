import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite';
import { imagetools } from 'vite-imagetools';

const enableBundleStats = process.env.BUNDLE_STATS === '1';
const applyClientBuildOnly = <T extends Plugin>(plugin: T): T => {
  plugin.apply = (_config, env) => env.command === 'build' && !env.isSsrBuild;
  return plugin;
};

export default defineConfig({
  plugins: [
    sveltekit(),
    enhancedImages(),
    imagetools(),
    tailwindcss() as Plugin[],
    ...(enableBundleStats
      ? [
          applyClientBuildOnly(
            visualizer({
              filename: 'build/stats.html',
              template: 'treemap',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }) as Plugin,
          ),
          applyClientBuildOnly(
            visualizer({
              filename: 'build/stats.json',
              template: 'raw-data',
              gzipSize: true,
              brotliSize: true,
            }) as Plugin,
          ),
        ]
      : []),
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
      maxParallelFileOps: 20,
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    force: false,
  },
  cacheDir: 'node_modules/.vite',
  worker: {
    format: 'es',
  },
});
