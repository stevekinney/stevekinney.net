import { visit } from 'unist-util-visit';
import { parse } from 'yaml';

/**
 * A remark plugin to fix the URLs in Markdown files.
 * @type {import('unified').Plugin}
 */
export const fixMarkdownUrls = () => {
  return (tree) => {
    let baseUrl = '';

    // Find the base URL in the YAML frontmatter.
    visit(tree, 'yaml', (/** @type {import('mdast').Yaml} */ node) => {
      const { base } = parse(node.value);

      if (base) {
        baseUrl = `${base}/`;
      }
    });

    // Fix the URLs in the Markdown files by removing the `.md` extension.
    visit(tree, 'link', (/** @type {import('mdast').Yaml} */ node) => {
      const { url } = node;
      node.url = baseUrl + url.replace(/\.md/, '');
    });
  };
};
