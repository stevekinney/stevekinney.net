import type { PluginOption } from 'vite';

import { serveStaticDirectory } from './serve-static-directory';

const GENERATED_ASSET_MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

type ServeGeneratedContentEnhancementsOptions = {
  rootDirectory: string;
  urlPrefix: string;
};

/**
 * Serves files from the generated content-enhancements output directory under
 * a stable URL prefix during development, mirroring how the production adapter
 * outputs are synced into the built artefacts.
 */
export function serveGeneratedContentEnhancements(
  options: ServeGeneratedContentEnhancementsOptions,
): PluginOption {
  const { rootDirectory, urlPrefix } = options;

  return {
    name: 'serve-generated-content-enhancements',
    configureServer(server) {
      server.middlewares.use(
        serveStaticDirectory({
          rootDirectory,
          mimeTypes: GENERATED_ASSET_MIME_TYPES,
          matchRequest: (pathname) =>
            pathname.startsWith(urlPrefix) ? pathname.slice(urlPrefix.length) : null,
        }),
      );
    },
  };
}
