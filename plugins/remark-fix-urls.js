import { dirname } from 'path';
import { visit } from 'unist-util-visit';

const externalUrl = /^(https?:\/\/|\/\/)/;

const isExternalUrl = (url) => {
  return externalUrl.test(url);
};

/**
 * A remark plugin to fix the URLs in Markdown files.
 * @type {import('unified').Plugin}
 */
export const fixMarkdownUrls = (contentPath = 'content') => {
  return (tree, { filename, cwd }) => {
    const baseUrl = '/' + dirname(filename.replace(`${cwd}/`, '')).replace(`${contentPath}/`, '');

    visit(tree, 'link', (/** @type {import('mdast').Link} */ node) => {
      const { url } = node;
      if (isExternalUrl(url)) return;
      if (!url.endsWith('.md')) return;
      const updated = `${baseUrl}/${url.replace(/\.md/, '')}`;

      node.url = updated;
    });
  };
};
