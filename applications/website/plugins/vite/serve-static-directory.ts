import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Connect } from 'vite';

type ServeStaticDirectoryOptions = {
  /** Absolute directory that file paths are resolved against. */
  rootDirectory: string;
  /** Returns the on-disk path for a matching request, or `null` to skip. */
  matchRequest: (pathname: string) => string | null;
  /** Maps a file extension (lowercased, including `.`) to a Content-Type. */
  mimeTypes: Record<string, string>;
};

/**
 * Connect middleware that serves files from a directory under a URL-prefix
 * filter, with extension → MIME-type lookup and a path-traversal guard.
 * Shared by `serveContentAssets` and `serveGeneratedContentEnhancements` so
 * both stay structurally identical — only the request-matching logic differs.
 */
export function serveStaticDirectory(
  options: ServeStaticDirectoryOptions,
): Connect.NextHandleFunction {
  const rootDirectory = path.resolve(options.rootDirectory);
  const { matchRequest, mimeTypes } = options;

  return async (request, response, next) => {
    if (!request.url) return next();

    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relativeFilePath = matchRequest(pathname);
    if (relativeFilePath === null) return next();

    const contentType = mimeTypes[path.extname(pathname).toLowerCase()];
    if (!contentType) return next();

    const filePath = path.resolve(rootDirectory, relativeFilePath);
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
  };
}
