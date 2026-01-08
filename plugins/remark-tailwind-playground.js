import { visit } from 'unist-util-visit';
import DOMPurify from 'isomorphic-dompurify';

// DOMPurify configuration for sanitizing Tailwind playground HTML at build time
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'div',
    'span',
    'p',
    'a',
    'button',
    'input',
    'label',
    'form',
    'select',
    'option',
    'textarea',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'img',
    'svg',
    'path',
    'section',
    'article',
    'header',
    'footer',
    'nav',
    'main',
    'aside',
    'code',
    'pre',
    // Inline formatting elements
    'em',
    'strong',
    'b',
    'i',
    'u',
    'small',
    'mark',
    'del',
    'ins',
    'sub',
    'sup',
    'br',
    'hr',
  ],
  ALLOWED_ATTR: [
    'class',
    'id',
    'href',
    'src',
    'alt',
    'title',
    'type',
    'value',
    'placeholder',
    'for',
    'role',
    'tabindex',
    // Form attributes
    'name',
    'disabled',
    'checked',
    'selected',
    'rows',
    'cols',
    'readonly',
    'required',
    'multiple',
    // SVG attributes
    'd',
    'viewBox',
    'fill',
    'stroke',
    'width',
    'height',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'xmlns',
    // Inline styles (needed for grid layout examples)
    'style',
  ],
  // DOMPurify defaults allow aria-* and data-* attributes
};

/**
 * Injects Tailwind playground components before HTML code blocks flagged with `tailwind`.
 * HTML is sanitized at build time to prevent XSS and avoid runtime jsdom dependency.
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

      // Sanitize HTML at build time to prevent XSS
      const sanitizedHtml = DOMPurify.sanitize(node.value ?? '', DOMPURIFY_CONFIG);
      const htmlLiteral = JSON.stringify(sanitizedHtml);
      const playgroundNode = /** @type {import('mdast').Html} */ ({
        type: 'html',
        value: `<TailwindPlayground html={${htmlLiteral}} />`,
      });

      parent.children.splice(index, 0, playgroundNode);

      return index + 2;
    });
  };
}
