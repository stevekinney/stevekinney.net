import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, searchForWorkspaceRoot, type PluginOption } from 'vite';
import { ViteToml } from 'vite-plugin-toml';

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

const CONTENT_ASSET_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

const GENERATED_ASSET_MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  ...CONTENT_ASSET_MIME_TYPES,
};

const generatedContentEnhancementsRoot = path.resolve(
  workspaceRoot,
  'applications',
  'website',
  '.generated',
  'content-enhancements',
);

/**
 * Watches monorepo content directories so Vite's `import.meta.glob` picks up
 * newly added files without a manual dev server restart. Vite's default watcher
 * doesn't always cover directories resolved via deep `../../../../` relative
 * paths outside the application root.
 */
function watchContentDirectories(): PluginOption {
  return {
    name: 'watch-content-directories',
    configureServer(server) {
      const contentPaths = ['courses', 'writing'].map((dir) => path.resolve(workspaceRoot, dir));
      for (const dir of contentPaths) {
        server.watcher.add(dir);
      }
    },
  };
}

function regenerateGeneratedContent(): PluginOption {
  const shouldRegenerate = (filePath: string): boolean => {
    const normalizedPath = filePath.split(path.sep).join('/');

    if (/\.(md|toml)$/i.test(normalizedPath)) {
      return normalizedPath.includes('/writing/') || normalizedPath.includes('/courses/');
    }

    if (!/\.ts$/i.test(normalizedPath)) {
      return false;
    }

    const contentEnhancementSources = [
      '/applications/website/src/lib/content-enhancements.ts',
      '/applications/website/src/lib/copy-code-block-as-image.ts',
      '/applications/website/src/lib/actions/enhance-code-blocks.ts',
      '/applications/website/src/lib/actions/enhance-mermaid-diagrams.ts',
      '/applications/website/src/lib/actions/enhance-tailwind-playgrounds.ts',
      '/applications/website/src/lib/actions/enhance-tables.ts',
    ];

    return contentEnhancementSources.some((sourcePath) => normalizedPath.endsWith(sourcePath));
  };

  return {
    name: 'regenerate-generated-content',
    configureServer(server) {
      let isRunning = false;
      let hasPendingRun = false;

      const runContentBuild = (): void => {
        if (isRunning) {
          hasPendingRun = true;
          return;
        }

        isRunning = true;
        const child = spawn('bun', ['run', '../../packages/scripts/content-build.ts'], {
          cwd: process.cwd(),
          stdio: 'inherit',
        });

        child.on('exit', (code) => {
          isRunning = false;

          if (code === 0) {
            server.ws.send({ type: 'full-reload' });
          } else {
            server.config.logger.error('Generated content rebuild failed.');
          }

          if (hasPendingRun) {
            hasPendingRun = false;
            runContentBuild();
          }
        });
      };

      const handleChange = (filePath: string): void => {
        if (shouldRegenerate(filePath)) {
          runContentBuild();
        }
      };

      server.watcher.on('add', handleChange);
      server.watcher.on('change', handleChange);
      server.watcher.on('unlink', handleChange);
    },
  };
}

function serveGeneratedContentEnhancements(): PluginOption {
  const generatedPrefix = '/generated/content-enhancements/';

  return {
    name: 'serve-generated-content-enhancements',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url) return next();

        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        if (!pathname.startsWith(generatedPrefix)) {
          return next();
        }

        const contentType = GENERATED_ASSET_MIME_TYPES[path.extname(pathname).toLowerCase()];
        if (!contentType) return next();

        const relativePath = pathname.slice(generatedPrefix.length);
        const filePath = path.resolve(generatedContentEnhancementsRoot, relativePath);
        if (!filePath.startsWith(generatedContentEnhancementsRoot)) return next();

        try {
          const fileStat = await stat(filePath);
          if (!fileStat.isFile()) return next();

          const content = await readFile(filePath);
          response.setHeader('Content-Type', contentType);
          response.setHeader('Content-Length', content.length);
          response.setHeader('Cache-Control', 'no-cache');
          response.end(content);
        } catch {
          next();
        }
      });
    },
  };
}

/**
 * Serves static image assets from content directories during development.
 *
 * In production, the rehype plugin rewrites image src attributes to blob storage URLs.
 * In development, images not yet in the manifest fall through to this middleware, which
 * serves them directly from the workspace root.
 */
function serveContentAssets(): PluginOption {
  return {
    name: 'serve-content-assets',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url) return next();

        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);

        if (!pathname.startsWith('/courses/') && !pathname.startsWith('/writing/')) {
          return next();
        }

        const contentType = CONTENT_ASSET_MIME_TYPES[path.extname(pathname).toLowerCase()];
        if (!contentType) return next();

        const filePath = path.resolve(workspaceRoot, pathname.slice(1));
        if (!filePath.startsWith(workspaceRoot)) return next();

        try {
          const fileStat = await stat(filePath);
          if (!fileStat.isFile()) return next();

          const content = await readFile(filePath);
          response.setHeader('Content-Type', contentType);
          response.setHeader('Content-Length', content.length);
          response.setHeader('Cache-Control', 'no-cache');
          response.end(content);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    sveltekit(),
    watchContentDirectories(),
    regenerateGeneratedContent(),
    serveGeneratedContentEnhancements(),
    serveContentAssets(),
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
        path.resolve(workspaceRoot, 'courses'),
        path.resolve(workspaceRoot, 'writing'),
      ],
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
