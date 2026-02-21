import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, searchForWorkspaceRoot, type PluginOption } from 'vite';
import { ViteToml } from 'vite-plugin-toml';

const enableBundleStats = process.env.BUNDLE_STATS === '1';
const skipImageOptimizations = process.env.SKIP_IMAGE_OPTIMIZATION === '1';
const workspaceRoot = searchForWorkspaceRoot(process.cwd());
const applyClientBuildOnly = (plugin: unknown): PluginOption => {
  if (plugin && typeof plugin === 'object' && !Array.isArray(plugin)) {
    (
      plugin as {
        apply?: (config: unknown, env: { command: string; isSsrBuild: boolean }) => boolean;
      }
    ).apply = (_config, env) => env.command === 'build' && !env.isSsrBuild;
  }

  return plugin as PluginOption;
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

const loadImageTools = async (): Promise<PluginOption> => {
  if (skipImageOptimizations) {
    return null;
  }

  try {
    const { imagetools } = await import('vite-imagetools');
    return imagetools();
  } catch (error) {
    console.warn('[vite] Skipping imagetools because sharp is unavailable.', error);
    return null;
  }
};

const enhancedImagesPlugin = await loadEnhancedImages();
const imagetoolsPlugin = await loadImageTools();

export default defineConfig({
  plugins: [
    sveltekit(),
    enhancedImagesPlugin,
    imagetoolsPlugin,
    ViteToml(),
    tailwindcss(),
    ...(enableBundleStats
      ? [
          applyClientBuildOnly(
            visualizer({
              filename: 'build/stats.html',
              template: 'treemap',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
          ),
          applyClientBuildOnly(
            visualizer({
              filename: 'build/stats.json',
              template: 'raw-data',
              gzipSize: true,
              brotliSize: true,
            }),
          ),
        ]
      : []),
  ].filter(Boolean) as PluginOption[],

  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  server: {
    fs: {
      allow: [
        workspaceRoot,
        path.resolve(workspaceRoot, 'content'),
        path.resolve(workspaceRoot, 'courses'),
      ],
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
  ssr: {
    noExternal: ['lucide-svelte'],
  },
});
