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

const DEFAULT_CONTENT_PATHS = ['content'];

/**
 * @param {string} value
 */
const isWindowsAbsolutePath = (value) => /^[a-zA-Z]:\//.test(value);

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
 * @param {string} value
 */
const toAbsolutePosix = (value, cwd = process.cwd()) => {
  const normalized = normalizePathSeparators(value || '');
  if (!normalized) return '';
  if (normalized.startsWith('//')) return pathPosix.normalize(normalized);
  if (isWindowsAbsolutePath(normalized)) return pathPosix.normalize(normalized);
  if (normalized.startsWith('/')) return pathPosix.normalize(normalized);
  return pathPosix.normalize(pathPosix.join(normalizePathSeparators(cwd), normalized));
};

/**
 * @param {string} contentPath
 */
const getRouteRoot = (contentPath) => {
  const trimmed = trimSlashes(normalizePathSeparators(contentPath));
  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  if (parts.at(-1) === 'content') return '/';
  if (parts.length >= 2 && parts.at(-2) === 'content') return `/${parts.at(-1)}`;
  return `/${parts.at(-1)}`;
};

/**
 * @param {{ filename: string, cwd: string }} fileData
 * @param {string[]} contentPaths
 */
const getBaseUrl = (fileData, contentPaths) => {
  const filePath = toAbsolutePosix(fileData.filename || '', fileData.cwd);
  if (!filePath) return null;

  const candidates = contentPaths
    .flatMap((contentPath) => {
      const normalizedContentPath = normalizePathSeparators(contentPath);
      const trimmedContentPath = trimSlashes(normalizedContentPath);
      const pathVariants = [
        ...new Set([normalizedContentPath, trimmedContentPath].filter(Boolean)),
      ];

      return pathVariants.map((pathVariant) => {
        const absoluteRoot = toAbsolutePosix(pathVariant, fileData.cwd);
        const routeRoot = getRouteRoot(trimmedContentPath || normalizedContentPath);
        return {
          absoluteRoot,
          routeRoot,
        };
      });
    })
    .filter((candidate) => candidate.absoluteRoot)
    .sort((a, b) => b.absoluteRoot.length - a.absoluteRoot.length);

  for (const candidate of candidates) {
    const { absoluteRoot, routeRoot } = candidate;
    if (filePath === absoluteRoot || filePath.startsWith(`${absoluteRoot}/`)) {
      const rel = filePath === absoluteRoot ? '' : filePath.slice(absoluteRoot.length + 1);
      const dir = normalizePathSeparators(dirname(rel));
      if (!dir || dir === '.') return routeRoot;
      const routePrefix = routeRoot === '/' ? '' : routeRoot;
      return `${routePrefix}/${trimSlashes(dir)}`;
    }
  }

  return null;
};

/**
 * A remark plugin that rewrites internal markdown links to route paths.
 *
 * @param {string | string[]} [contentPaths]
 * @returns {import('unified').Transformer}
 */
export function fixMarkdownUrls(contentPaths = DEFAULT_CONTENT_PATHS) {
  const normalizedContentPaths = Array.isArray(contentPaths)
    ? contentPaths.filter(Boolean)
    : [contentPaths];

  /**
   * @param {import('unist').Node} tree
   * @param {import('vfile').VFile & { filename?: string }} file
   */
  return function transformer(tree, file) {
    const anyFile = /** @type {import('vfile').VFile & { filename?: string }} */ (file);
    const fileData = {
      filename: anyFile?.filename ?? anyFile?.path ?? '',
      cwd: anyFile?.cwd ?? process.cwd(),
    };

    if (!fileData.filename) return;

    const baseUrl = getBaseUrl(fileData, normalizedContentPaths);
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

      node.url = transformInternalUrl(url, baseUrl);
    };

    visit(tree, 'link', (node) => rewriteUrl(node));
    visit(tree, 'definition', (node) => rewriteUrl(node));
  };
}
