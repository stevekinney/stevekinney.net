import { visit } from 'unist-util-visit';

/**
 * Remark plugin to escape less-than characters used as textual comparators
 * so they don't get interpreted as HTML by mdsvex/Svelte.
 *
 * Replaces occurrences of '<' in plain text nodes when followed by a space or digit
 * with the HTML entity '&lt;'. Code blocks and inline code are left untouched.
 * @returns {import('unified').Plugin}
 */
/**
 * @returns {import('unified').Transformer<import('mdast').Root>}
 */
export default function remarkEscapeComparators() {
  /** @type {import('unified').Transformer<import('mdast').Root>} */
  return function transformer(tree) {
    visit(tree, 'text', (node, _index, _parent) => {
      // Skip inside links' urls, code or HTML nodes are not 'text' type
      if (!node || typeof node.value !== 'string') return;
      // Replace '<' that would otherwise be interpreted as HTML
      node.value = node.value.replace(/<(\s|\d)/g, '&lt;$1');
    });
  };
}
