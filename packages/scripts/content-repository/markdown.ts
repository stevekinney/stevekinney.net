import { fromHtml } from 'hast-util-from-html';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import path from 'node:path';

import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import type { Root } from 'mdast';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import {
  extractTailwindCandidatesFromHtml,
  extractTailwindPlaygrounds,
  type TailwindPlaygroundFence,
} from '@stevekinney/utilities/tailwind-playground';
import { normalizePath, parseFrontmatter } from '@stevekinney/utilities/frontmatter';

import { repositoryRoot } from '../content-paths.ts';

import type { MarkdownSource } from './types.ts';
import type { ContentValidationIssue } from './types.ts';

const markdownParser = unified().use(remarkParse).use(remarkGfm);
const externalPrefixes = ['http://', 'https://', 'mailto:', 'tel:', 'data:', 'ftp:'];

export const hashContents = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export const isExternalUrl = (value: string): boolean => {
  if (!value) return true;
  if (value.startsWith('#')) return true;
  if (value.startsWith('//')) return true;

  return externalPrefixes.some((prefix) => value.startsWith(prefix));
};

export const stripQueryAndHash = (value: string): string => value.split(/[?#]/)[0] ?? '';

export const relativeSourcePath = (absolutePath: string): string =>
  normalizePath(path.relative(repositoryRoot, absolutePath));

export const readText = async (absolutePath: string): Promise<string> =>
  readFile(absolutePath, 'utf8');

// Bun 1.3.2 can leave asynchronous stat calls pending during collection. Keep
// these inexpensive metadata probes synchronous; document reads remain async.
export const fileExists = (absolutePath: string): boolean => {
  try {
    statSync(absolutePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
};

const collectHeadingAnchors = (tree: Root): Set<string> => {
  const headingAnchors = new Set<string>();
  const slugger = new GithubSlugger();

  visit(tree, 'heading', (node) => {
    const marker = node.children.find(
      (child) => child.type === 'html' && child.value.startsWith('<span data-obsidian-heading='),
    );
    const parsed =
      marker?.type === 'html'
        ? fromHtml(marker.value + (marker.value.endsWith('</span>') ? '' : '</span>'), {
            fragment: true,
          }).children[0]
        : undefined;
    const anchor =
      parsed?.type === 'element' && parsed.properties.dataObsidianHeading
        ? String(parsed.properties.dataObsidianHeading)
        : slugger.slug(toString(node, { includeHtml: false }));
    if (anchor) {
      headingAnchors.add(anchor);
    }
  });

  visit(tree, 'html', (node) => {
    const fragment = fromHtml(node.value, { fragment: true });
    visit(fragment, 'element', (element) => {
      if (typeof element.properties.id === 'string') headingAnchors.add(element.properties.id);
    });
  });
  return headingAnchors;
};

const extractPlaygroundData = (tree: Root, sourcePath: string, lineOffset: number) => {
  const headings: Array<{ line: number; title: string }> = [];
  visit(tree, 'heading', (node) => {
    headings.push({ line: node.position?.start.line ?? 1, title: toString(node) });
  });
  const fences: TailwindPlaygroundFence[] = [];
  visit(tree, 'code', (node) => {
    if (node.lang !== 'html' && node.lang !== 'css') return;
    const position = node.position?.start.line ?? 1;
    fences.push({
      lang: node.lang,
      value: node.value ?? '',
      meta: node.meta ?? undefined,
      line: position + lineOffset,
      ordinal: fences.length,
      heading: headings.filter((candidate) => candidate.line <= position).at(-1)?.title,
    });
  });
  const playgrounds: ReturnType<typeof extractTailwindPlaygrounds> = extractTailwindPlaygrounds(
    fences,
    sourcePath,
  );
  const siteTailwindCandidates = new Set<string>();
  visit(tree, 'html', (node) => {
    for (const token of extractTailwindCandidatesFromHtml(node.value ?? ''))
      siteTailwindCandidates.add(token);
  });
  return { playgrounds, siteTailwindCandidates: [...siteTailwindCandidates] };
};

export const loadMarkdownSource = async (
  absolutePath: string,
  issues?: ContentValidationIssue[],
): Promise<MarkdownSource> => {
  const raw = await readText(absolutePath);
  let data: Record<string, unknown> = {};
  let content = '';
  try {
    ({ data, content } = parseFrontmatter(raw));
  } catch (error) {
    if (!issues) throw error;
    issues.push({
      file: relativeSourcePath(absolutePath),
      message: `Cannot parse frontmatter: ${(error as Error).message}`,
    });
  }
  const tree = markdownParser.parse(content);

  const lineOffset = raw.slice(0, raw.length - content.length).split('\n').length - 1;
  const playgroundData = extractPlaygroundData(tree, relativeSourcePath(absolutePath), lineOffset);
  return {
    rawSource: raw,
    absolutePath,
    sourcePath: relativeSourcePath(absolutePath),
    sourceHash: hashContents(raw),
    data,
    content,
    tree,
    headingAnchors: collectHeadingAnchors(tree),
    tailwindPlaygrounds: playgroundData.playgrounds,
    siteTailwindCandidates: playgroundData.siteTailwindCandidates,
  };
};

/** Refresh validation artifacts from the same normalized body sent to mdsvex. */
export const updateMarkdownSource = (source: MarkdownSource, markdown: string): void => {
  const { content } = parseFrontmatter(markdown);
  source.content = content;
  source.tree = markdownParser.parse(content);
  source.headingAnchors = collectHeadingAnchors(source.tree);
};
