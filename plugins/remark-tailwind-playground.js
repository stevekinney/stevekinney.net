import { visit } from 'unist-util-visit';

/**
 * Injects Tailwind playground components before HTML code blocks flagged with `tailwind`.
 * @returns {import('unified').Transformer<import('mdast').Root>}
 */
export default function remarkTailwindPlayground() {
  /** @type {import('unified').Transformer<import('mdast').Root>} */
  return function transformer(tree, file) {
    const anyFile = /** @type {any} */ (file);
    const filePath = (anyFile?.path ?? anyFile?.filename ?? '').toString();
    if (!filePath.endsWith('.md') || !filePath.includes('tailwind')) return;

    visit(tree, 'code', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (!Array.isArray(parent.children)) return;
      if (node.lang !== 'html') return;
      if (!node.meta || !node.meta.includes('tailwind')) return;

      const htmlLiteral = JSON.stringify(node.value ?? '');
      const playgroundNode = /** @type {import('mdast').Html} */ ({
        type: 'html',
        value: `<TailwindPlayground html={${htmlLiteral}} />`,
      });

      parent.children.splice(index, 0, playgroundNode);

      return index + 2;
    });
  };
}
