import { visit } from 'unist-util-visit';

/**
 * Remark plugin to escape less-than characters in text nodes so they don't get
 * interpreted as HTML by mdsvex/Svelte.
 *
 * This intentionally escapes every raw '<' in text nodes to cover comparators
 * and other permutations like "<=", "<<", "<-", "<3", "x<y", or "<\n".
 * Code blocks and inline code are left untouched because they are separate nodes.
 * @returns {import('unified').Transformer}
 */
export default function remarkEscapeComparators() {
  /**
   * @param {import('unist').Node} tree
   */
  return function transformer(tree) {
    /**
     * @param {import('mdast').Text} node
     */
    const escapeText = (node) => {
      if (!node || typeof node.value !== 'string') return;
      if (!node.value.includes('<')) return;

      // Replace any raw '<' so Svelte doesn't parse it as markup.
      node.value = node.value.replace(/</g, '&lt;');
    };

    visit(tree, 'text', escapeText);
  };
}
