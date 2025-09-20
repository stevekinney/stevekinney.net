import { dirname, posix as pathPosix } from 'path';
import { visit } from 'unist-util-visit';

/**
 * Constants for URL processing
 */
const URL_PATTERNS = {
  EXTERNAL: /^(https?:\/\/|\/\/)/,
  MARKDOWN_EXTENSION: '.md',
};

const DEFAULT_CONTENT_PATH = 'content';

/**
 * Determines if a URL points to an external resource
 * @param {string} url - URL to check
 * @returns {boolean} True if the URL is external
 */
const isExternalUrl = (url) =>
  URL_PATTERNS.EXTERNAL.test(url) || url.startsWith('mailto:') || url.startsWith('tel:');

/**
 * Transforms a markdown link to its corresponding route path
 * @param {string} url - Original URL from markdown
 * @param {string} baseUrl - Base URL path
 * @returns {string} Transformed URL
 */
const transformInternalUrl = (url, baseUrl) => {
  const match = url.match(/^[^?#]+/);
  const base = match ? match[0] : url;
  const query = url.slice(base.length).replace(/([^#]*)#.*/, '$1');
  const hash = url.includes('#') ? url.slice(url.indexOf('#')) : '';

  // Normalize and join, then strip the extension on the final segment
  const joined = pathPosix.normalize(pathPosix.join(baseUrl || '/', base));
  let withoutExt = joined.endsWith(URL_PATTERNS.MARKDOWN_EXTENSION)
    ? joined.slice(0, -URL_PATTERNS.MARKDOWN_EXTENSION.length)
    : joined;
  // Treat README and _index as directory roots
  withoutExt = withoutExt.replace(/\/(README|_index)$/i, '/');
  // Collapse duplicate trailing slashes
  if (withoutExt.length > 1) withoutExt = withoutExt.replace(/\/+$/, '/');
  return `${withoutExt}${query}${hash}`;
};

/**
 * Calculates the base URL for a file relative to the content directory
 * @param {object} fileData - Object containing file information
 * @param {string} fileData.filename - Full path to the file
 * @param {string} fileData.cwd - Current working directory
 * @param {string} contentPath - Root content directory path
 * @returns {string} Calculated base URL
 */
const getBaseUrl = (fileData, contentPath) => {
  const filePath = (fileData.filename || '').replace(/\\/g, '/');
  const cwd = (fileData.cwd || process.cwd()).replace(/\\/g, '/');
  if (!filePath) return '/';
  let rel = filePath.startsWith(cwd + '/') ? filePath.slice(cwd.length + 1) : filePath;
  if (rel.startsWith(contentPath + '/')) rel = rel.slice(contentPath.length + 1);
  const dir = dirname(rel).replace(/\\/g, '/');
  return dir === '.' ? '/' : '/' + dir;
};

/**
 * A remark plugin that processes internal markdown links to generate correct routing URLs.
 * Transforms `.md` extensions and handles path resolution while preserving external links.
 *
 * @param {string} contentPath - Root directory containing content files (defaults to 'content')
 * @returns {import('unified').Plugin} A unified plugin function
 */
/**
 * @param {string} [contentPath]
 * @returns {import('unified').Transformer<import('mdast').Root>}
 */
export function fixMarkdownUrls(contentPath = DEFAULT_CONTENT_PATH) {
  /** @type {import('unified').Transformer<import('mdast').Root>} */
  return function transformer(tree, file) {
    // Support vfile.path or our filename/cwd fields
    const anyFile = /** @type {any} */ (file);
    const fileData = {
      filename: anyFile.filename ?? anyFile.path ?? '',
      cwd: anyFile.cwd ?? process.cwd(),
    };
    const baseUrl = getBaseUrl(fileData, contentPath);

    visit(tree, 'link', (/** @type {import('mdast').Link} */ node) => {
      const { url } = node;

      // Skip processing if the URL is external or doesn't contain a markdown extension
      if (
        !url ||
        url.startsWith('/') ||
        isExternalUrl(url) ||
        !url.includes(URL_PATTERNS.MARKDOWN_EXTENSION)
      ) {
        return;
      }

      // Transform the URL
      node.url = transformInternalUrl(url, baseUrl);
    });
  };
}
