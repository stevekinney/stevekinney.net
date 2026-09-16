import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Connect } from 'vite';

type StaticHeaders = Record<string, number | string>;

type ServeStaticDirectoryOptions = {
  /** Absolute directory that file paths are resolved against. */
  rootDirectory: string;
  /** Returns the on-disk path for a matching request, or `null` to skip. */
  matchRequest: (pathname: string) => string | null;
  /** Maps a file extension (lowercased, including `.`) to a Content-Type. */
  mimeTypes: Record<string, string>;
  /** Adds response headers after the Content-Type and Content-Length headers. */
  headers?: (relativeFilePath: string) => StaticHeaders;
};

const parsePathname = (url: string): string | null => {
  try {
    return decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return null;
  }
};

/**
 * Connect middleware that serves files from a directory under a URL-prefix
 * filter, with extension → MIME-type lookup and a path-traversal guard.
 */
export function serveStaticDirectory(
  options: ServeStaticDirectoryOptions,
): Connect.NextHandleFunction {
  const rootDirectory = path.resolve(options.rootDirectory);
  const { headers, matchRequest, mimeTypes } = options;

  return async (request, response, next) => {
    if (!request.url) return next();

    const pathname = parsePathname(request.url);
    if (!pathname) return next();

    const relativeFilePath = matchRequest(pathname);
    if (relativeFilePath === null) return next();

    const contentType = mimeTypes[path.extname(pathname).toLowerCase()];
    if (!contentType) return next();

    const filePath = path.resolve(rootDirectory, relativeFilePath);
    const relativeToRoot = path.relative(rootDirectory, filePath);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) return next();

    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) return next();

      const content = await readFile(filePath);
      response.setHeader('Content-Type', contentType);
      response.setHeader('Content-Length', content.length);
      response.setHeader('Cache-Control', 'no-cache');

      for (const [name, value] of Object.entries(headers?.(relativeFilePath) ?? {})) {
        response.setHeader(name, value);
      }

      response.end(content);
    } catch {
      next();
    }
  };
}
