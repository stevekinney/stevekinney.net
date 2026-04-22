import { visit } from 'unist-util-visit';
import {
  encodeTailwindPlaygroundHtml,
  sanitizeTailwindPlaygroundHtml,
} from '@stevekinney/utilities/tailwind-playground';
import type { Transformer } from 'unified';
import type { Code, Html, Parent, Root } from 'mdast';
import type { VFile } from 'vfile';

type VFileWithFilename = VFile & { filename?: string };

/**
 * Injects empty preview placeholders before HTML code blocks flagged with
 * `tailwind`. The actual preview markup is hydrated by a small standalone
 * enhancement script, which keeps mdsvex output free of raw demo markup and
 * prevents intentional accessibility anti-patterns from surfacing as Svelte
 * compiler warnings.
 */
export default function remarkTailwindPlayground(): Transformer<Root> {
  return function transformer(tree: Root, file: VFileWithFilename): void {
    const filePath = (file.filename ?? file.path ?? '').toString();
    if (filePath && !filePath.endsWith('.md')) return;

    const handleCode = (
      node: Code,
      index: number | undefined,
      parent: Parent | undefined,
    ): number | undefined => {
      if (!parent || typeof index !== 'number') return;
      if (!Array.isArray(parent.children)) return;
      if (node.lang !== 'html') return;
      if (!node.meta || !node.meta.includes('tailwind')) return;

      const sanitizedHtml = sanitizeTailwindPlaygroundHtml(node.value ?? '');
      const encodedHtml = encodeTailwindPlaygroundHtml(sanitizedHtml);
      const playgroundNode: Html = {
        type: 'html',
        value: `<div class="tailwind-playground not-prose mb-2 rounded-md bg-slate-100 p-4 shadow-sm dark:bg-slate-800" data-tailwind-playground data-tailwind-playground-html="${encodedHtml}"></div>`,
      };

      parent.children.splice(index, 0, playgroundNode);

      return index + 2;
    };

    visit(tree, 'code', handleCode);
  };
}
