import rehypeCalloutsPlugin from 'rehype-callouts';
import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';

const CALLOUT_MARKER = /^\[!(?<type>[\w-]+)](?:[+-])?(?=\s|$)/;

/** Render Obsidian callouts with the site's aliases and default theme. */
const rehypeCallouts: Plugin<[], Root> = () => {
  return (tree: Root): void => {
    const ordinaryQuotes: Element[] = [];
    const customCallouts = new Set<string>();

    visit(tree, 'element', (node) => {
      if (node.tagName !== 'blockquote') return;
      const firstChild = node.children.find(
        (child) => child.type === 'element' && child.tagName === 'p',
      );
      if (firstChild?.type !== 'element') return;
      const leadingText = [];
      for (const child of firstChild.children) {
        if (child.type !== 'text') break;
        leadingText.push(child);
      }
      if (leadingText.length > 1) {
        leadingText[0].value = leadingText.map((child) => child.value).join('');
        firstChild.children = [leadingText[0], ...firstChild.children.slice(leadingText.length)];
      }
      const firstText = firstChild.children[0];
      if (firstText?.type !== 'text') {
        ordinaryQuotes.push(node);
        return;
      }

      const escaped = firstText.value.startsWith('\\[');
      const match = CALLOUT_MARKER.exec(escaped ? firstText.value.slice(1) : firstText.value);
      if (escaped && match) firstText.value = firstText.value.slice(1);
      if (match?.groups?.type) customCallouts.add(match.groups.type.toLowerCase());
      else ordinaryQuotes.push(node);
    });

    const createTransform = rehypeCalloutsPlugin as unknown as (
      options: unknown,
    ) => (tree: Root) => void;
    const transform = createTransform({
      callouts: Object.fromEntries([...customCallouts].map((type) => [type, {}])),
      aliases: {
        warning: ['warn'],
        info: ['information'],
      },
    });
    // The package marker matcher is unanchored; shield ordinary quotations.
    for (const node of ordinaryQuotes) node.tagName = 'obsidian-ordinary-quote';
    try {
      transform(tree);
    } finally {
      for (const node of ordinaryQuotes) node.tagName = 'blockquote';
    }
  };
};

export default rehypeCallouts;
