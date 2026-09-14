import { parse as parseMicromark, preprocess } from 'micromark';
import { unified } from 'unified';
import remarkGfm from 'remark-gfm';
import { remarkHighlightMark } from 'remark-highlight-mark';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import wikiLink from '@flowershow/remark-wiki-link';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

import type { ObsidianNode, ObsidianSourceAst } from './obsidian-types.ts';
import { obsidianLocalSyntax, remarkObsidianLocal } from './obsidian-local-syntax.ts';
import { maskObsidianProtectedSource } from './obsidian-protected-source.ts';

type Positioned = { start: { offset: number }; end: { offset: number } };

const positionOf = (node: unknown): Positioned | undefined => {
  if (!node || typeof node !== 'object' || !('position' in node)) return undefined;
  const position = node.position;
  if (!position || typeof position !== 'object') return undefined;
  if (!('start' in position) || !('end' in position)) return undefined;
  const start = position.start;
  const end = position.end;
  if (!start || !end || typeof start !== 'object' || typeof end !== 'object') return undefined;
  if (!('offset' in start) || !('offset' in end)) return undefined;
  if (typeof start.offset !== 'number' || typeof end.offset !== 'number') return undefined;
  return position as Positioned;
};

const offsetsOf = (node: unknown): { start: number; end: number } | undefined => {
  if (!node || typeof node !== 'object' || !('position' in node)) return undefined;
  const position = node.position;
  if (!position || typeof position !== 'object') return undefined;
  if (!('start' in position) || !('end' in position)) return undefined;
  const start = position.start;
  const end = position.end;
  if (typeof start === 'number' && typeof end === 'number') return { start, end };
  const nested = positionOf(node);
  return nested ? { start: nested.start.offset, end: nested.end.offset } : undefined;
};

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(wikiLink)
  .use(remarkMath)
  .use(remarkHighlightMark)
  .use(remarkObsidianLocal);

const currencyAmount = /^\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?(?![\w])/u;
const currencyProse = /[A-Za-z]{2,}|[-–—]\s*$/u;

/** Mask currency markers so prose prices cannot be consumed as inline math delimiters. */
const maskCurrencyMarkers = (source: string): string => {
  const masked = source.split('');

  for (let index = 0; index < source.length; index++) {
    if (source[index] !== '$' || source[index - 1] === '$' || source[index + 1] === '$') continue;
    if (!currencyAmount.test(source.slice(index + 1))) continue;

    const closing = source.indexOf('$', index + 1);
    const value = closing === -1 ? undefined : source.slice(index + 1, closing);
    if (value === undefined || currencyProse.test(value)) masked[index] = ' ';
  }

  return masked.join('');
};

const parsedSources = new Map<string, ObsidianSourceAst>();

/** Parse Obsidian Markdown while retaining source offsets for supported syntax. */
export const parseObsidianSource = (source: string): ObsidianSourceAst => {
  const cached = parsedSources.get(source);
  if (cached) return cached;
  const masked = maskCurrencyMarkers(maskObsidianProtectedSource(source)).split('');
  const nodes: ObsidianNode[] = [];
  // A comment may cross paragraph/fence boundaries. Recognize its opener with the
  // document parser, then let the same micromark construct consume an uninterrupted
  // text stream. Mask it and reparse so private fences cannot affect public syntax.
  let tree: Root;
  while (true) {
    const candidateTree = parser.parse(masked.join('')) as Root;
    let opening: number | undefined;
    visit(candidateTree, (node) => {
      if ((node.type as string) === 'comment' && opening === undefined)
        opening = node.position?.start.offset;
    });
    if (opening === undefined) {
      tree = candidateTree;
      break;
    }
    const events = parseMicromark({ extensions: [obsidianLocalSyntax()] })
      .text()
      .write(preprocess()(source.slice(opening), undefined, true));
    const token = events.find(
      (event) => event[0] === 'exit' && event[1].type === 'obsidianComment',
    )?.[1];
    if (!token || token.end.offset === 0)
      throw new Error('Obsidian comment tokenizer did not advance.');
    const end = opening + token.end.offset;
    nodes.push({
      type: 'comment',
      value: source.slice(opening, end),
      position: { start: opening, end },
    });
    for (let index = opening; index < end; index++)
      if (masked[index] !== '\n' && masked[index] !== '\r') masked[index] = ' ';
  }
  parser.runSync(tree);
  visit(tree, (node) => {
    const nodeType = (node as unknown as { type: string }).type;
    if (
      ![
        'wikiLink',
        'embed',
        'comment',
        'blockDefinition',
        'inlineMath',
        'math',
        'highlight',
      ].includes(nodeType)
    ) {
      return;
    }
    const position = offsetsOf(node);
    if (!position) return;
    if (
      nodeType === 'wikiLink' &&
      position.start >= 2 &&
      source.slice(position.start - 2, position.start) === '[['
    ) {
      position.start -= 2;
    }
    nodes.push({
      type: nodeType as ObsidianNode['type'],
      value: 'value' in node && typeof node.value === 'string' ? node.value : '',
      alias:
        'data' in node && node.data && typeof node.data === 'object' && 'alias' in node.data
          ? typeof node.data.alias === 'string'
            ? node.data.alias
            : undefined
          : undefined,
      position,
    });
  });
  const result = { source, nodes, tree };
  if (parsedSources.size >= 128) parsedSources.delete(parsedSources.keys().next().value!);
  parsedSources.set(source, result);
  return result;
};
