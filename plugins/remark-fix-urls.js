import { dirname } from 'path';
import { visit } from 'unist-util-visit';

const externalUrl = /^(https?:\/\/|\/\/)/;

import { z } from 'zod';

const fileSchema = z.object({
  filename: z.string(),
  cwd: z.string(),
});

/**
 * Check if the URL is external.
 * @param {string} url
 * @returns
 */
const isExternalUrl = (url) => {
  return externalUrl.test(url);
};

/**
 * A remark plugin to fix the URLs in Markdown files.
 * @type {import('unified').Plugin}
 */
export const fixMarkdownUrls = (contentPath = 'content') => {
  return (tree, file) => {
    const { filename, cwd } = fileSchema.parse(file);
    const baseUrl = '/' + dirname(filename.replace(`${cwd}/`, '')).replace(`${contentPath}/`, '');

    visit(tree, 'link', (/** @type {import('mdast').Link} */ node) => {
      const { url } = node;
      if (isExternalUrl(url)) return;
      if (!url.includes('.md')) return;
      const updated = `${baseUrl}/${url.replace(/\.md/, '')}`;

      node.url = updated;
    });
  };
};
