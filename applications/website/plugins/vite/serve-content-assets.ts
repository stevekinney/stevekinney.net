import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { PluginOption } from 'vite';

const CONTENT_ASSET_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

type ServeContentAssetsOptions = {
  workspaceRoot: string;
  pathPrefixes: readonly string[];
};

/**
 * Serves static image assets from the given path prefixes during development.
 * In production the rehype plugin rewrites image src attributes to blob
 * storage URLs; in development any image not yet in the manifest falls through
 * to this middleware, which reads the file directly from disk relative to
 * `workspaceRoot`.
 */
export function serveContentAssets(options: ServeContentAssetsOptions): PluginOption {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const { pathPrefixes } = options;

  return {
    name: 'serve-content-assets',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url) return next();

        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        if (!pathPrefixes.some((prefix) => pathname.startsWith(prefix))) {
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
