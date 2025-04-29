import { dirname } from 'path';
import { visit } from 'unist-util-visit';
import { z } from 'zod';

// Constants
const EXTERNAL_URL_PATTERN = /^(https?:\/\/|\/\/)/;
const MARKDOWN_EXTENSION = '.md';
const DEFAULT_CONTENT_PATH = 'content';

// Zod schema for file validation
const FileSchema = z.object({
  filename: z.string(),
  cwd: z.string(),
});

/**
 * Determines if a URL points to an external resource
 * @param {string} url - The URL to check
 * @returns {boolean} indicating if the URL is external
 */
const isExternalUrl = (url) => {
  return EXTERNAL_URL_PATTERN.test(url);
};

/**
 * Transforms an internal Markdown URL to its corresponding route path
 * @param {string} url - The original URL from the Markdown file
 * @param {string} baseUrl - The base URL path for the current file
 * @returns {string} The transformed URL
 */
const transformInternalUrl = (url, baseUrl) => {
  return `${baseUrl}/${url.replace(MARKDOWN_EXTENSION, '')}`;
};

/**
 * Calculates the base URL for a file based on its location in the content directory
 * @param {Object} fileData - Object containing file information
 * @param {string} contentPath - The root content directory path
 * @returns {string} The calculated base URL
 */
const getBaseUrl = (/** @type {{ filename: string; cwd: string }} */ fileData, contentPath) => {
  const { filename, cwd } = fileData;
  return '/' + dirname(filename.replace(`${cwd}/`, '')).replace(`${contentPath}/`, '');
};

/**
 * A remark plugin that processes internal Markdown links to generate correct routing URLs.
 * It transforms .md extensions and handles path resolution while preserving external links.
 *
 * @param {string} contentPath - The root directory containing content files (defaults to 'content')
 * @returns import('unified').Plugin} A unified plugin function
 */
export const fixMarkdownUrls = (contentPath = DEFAULT_CONTENT_PATH) => {
  return (
    /** @type {import('mdast').Root} */ tree,
    /** @type {{ filename: string; cwd: string }} */ file,
  ) => {
    const fileData = FileSchema.parse(file);
    const baseUrl = getBaseUrl(fileData, contentPath);

    visit(tree, 'link', (node) => {
      const { url } = node;

      if (isExternalUrl(url) || !url.includes(MARKDOWN_EXTENSION)) {
        return;
      }

      node.url = transformInternalUrl(url, baseUrl);
    });
  };
};
