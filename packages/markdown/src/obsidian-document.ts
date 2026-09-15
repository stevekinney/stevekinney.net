import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import { applySourceEdits, escapeMarkdownLabel, type SourceEdit } from './obsidian-source-edits.ts';
import { maskObsidianProtectedSource } from './obsidian-protected-source.ts';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { Root } from 'mdast';

import { parseObsidianSource } from './obsidian-syntax.ts';
import type { ObsidianDiagnostic, PublicationDocument, ObsidianNode } from './obsidian-types.ts';

export type ObsidianDocumentMetadata = {
  headings: Array<{
    id: string;
    text: string;
    depth: number;
    start: number;
    end: number;
    sectionEnd: number;
  }>;
  blocks: Array<{ id: string; start: number; end: number; markerStart: number; markerEnd: number }>;
  htmlIds: string[];
  definitions: Array<{
    identifier: string;
    start: number;
    end: number;
    type: 'definition' | 'footnoteDefinition';
  }>;
  bodyStart: number;
  diagnostics: ObsidianDiagnostic[];
};

const parser = unified().use(remarkParse).use(remarkGfm);
const cache = new WeakMap<PublicationDocument, ObsidianDocumentMetadata>();

type Positioned = { position?: { start?: { offset?: number }; end?: { offset?: number } } };
const offsets = (node: Positioned): { start: number; end: number } | undefined => {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  return typeof start === 'number' && typeof end === 'number' ? { start, end } : undefined;
};

const diagnostic = (
  document: PublicationDocument,
  offset: number,
  message: string,
): ObsidianDiagnostic => ({
  file: document.sourcePath,
  line: document.source.slice(0, offset).split(/\r?\n/u).length,
  message,
});

const maskProtected = (source: string, nodes: readonly ObsidianNode[]): string => {
  const characters = maskObsidianProtectedSource(source).split('');
  for (const node of nodes) {
    if (node.type !== 'comment' && node.type !== 'blockDefinition') continue;
    for (let index = node.position.start; index < node.position.end; index += 1) {
      if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' ';
    }
  }
  const frontmatter = source.match(/^(?:\uFEFF)?---(?:\r?\n|$)[\s\S]*?\r?\n---(?:\r?\n|$)/u);
  if (frontmatter) {
    for (let index = 0; index < frontmatter[0].length; index += 1) {
      if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' ';
    }
  }
  return characters.join('');
};

const protectedRanges = (
  source: string,
  nodes: readonly ObsidianNode[],
): Array<{ start: number; end: number }> => {
  const ranges = nodes
    .filter((node) => node.type === 'comment' || node.type === 'blockDefinition')
    .map((node) => node.position);
  const frontmatter = source.match(/^(?:\uFEFF)?---(?:\r?\n|$)[\s\S]*?\r?\n---(?:\r?\n|$)/u);
  if (frontmatter) ranges.push({ start: 0, end: frontmatter[0].length });
  return ranges;
};

const headingText = (source: string, start: number, end: number): string => {
  const fragment = source.slice(start, end);
  const edits: SourceEdit[] = [];
  for (const node of parseObsidianSource(fragment).nodes) {
    if (node.type === 'highlight')
      edits.push(
        { start: node.position.start, end: node.position.start + 2, value: '' },
        { start: node.position.end - 2, end: node.position.end, value: '' },
      );
    else if (node.type === 'wikiLink') {
      const raw = fragment.slice(node.position.start + 2, node.position.end - 2);
      edits.push({
        ...node.position,
        value: escapeMarkdownLabel(raw.includes('|') ? raw.slice(raw.indexOf('|') + 1) : raw),
      });
    } else if (['comment', 'blockDefinition', 'inlineMath', 'math'].includes(node.type))
      edits.push({ ...node.position, value: '' });
  }
  const tree = parser.parse(applySourceEdits(fragment, edits).markdown);
  return toString(tree.children[0] ?? tree, { includeHtml: false });
};

const collectNodes = (node: unknown, output: Positioned[] = []): Positioned[] => {
  if (!node || typeof node !== 'object') return output;
  const positioned = node as Positioned;
  if (offsets(positioned)) output.push(positioned);
  if ('children' in positioned && Array.isArray(positioned.children)) {
    for (const child of positioned.children) collectNodes(child, output);
  }
  return output;
};

const bodyStartOf = (source: string): number => {
  const frontmatter = source.match(/^(?:\uFEFF)?---(?:\r?\n|$)[\s\S]*?\r?\n---(?:\r?\n|$)/u);
  return frontmatter ? frontmatter[0].length : 0;
};

