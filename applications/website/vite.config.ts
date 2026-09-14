import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, searchForWorkspaceRoot, type PluginOption } from 'vite';
import { ViteToml } from 'vite-plugin-toml';

import { contentDevelopmentPlugins } from './plugins/vite/content-development-plugins.ts';

const enableBundleStats = process.env.BUNDLE_STATS === '1';
const enableVercelAnalytics =
  process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';
const workspaceRoot = searchForWorkspaceRoot(process.cwd());

const readContentEnhancementsBuildHash = (): string => {
  try {
    return readFileSync(
      path.resolve(
        workspaceRoot,
        'applications',
        'website',
        '.generated',
        'content-enhancements',
        '.build-hash',
      ),
      'utf8',
    ).trim();
  } catch {
    return 'dev';
  }
};

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

const contentDirectories = ['writing', 'courses', 'projects'].map((directory) =>
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
const generatedPlaygroundsDirectory = path.resolve(
  workspaceRoot,
  'applications',
  'website',
  '.generated',
  'playgrounds',
);
const playgroundManifestPath = path.join(generatedPlaygroundsDirectory, 'manifest.json');
const contentBuildScriptPath = path.resolve(
  workspaceRoot,
  'packages',
  'scripts',
  'content-build.ts',
);
const playgroundsBuildScriptPath = path.resolve(
  workspaceRoot,
  'packages',
  'scripts',
  'playgrounds-build.ts',
);
const contentEnhancementsBuildScriptPath = path.resolve(
  workspaceRoot,
  'packages',
  'scripts',
  'content-enhancements-build.ts',
);
const scriptsDirectory = path.resolve(workspaceRoot, 'packages', 'scripts');
const utilitiesDirectory = path.resolve(workspaceRoot, 'packages', 'utilities');
const contentDependencyPaths = [
  contentBuildScriptPath,
  path.join(scriptsDirectory, 'content-metadata.ts'),
  path.join(scriptsDirectory, 'content-repository.ts'),
  path.join(scriptsDirectory, 'content-repository'),
  path.join(utilitiesDirectory, 'content-types.ts'),
  path.join(utilitiesDirectory, 'frontmatter.ts'),
  path.join(utilitiesDirectory, 'routes.ts'),
  path.join(utilitiesDirectory, 'write-formatted-json.ts'),
  path.join(utilitiesDirectory, 'tailwind-playground.ts'),
  path.join(utilitiesDirectory, 'tailwind-playground-metadata.ts'),
  path.join(utilitiesDirectory, 'tailwind-playground-types.ts'),
  path.resolve(workspaceRoot, 'packages', 'markdown', 'src', 'remark-tailwind-playground.ts'),
];
const enhancementDependencyPaths = [
  contentEnhancementsBuildScriptPath,
  path.join(scriptsDirectory, 'content-enhancement-build-hash.ts'),
];
const playgroundDependencyPaths = [
  playgroundsBuildScriptPath,
  path.join(scriptsDirectory, 'playground-document.ts'),
  path.join(scriptsDirectory, 'build-dependencies.ts'),
  path.join(scriptsDirectory, 'tailwind-playground.css'),
  path.join(utilitiesDirectory, 'tailwind-playground-policy.ts'),
];
const sharedBuildDependencyPaths = [
  path.join(scriptsDirectory, 'build-artifacts.ts'),
  path.join(scriptsDirectory, 'content-paths.ts'),
  path.resolve(workspaceRoot, 'bun.lock'),
];

export default defineConfig({
  define: {
    __CONTENT_ENHANCEMENTS_BUILD_HASH__: JSON.stringify(readContentEnhancementsBuildHash()),
    __VERCEL_ANALYTICS_ENABLED__: JSON.stringify(enableVercelAnalytics),
  },
  plugins: [
    sveltekit(),
    ...contentDevelopmentPlugins({
      workspaceRoot,
      contentDirectories,
      additionalDependencies: [
        path.join(workspaceRoot, 'packages/markdown/src'),
        path.join(workspaceRoot, 'image-manifest.json'),
        path.join(workspaceRoot, 'applications/website/static'),
      ],
      additionalDependencies: [
        path.join(workspaceRoot, 'packages/markdown/src'),
        path.join(workspaceRoot, 'image-manifest.json'),
        path.join(workspaceRoot, 'applications/website/static'),
      ],
      contentAssetPathPrefixes: ['/courses/', '/projects/', '/writing/'],
      enhancementSourceDirectories: [contentEnhancementsSourceDirectory],
      contentDependencyPaths,
      enhancementDependencyPaths,
      playgroundDependencyPaths,
      sharedBuildDependencyPaths,
      contentBuildScriptPath,
      playgroundsBuildScriptPath,
      contentEnhancementsBuildScriptPath,
      contentBuildWorkingDirectory: process.cwd(),
      generatedEnhancementsDirectory,
      generatedEnhancementsUrlPrefix: '/generated/content-enhancements/',
      generatedPlaygroundsDirectory,
      playgroundManifestPath,
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

  oxc: {
    jsx: {
      runtime: 'classic',
      pragma: 'h',
      pragmaFrag: 'Fragment',
    },
  },
  server: {
    fs: {
      allow: [workspaceRoot, ...contentDirectories],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@sveltejs/kit/src/runtime/client/')) {
            return 'sveltekit-client';
          }

          if (id.includes('/node_modules/@sveltejs/kit/src/runtime/app/')) {
            return 'sveltekit-app';
          }

          if (id.includes('/node_modules/@sveltejs/kit/src/runtime/')) {
            return 'sveltekit-runtime';
          }

          if (id.includes('/node_modules/@sveltejs/kit/src/utils/')) {
            return 'sveltekit-utilities';
          }

          if (id.includes('/node_modules/svelte/src/internal/client/reactivity/')) {
            return 'svelte-reactivity';
          }

          if (id.includes('/node_modules/svelte/src/internal/client/dom/blocks/')) {
            return 'svelte-dom-blocks';
          }

          if (id.includes('/node_modules/svelte/src/internal/client/dom/elements/')) {
            return 'svelte-dom-elements';
          }

          if (id.includes('/node_modules/svelte/src/internal/client/dom/')) {
            return 'svelte-dom';
          }

          if (id.includes('/node_modules/svelte/src/internal/')) {
            return 'svelte-runtime';
          }
        },
      },
    },
    chunkSizeWarningLimit: 100,
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
