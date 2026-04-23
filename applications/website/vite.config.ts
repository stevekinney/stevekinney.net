import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, searchForWorkspaceRoot, type PluginOption } from 'vite';
import { ViteToml } from 'vite-plugin-toml';

import { contentDevelopmentPlugins } from './plugins/vite/content-development-plugins';

const enableBundleStats = process.env.BUNDLE_STATS === '1';
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

const contentDirectories = ['writing', 'courses'].map((directory) =>
  path.resolve(workspaceRoot, directory),
);
const contentEnhancementsSourceDirectory = path.resolve(
  workspaceRoot,
  'packages',
  'content-enhancements',
  'src',
);
const generatedEnhancementsDirectory = path.resolve(
  workspaceRoot,
  'applications',
  'website',
  '.generated',
  'content-enhancements',
);
const contentBuildScriptPath = path.resolve(
  workspaceRoot,
  'packages',
  'scripts',
  'content-build.ts',
);

export default defineConfig({
  plugins: [
    sveltekit(),
    ...contentDevelopmentPlugins({
      workspaceRoot,
      contentDirectories,
      contentAssetPathPrefixes: ['/courses/', '/writing/'],
      enhancementSourceDirectories: [contentEnhancementsSourceDirectory],
      contentBuildScriptPath,
      contentBuildWorkingDirectory: process.cwd(),
      generatedEnhancementsDirectory,
      generatedEnhancementsUrlPrefix: '/generated/content-enhancements/',
    }),
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
      allow: [workspaceRoot, ...contentDirectories],
    },
  },
  build: {
    rollupOptions: {
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
    noExternal: ['@lucide/svelte', '@icons-pack/svelte-simple-icons'],
  },
});
