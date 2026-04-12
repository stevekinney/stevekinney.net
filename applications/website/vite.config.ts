import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
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

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

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
      const contentPaths = ['courses', 'writing', 'content'].map((dir) =>
        path.resolve(workspaceRoot, dir),
      );
      for (const dir of contentPaths) {
        server.watcher.add(dir);
      }
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

        if (
          !pathname.startsWith('/courses/') &&
          !pathname.startsWith('/content/') &&
          !pathname.startsWith('/writing/')
        ) {
          return next();
        }

        const contentType = IMAGE_MIME_TYPES[path.extname(pathname).toLowerCase()];
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
        path.resolve(workspaceRoot, 'content'),
        path.resolve(workspaceRoot, 'courses'),
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
