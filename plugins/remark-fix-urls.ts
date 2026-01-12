import { dirname, posix as pathPosix } from 'path';
import type { Link, Root } from 'mdast';
import type { Transformer } from 'unified';
import type { VFile } from 'vfile';
import { visit } from 'unist-util-visit';

/**
 * Constants for URL processing
 */
const URL_PATTERNS = {
  EXTERNAL_SCHEME: /^[a-zA-Z][a-zA-Z+.-]*:/,
  PROTOCOL_RELATIVE: /^\/\//,
};

const MARKDOWN_EXTENSIONS = ['.mdx', '.markdown', '.md'];

const DEFAULT_CONTENT_PATH = 'content';

/**
 * Determines if a URL points to an external resource
 */
const isExternalUrl = (url: string): boolean =>
  URL_PATTERNS.PROTOCOL_RELATIVE.test(url) || URL_PATTERNS.EXTERNAL_SCHEME.test(url);

const normalizePathSeparators = (value: string): string => value.replace(/\\/g, '/');
const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

const splitUrl = (url: string): { path: string; query: string; hash: string } => {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const end = Math.min(
    hashIndex === -1 ? url.length : hashIndex,
    queryIndex === -1 ? url.length : queryIndex,
  );
  const path = url.slice(0, end);
  const query =
    queryIndex === -1 ? '' : url.slice(queryIndex, hashIndex === -1 ? url.length : hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);

  return { path, query, hash };
};

const findMarkdownExtension = (pathname: string): string | undefined => {
  const lower = pathname.toLowerCase();
  return MARKDOWN_EXTENSIONS.find((ext) => lower.endsWith(ext));
};

const stripMarkdownExtension = (pathname: string): string => {
  const ext = findMarkdownExtension(pathname);
  return ext ? pathname.slice(0, -ext.length) : pathname;
};

const normalizeRoutePath = (pathname: string): string => {
  let normalized = pathname.replace(/\/(README|_index|index)$/i, '/');
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, '/');
  return normalized;
};

/**
 * Transforms a markdown link to its corresponding route path
 */
const transformInternalUrl = (url: string, baseUrl: string): string => {
  const { path, query, hash } = splitUrl(url);
  const normalizedPath = trimTrailingSlashes(normalizePathSeparators(path));
  const isAbsolute = normalizedPath.startsWith('/');

  const joined = isAbsolute
    ? pathPosix.normalize(normalizedPath)
    : pathPosix.normalize(pathPosix.join(baseUrl || '/', normalizedPath));

  const withoutExt = stripMarkdownExtension(joined);
  const normalizedRoute = normalizeRoutePath(withoutExt);

  return `${normalizedRoute}${query}${hash}`;
};

interface FileData {
  filename: string;
  cwd: string;
}

/**
 * Calculates the base URL for a file relative to the content directory
 */
const getBaseUrl = (fileData: FileData, contentPath: string): string => {
  const filePath = normalizePathSeparators(fileData.filename || '');
  const cwd = normalizePathSeparators(fileData.cwd || process.cwd());
  if (!filePath) return '/';
  let rel = filePath.startsWith(cwd + '/') ? filePath.slice(cwd.length + 1) : filePath;
  if (rel.startsWith(contentPath + '/')) rel = rel.slice(contentPath.length + 1);
  const dir = normalizePathSeparators(dirname(rel));
  return dir === '.' ? '/' : '/' + dir;
};

/**
 * A remark plugin that processes internal markdown links to generate correct routing URLs.
 * Transforms markdown extensions and handles path resolution while preserving external links.
 *
 * @param contentPath - Root directory containing content files (defaults to 'content')
 */
export function fixMarkdownUrls(contentPath = DEFAULT_CONTENT_PATH): Transformer<Root> {
  return function transformer(tree, file: VFile) {
    // MDSvex may use 'filename' instead of 'path'
    const anyFile = file as VFile & { filename?: string };
    const fileData: FileData = {
      filename: anyFile.filename ?? anyFile.path ?? '',
      cwd: anyFile.cwd ?? process.cwd(),
    };
    const baseUrl = getBaseUrl(fileData, contentPath);

    visit(tree, 'link', (node: Link) => {
      const { url } = node;

      if (!url || isExternalUrl(url)) return;

      const { path } = splitUrl(url);
      if (!path) return;

      const normalizedPath = trimTrailingSlashes(normalizePathSeparators(path));
      if (!normalizedPath) return;
      if (!findMarkdownExtension(normalizedPath)) return;

      // Transform the URL
      node.url = transformInternalUrl(url, baseUrl);
    });
  };
}
