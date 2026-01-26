import { dirname, posix as pathPosix } from 'path';
import { visit } from 'unist-util-visit';

/**
 * Constants for URL processing
 */
const URL_PATTERNS = {
  EXTERNAL_SCHEME: /^[a-zA-Z][a-zA-Z+.-]*:/,
  PROTOCOL_RELATIVE: /^\/\//,
  WINDOWS_DRIVE: /^[a-zA-Z]:[\\/]/,
};

const MARKDOWN_EXTENSIONS = ['.mdx', '.markdown', '.md'];

const DEFAULT_CONTENT_PATH = 'content';

/**
 * Determines if a URL points to an external resource
 */
/**
 * @param {string} url
 */
const isExternalUrl = (url) =>
  URL_PATTERNS.PROTOCOL_RELATIVE.test(url) ||
  URL_PATTERNS.EXTERNAL_SCHEME.test(url) ||
  URL_PATTERNS.WINDOWS_DRIVE.test(url);

/**
 * @param {string} value
 */
const normalizePathSeparators = (value) => value.replace(/\\/g, '/');
/**
 * @param {string} value
 */
const trimTrailingSlashes = (value) => value.replace(/\/+$/, '');
/**
 * @param {string} value
 */
const trimSlashes = (value) => value.replace(/^\/+|\/+$/g, '');

/**
 * @param {string} url
 */
const splitUrl = (url) => {
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

/**
 * @param {string} pathname
 */
const findMarkdownExtension = (pathname) => {
  const lower = pathname.toLowerCase();
  return MARKDOWN_EXTENSIONS.find((ext) => lower.endsWith(ext));
};

/**
 * @param {string} pathname
 */
const stripMarkdownExtension = (pathname) => {
  const ext = findMarkdownExtension(pathname);
  return ext ? pathname.slice(0, -ext.length) : pathname;
};

/**
 * @param {string} pathname
 */
const normalizeRoutePath = (pathname) => {
  let normalized = pathname.replace(/\/(README|_index|index)$/i, '/');
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, '/');
  return normalized;
};

/**
 * Transforms a markdown link to its corresponding route path
 */
/**
 * @param {string} url
 * @param {string} baseUrl
 */
const transformInternalUrl = (url, baseUrl) => {
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

/**
 * Calculates the base URL for a file relative to the content directory
 */
/**
 * @param {{ filename: string, cwd: string }} fileData
 * @param {string} contentPath
 */
const getBaseUrl = (fileData, contentPath) => {
  const filePath = pathPosix.normalize(normalizePathSeparators(fileData.filename || ''));
  const cwd = pathPosix.normalize(normalizePathSeparators(fileData.cwd || process.cwd()));
  const normalizedContentPath = trimSlashes(normalizePathSeparators(contentPath));
  if (!filePath || !normalizedContentPath) return null;

  let rel = filePath;
  if (cwd && (filePath === cwd || filePath.startsWith(cwd + '/'))) {
    rel = filePath === cwd ? '' : filePath.slice(cwd.length + 1);
  }

  if (!rel.startsWith(normalizedContentPath + '/')) return null;

  rel = rel.slice(normalizedContentPath.length + 1);
  const dir = normalizePathSeparators(dirname(rel));
  return dir === '.' ? '/' : '/' + dir;
};

/**
 * A remark plugin that processes internal markdown links to generate correct routing URLs.
 * Transforms markdown extensions and handles path resolution while preserving external links.
 *
 * @param contentPath - Root directory containing content files (defaults to 'content')
 */
/**
 * @param {string} [contentPath]
 * @returns {import('unified').Transformer}
 */
export function fixMarkdownUrls(contentPath = DEFAULT_CONTENT_PATH) {
  /**
   * @param {import('unist').Node} tree
   * @param {import('vfile').VFile & { filename?: string }} file
   */
  return function transformer(tree, file) {
    // MDSvex may use 'filename' instead of 'path'
    const anyFile = /** @type {import('vfile').VFile & { filename?: string }} */ (file);
    const fileData = {
      filename: anyFile.filename ?? anyFile.path ?? '',
      cwd: anyFile.cwd ?? process.cwd(),
    };
    const baseUrl = getBaseUrl(fileData, contentPath);
    if (!baseUrl) return;

    /**
     * @param {import('mdast').Link | import('mdast').Definition} node
     */
    const rewriteUrl = (node) => {
      const { url } = node;

      if (!url || isExternalUrl(url)) return;

      const { path } = splitUrl(url);
      if (!path) return;

      const normalizedPath = trimTrailingSlashes(normalizePathSeparators(path));
      if (!normalizedPath) return;
      if (!findMarkdownExtension(normalizedPath)) return;

      // Transform the URL
      node.url = transformInternalUrl(url, baseUrl);
    };

    visit(tree, 'link', (node) => rewriteUrl(node));
    visit(tree, 'definition', (node) => rewriteUrl(node));
  };
}
