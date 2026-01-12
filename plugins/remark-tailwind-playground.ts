import type { Code, Html, Parent, Root } from 'mdast';
import type { Transformer } from 'unified';
import type { VFile } from 'vfile';
import { visit } from 'unist-util-visit';
import DOMPurify from 'isomorphic-dompurify';

// DOMPurify configuration for sanitizing Tailwind playground HTML at build time
type DomPurifyConfig = Parameters<typeof DOMPurify.sanitize>[1];

const DOMPURIFY_CONFIG: DomPurifyConfig = {
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
 * Injects Tailwind playground custom elements before HTML code blocks flagged with `tailwind`.
 * HTML is sanitized at build time to prevent XSS and avoid runtime jsdom dependency.
 */
export default function remarkTailwindPlayground(): Transformer<Root> {
  return function transformer(tree, file: VFile) {
    const anyFile = file as VFile & { filename?: string };
    const filePath = (anyFile.filename ?? file.path ?? '').toString();
    if (filePath && !filePath.endsWith('.md')) return;

    visit(tree, 'code', (node: Code, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || typeof index !== 'number') return;
      if (!Array.isArray(parent.children)) return;
      if (node.lang !== 'html') return;
      if (!node.meta || !node.meta.includes('tailwind')) return;

      // Sanitize HTML at build time to prevent XSS
      const sanitizedHtml = DOMPurify.sanitize(node.value ?? '', DOMPURIFY_CONFIG);
      const htmlLiteral = JSON.stringify(sanitizedHtml);
      const playgroundNode: Html = {
        type: 'html',
        value: `<TailwindPlayground html={${htmlLiteral}} />`,
      };

      parent.children.splice(index, 0, playgroundNode);

      return index + 2;
    });
  };
}
