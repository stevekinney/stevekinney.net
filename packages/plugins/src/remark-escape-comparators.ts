import { visit } from 'unist-util-visit';
import type { Transformer } from 'unified';
import type { Root } from 'mdast';

/**
 * Remark plugin to escape less-than characters in text nodes so they don't get
 * interpreted as HTML by mdsvex/Svelte.
 *
 * This intentionally escapes every raw '<' in text nodes to cover comparators
 * and other permutations like "<=", "<<", "<-", "<3", "x<y", or "<\n".
 * Code blocks and inline code are left untouched because they are separate nodes.
 */
export default function remarkEscapeComparators(): Transformer<Root> {
  return function transformer(tree: Root): void {
    visit(tree, 'text', (node) => {
      if (!node || typeof node.value !== 'string') return;
      if (!node.value.includes('<')) return;

      // Replace any raw '<' so Svelte doesn't parse it as markup.
      node.value = node.value.replace(/</g, '&lt;');
    });
  };
}
