import type { Plugin } from 'vite';
import type { Root } from 'mdast';

import { fromMarkdown } from 'mdast-util-from-markdown';
import MagicString from 'magic-string';

import { walk } from './utilities/walk-mdast';

function positionToIndices(position: {
  start: { offset?: number };
  end: { offset?: number };
}): [number, number] {
  const start = position.start.offset ?? 0;
  const end = position.end.offset ?? 0;
  return [start, end];
}

export const getTailwindExamples = (): Plugin => {
  return {
    name: 'get-tailwind-examples',
    enforce: 'pre',
    async transform(code, id) {
      const filename = id.split('?')[0];
      if (filename.includes('tailwind') && filename.endsWith('.md')) {
        const content = new MagicString(code);
        const tree: Root = fromMarkdown(code);
        for (const node of walk(tree, 'code')) {
          if (node.lang === 'html' && node.meta?.includes('tailwind')) {
            if (node.position) {
              const [start] = positionToIndices(node.position);
              const htmlLiteral = JSON.stringify(node.value);
              content.prependLeft(start, `<TailwindPlayground html={${htmlLiteral}} />\n\n`);
            }
          }
        }

        return {
          code: content.toString(),
          map: content.generateMap({ hires: true }),
        };
      }
    },
  };
};