/** Builds and caches positioned metadata for one publication document identity. */
export const getObsidianDocumentMetadata = (
  document: PublicationDocument,
): ObsidianDocumentMetadata => {
  const existing = cache.get(document);
  if (existing) return existing;

  const source = document.source;
  const parsed = parseObsidianSource(source);
  const tree = parsed.nodes.some((node) => node.type === 'blockDefinition')
    ? (parser.parse(maskProtected(source, parsed.nodes)) as Root)
    : parsed.tree;
  const slugger = new GithubSlugger();
  const headings: ObsidianDocumentMetadata['headings'] = [];
  const htmlIds: string[] = [];
  const protectedSourceRanges = protectedRanges(source, parsed.nodes);
  for (const node of collectNodes(parser.parse(source))) {
    const candidate = node as Positioned & { type?: string; value?: string };
    if (candidate.type !== 'html' || typeof candidate.value !== 'string') continue;
    const position = offsets(candidate);
    if (!position) continue;
    for (const match of candidate.value.matchAll(/(?:^|[\s<])id=(['"])([^'"]+)\1/g)) {
      const idStart = position.start + match.index + match[0].indexOf('id=');
      if (protectedSourceRanges.some((range) => idStart >= range.start && idStart < range.end))
        continue;
      htmlIds.push(match[2]);
    }
  }
  const headingNodes = collectNodes(tree).filter((node) => {
    const candidate = node as Positioned & { type?: string };
    return candidate.type === 'heading';
  });
  for (const node of headingNodes) {
    const position = offsets(node);
    if (!position) continue;
    const typed = node as import('mdast').Heading;
    const text = /\[\[|==|\$|%%|\^/.test(source.slice(position.start, position.end))
      ? headingText(source, position.start, position.end)
      : toString(typed, { includeHtml: false });
    headings.push({
      id: slugger.slug(text),
      text,
      depth: typed.depth,
      start: position.start,
      end: position.end,
      sectionEnd: source.length,
    });
  }
  headings.forEach((heading, index) => {
    const next = headings.slice(index + 1).find((candidate) => candidate.depth <= heading.depth);
    heading.sectionEnd = next?.start ?? source.length;
  });

  const diagnostics: ObsidianDiagnostic[] = [];
  const blocks: ObsidianDocumentMetadata['blocks'] = [];
  const definitions: ObsidianDocumentMetadata['definitions'] = [];
  const occupied = new Map<string, string>();
  for (const heading of headings) occupied.set(heading.id, 'heading');
  for (const marker of parsed.nodes.filter((node) => node.type === 'blockDefinition')) {
    const lineStart = source.lastIndexOf('\n', marker.position.start - 1) + 1;
    const lineEnd = source.indexOf('\n', marker.position.end);
    const standalone =
      source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd).trim() === `^${marker.value}`;
    const blockNodes = collectNodes(tree).filter((node) => {
      const candidate = node as Positioned & { type?: string };
      return ['paragraph', 'list', 'blockquote', 'table', 'heading', 'code'].includes(
        candidate.type ?? '',
      );
    });
    const candidates = standalone ? tree.children : blockNodes;
    const container = [...candidates]
      .filter((node) => {
        const position = offsets(node);
        return (
          position &&
          position.start < marker.position.start &&
          (position.end >= marker.position.start ||
            !source.slice(position.end, marker.position.start).trim())
        );
      })
      .sort((a, b) =>
        standalone
          ? offsets(b)!.end - offsets(a)!.end
          : offsets(a)!.end - offsets(a)!.start - (offsets(b)!.end - offsets(b)!.start),
      )[0];
    const containerPosition = container && offsets(container);
    if (!containerPosition) {
      diagnostics.push(
        diagnostic(document, marker.position.start, `Detached block reference: ^${marker.value}`),
      );
      continue;
    }
    const { start, end } = containerPosition;
    const blockId = `block-${marker.value}`;
    if (occupied.has(blockId)) {
      diagnostics.push(
        diagnostic(
          document,
          marker.position.start,
          `Duplicate Obsidian block identifier: ${marker.value}`,
        ),
      );
      continue;
    }
    occupied.set(blockId, 'block');
    blocks.push({
      id: marker.value,
      start,
      end,
      markerStart: marker.position.start,
      markerEnd: marker.position.end,
    });
  }
  for (const node of collectNodes(tree)) {
    const candidate = node as Positioned & { type?: string; identifier?: string };
    if (candidate.type !== 'definition' && candidate.type !== 'footnoteDefinition') continue;
    const position = offsets(candidate);
    if (position && candidate.identifier) {
      definitions.push({
        identifier: candidate.identifier,
        start: position.start,
        end: position.end,
        type: candidate.type,
      });
    }
  }
  const metadata = {
    headings,
    blocks,
    htmlIds,
    definitions,
    bodyStart: bodyStartOf(source),
    diagnostics,
  };
  cache.set(document, metadata);
  return metadata;
};
