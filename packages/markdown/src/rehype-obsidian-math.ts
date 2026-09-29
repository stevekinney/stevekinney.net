import { Buffer } from 'node:buffer';

import type { Element, Root, Text, RootContent } from 'hast';
import type { Raw } from 'mdast-util-to-hast';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import rehypeMathjax from 'rehype-mathjax';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

const MATH_MARKER_ATTRIBUTES = [
  'data-obsidian-math',
  'data-display',
  'dataObsidianMath',
  'dataDisplay',
] as const;
const MATHJAX_OPTIONS = {
  svg: { fontCache: 'none' as const },
  tex: {
    packages: AllPackages.filter((name) => name !== 'noerrors' && name !== 'noundefined'),
    formatError: (_jax: unknown, error: unknown): never => {
      throw error;
    },
  },
};

const rawValue = (value: unknown): string | undefined => {
  if (
    value &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'raw' &&
    'value' in value &&
    typeof value.value === 'string'
  )
    return value.value;
  return undefined;
};

const mathCode = (encoded: string, display: string): Element => ({
  type: 'element',
  tagName: 'code',
  properties: {
    className: ['language-math', display === 'block' ? 'math-display' : 'math-inline'],
  },
  children: [{ type: 'text', value: decodeMath(encoded) }],
});

const isMathMarker = (node: Element): boolean => {
  if (node.tagName !== 'span' && node.tagName !== 'div') return false;
  const display = node.properties?.['data-display'] ?? node.properties?.dataDisplay;
  const encoded = node.properties?.['data-obsidian-math'] ?? node.properties?.dataObsidianMath;
  if (display !== (node.tagName === 'span' ? 'inline' : 'block')) return false;
  if (typeof encoded !== 'string') return false;
  if (node.children.length !== 0) return false;
  return Object.keys(node.properties ?? {}).every((key) =>
    MATH_MARKER_ATTRIBUTES.includes(key as (typeof MATH_MARKER_ATTRIBUTES)[number]),
  );
};

const decodeMath = (encoded: string): string => {
  if (!/^[A-Za-z0-9_-]+$/u.test(encoded)) throw new Error('Invalid Obsidian math marker encoding.');
  const decoded = Buffer.from(encoded, 'base64url');
  if (decoded.toString('base64url') !== encoded)
    throw new Error('Invalid Obsidian math marker encoding.');
  return decoded.toString('utf8');
};

const lowerMarkers = (tree: Root): void => {
  const walk = (parent: Root | Element): void => {
    for (let index = 0; index < parent.children.length; index += 1) {
      const child = parent.children[index];
      const raw = rawValue(child);
      if (
        raw?.startsWith('<span data-obsidian-math=') ||
        raw?.startsWith('<div data-obsidian-math=')
      ) {
        const complete =
          /<(span|div) data-obsidian-math="([^"]*)" data-display="(inline|block)"><\/\1>/g;
        const matches = [...raw.matchAll(complete)];
        if (matches.length) {
          const replacements: RootContent[] = [];
          let offset = 0;
          for (const match of matches) {
            if ((match[1] === 'span') !== (match[3] === 'inline'))
              throw new Error('Invalid Obsidian math marker.');
            if (match.index > offset)
              replacements.push({
                type: 'raw',
                value: raw.slice(offset, match.index),
              } satisfies Raw);
            replacements.push(mathCode(match[2], match[3]));
            offset = match.index + match[0].length;
          }
          if (offset < raw.length)
            replacements.push({ type: 'raw', value: raw.slice(offset) } satisfies Raw);
          parent.children.splice(index, 1, ...replacements);
          index += replacements.length - 1;
          continue;
        }
        const match =
          /^<(span|div) data-obsidian-math="([^"]*)" data-display="(inline|block)">(<\/(?:span|div)>)?$/.exec(
            raw,
          );
        if (!match || (match[1] === 'span') !== (match[3] === 'inline'))
          throw new Error('Invalid Obsidian math marker.');
        const closing = `</${match[1]}>`;
        if (match[4] ? match[4] !== closing : rawValue(parent.children[index + 1]) !== closing) {
          throw new Error('Invalid Obsidian math marker closing tag.');
        }
        parent.children.splice(index, match[4] ? 1 : 2, mathCode(match[2], match[3]));
        continue;
      }
      if (child.type !== 'element') continue;
      if (isMathMarker(child)) {
        const display = child.properties['data-display'] ?? child.properties.dataDisplay;
        const encoded = child.properties['data-obsidian-math'] ?? child.properties.dataObsidianMath;
        const value = decodeMath(String(encoded));
        const text: Text = { type: 'text', value };
        parent.children[index] = {
          type: 'element',
          tagName: 'code',
          properties: {
            className: ['language-math', display === 'block' ? 'math-display' : 'math-inline'],
          },
          children: [text],
        };
        continue;
      }
      walk(child);
    }
  };
  walk(tree);
};

const containsMathError = (tree: Root): boolean => {
  let found = false;
  const walk = (parent: Root | Element): void => {
    for (const child of parent.children) {
      if (child.type !== 'element') continue;
      if (
        child.properties?.className instanceof Array &&
        child.properties.className.includes('mathjax-error')
      )
        found = true;
      if (
        child.properties?.['data-mml-node'] === 'merror' ||
        child.properties?.dataMmlNode === 'merror'
      )
        found = true;
      if (child.tagName === 'merror') found = true;
      walk(child);
    }
  };
  walk(tree);
  return found;
};

const removeStyles = (tree: Root, originalStyles: ReadonlySet<Element>): void => {
  const walk = (parent: Root | Element): void => {
    parent.children = parent.children.filter(
      (child) => child.type !== 'element' || child.tagName !== 'style' || originalStyles.has(child),
    );
    for (const child of parent.children) if (child.type === 'element') walk(child);
  };
  walk(tree);
};

const renderMath = rehypeMathjax(MATHJAX_OPTIONS) as unknown as (tree: Root, file: VFile) => void;

const rehypeObsidianMath: Plugin<[], Root> = () => (tree, file) => {
  lowerMarkers(tree);
  const originalStyles = new Set<Element>();
  visit(tree, 'element', (node) => {
    if (node.tagName === 'style') originalStyles.add(node);
  });
  renderMath(tree, file);
  if (
    containsMathError(tree) ||
    file.messages.some((message) => message.source === 'rehype-mathjax')
  )
    throw new Error(`Invalid Obsidian TeX in ${file.path || 'document'}.`);
  removeStyles(tree, originalStyles);
};

export const getObsidianMathStylesheet = (): string => {
  const tree: Root = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: { className: ['math-inline'] },
        children: [{ type: 'text', value: 'x' }],
      },
    ],
  };
  const file = { path: 'obsidian-math.css' } as VFile;
  const stylesheetTree = tree as Root & { children: Root['children'] };
  const stylesheetRenderer = rehypeMathjax(MATHJAX_OPTIONS) as unknown as (
    tree: Root,
    file: VFile,
  ) => void;
  stylesheetRenderer(stylesheetTree, file);
  const style = stylesheetTree.children.find(
    (child) => child.type === 'element' && child.tagName === 'style',
  );
  if (!style || style.type !== 'element') throw new Error('MathJax did not generate a stylesheet.');
  return style.children
    .filter((child) => child.type === 'text')
    .map((child) => child.value)
    .join('');
};

export default rehypeObsidianMath;
