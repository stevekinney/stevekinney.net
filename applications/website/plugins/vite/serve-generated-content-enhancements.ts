import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { PluginOption } from 'vite';

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
  const rootDirectory = path.resolve(options.rootDirectory);
  const { urlPrefix } = options;

  return {
    name: 'serve-generated-content-enhancements',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url) return next();

        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        if (!pathname.startsWith(urlPrefix)) return next();

        const contentType = GENERATED_ASSET_MIME_TYPES[path.extname(pathname).toLowerCase()];
        if (!contentType) return next();

        const relativePath = pathname.slice(urlPrefix.length);
        const filePath = path.resolve(rootDirectory, relativePath);
        if (!filePath.startsWith(rootDirectory)) return next();

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
