import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, searchForWorkspaceRoot, type Plugin, type PluginOption } from 'vite';
import { imagetools } from 'vite-imagetools';
import { ViteToml } from 'vite-plugin-toml';

const enableBundleStats = process.env.BUNDLE_STATS === '1';
const skipImageOptimizations = process.env.SKIP_IMAGE_OPTIMIZATION === '1';
const applyClientBuildOnly = <T extends Plugin>(plugin: T): T => {
  plugin.apply = (_config, env) => env.command === 'build' && !env.isSsrBuild;
  return plugin;
};

const loadEnhancedImages = async (): Promise<PluginOption> => {
  if (process.env.DISABLE_ENHANCED_IMAGES === '1' || skipImageOptimizations) {
    return null;
  }

  try {
    const { enhancedImages } = await import('@sveltejs/enhanced-img');
    return enhancedImages();
  } catch (error) {
    console.warn('[vite] Skipping enhanced images because sharp is unavailable.', error);
    return null;
  }
};

const enhancedImagesPlugin = await loadEnhancedImages();

export default defineConfig({
  plugins: [
    sveltekit(),
    enhancedImagesPlugin,
    ...(skipImageOptimizations ? [] : [imagetools()]),
    ViteToml(),
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
