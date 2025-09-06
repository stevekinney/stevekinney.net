import { dirname } from 'path';
import { visit } from 'unist-util-visit';
import { z } from 'zod';

/**
 * Constants for URL processing
 */
const URL_PATTERNS = {
  EXTERNAL: /^(https?:\/\/|\/\/)/,
  MARKDOWN_EXTENSION: '.md',
};

const DEFAULT_CONTENT_PATH = 'content';

/**
 * Zod schema for validating file metadata
 */
const FileSchema = z.object({
  filename: z.string(),
  cwd: z.string(),
});

/**
 * Determines if a URL points to an external resource
 * @param {string} url - URL to check
 * @returns {boolean} True if the URL is external
 */
const isExternalUrl = (url) => URL_PATTERNS.EXTERNAL.test(url);

/**
 * Transforms a markdown link to its corresponding route path
 * @param {string} url - Original URL from markdown
 * @param {string} baseUrl - Base URL path
 * @returns {string} Transformed URL
 */
const transformInternalUrl = (url, baseUrl) =>
  `${baseUrl}/${url.replace(URL_PATTERNS.MARKDOWN_EXTENSION, '')}`;

/**
 * Calculates the base URL for a file relative to the content directory
 * @param {object} fileData - Object containing file information
 * @param {string} fileData.filename - Full path to the file
 * @param {string} fileData.cwd - Current working directory
 * @param {string} contentPath - Root content directory path
 * @returns {string} Calculated base URL
 */
const getBaseUrl = (fileData, contentPath) => {
  const { filename, cwd } = fileData;
  return '/' + dirname(filename.replace(`${cwd}/`, '')).replace(`${contentPath}/`, '');
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
    const fileData = FileSchema.parse(file);
    const baseUrl = getBaseUrl(fileData, contentPath);

    visit(tree, 'link', (/** @type {import('mdast').Link} */ node) => {
      const { url } = node;

      // Skip processing if the URL is external or doesn't contain a markdown extension
      if (isExternalUrl(url) || !url.includes(URL_PATTERNS.MARKDOWN_EXTENSION)) {
        return;
      }

      // Transform the URL
      node.url = transformInternalUrl(url, baseUrl);
    });
  };
}
