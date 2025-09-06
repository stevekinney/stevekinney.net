import type { Plugin } from 'vite';
import type { Root } from 'mdast';

import { fromMarkdown } from 'mdast-util-from-markdown';
import MagicString from 'magic-string';
import crypto from 'node:crypto';

import { walk } from './utilities/walk-mdast';

function positionToIndices(position: {
  start: { offset?: number };
  end: { offset?: number };
}): [number, number] {
  const start = position.start.offset ?? 0;
  const end = position.end.offset ?? 0;
  return [start, end];
}

function toTailwindPlayground(html: string, hash: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" nonce="${hash}"></script>
  </head>
  <body>
    ${html}
  </body>
  <script type="module" defer nonce="${hash}">
    const height = document.body.scrollHeight;
    const origin = window.location.origin;
    window.postMessage({ type: 'initialize', height }, origin);
  </script>
</html>`.trim();
}

export const getTailwindExamples = (): Plugin => {
  const hashs = new Set<string>();
  return {
    name: 'get-tailwind-examples',
    enforce: 'pre',
    apply: 'build',
    async transform(code, id) {
      if (id.includes('tailwind') && id.endsWith('.md')) {
        const content = new MagicString(code);
        const tree: Root = fromMarkdown(code);
        for (const node of walk(tree, 'code')) {
          if (node.lang === 'html' && node.meta?.includes('tailwind')) {
            const hash = crypto.createHash('sha256').update(node.value).digest('hex');
            const fileName = `tailwind-${hash}.html`;
            const source = toTailwindPlayground(node.value, hash);

            if (node.position) {
              const [start] = positionToIndices(node.position);
              content.prependLeft(start, `<TailwindPlayground hash="${hash}"/>\n\n`);
            }

            if (!hashs.has(hash)) {
              this.emitFile({
                type: 'asset',
                fileName,
                source,
              });
              hashs.add(hash);
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
