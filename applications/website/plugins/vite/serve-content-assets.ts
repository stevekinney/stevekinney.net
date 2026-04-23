import type { PluginOption } from 'vite';

import { serveStaticDirectory } from './serve-static-directory';

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
  const { workspaceRoot, pathPrefixes } = options;

  return {
    name: 'serve-content-assets',
    configureServer(server) {
      server.middlewares.use(
        serveStaticDirectory({
          rootDirectory: workspaceRoot,
          mimeTypes: CONTENT_ASSET_MIME_TYPES,
          matchRequest: (pathname) =>
            pathPrefixes.some((prefix) => pathname.startsWith(prefix)) ? pathname.slice(1) : null,
        }),
      );
    },
  };
}
