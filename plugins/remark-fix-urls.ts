import { dirname, posix as pathPosix } from 'path';
import type { Link, Root } from 'mdast';
import type { Transformer } from 'unified';
import type { VFile } from 'vfile';
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
 */
const isExternalUrl = (url: string): boolean =>
  URL_PATTERNS.EXTERNAL.test(url) || url.startsWith('mailto:') || url.startsWith('tel:');

/**
 * Transforms a markdown link to its corresponding route path
 */
const transformInternalUrl = (url: string, baseUrl: string): string => {
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

interface FileData {
  filename: string;
  cwd: string;
}

/**
 * Calculates the base URL for a file relative to the content directory
 */
const getBaseUrl = (fileData: FileData, contentPath: string): string => {
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
