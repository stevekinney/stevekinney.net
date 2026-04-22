import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import type { Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { sanitizeTailwindPlaygroundHtml } from '@stevekinney/utilities/tailwind-playground';
import { normalizePath, parseFrontmatter } from '@stevekinney/utilities/frontmatter';

import { repositoryRoot } from '../content-paths.ts';

import type { MarkdownSource } from './types.ts';

const markdownParser = unified().use(remarkParse);
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

export const fileExists = async (absolutePath: string): Promise<boolean> => {
  try {
    await stat(absolutePath);
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
    const anchor = slugger.slug(toString(node));
    if (anchor) {
      headingAnchors.add(anchor);
    }
  });

  return headingAnchors;
};

const extractTailwindPlaygrounds = (tree: Root): string[] => {
  const playgrounds: string[] = [];

  visit(tree, 'code', (node) => {
    if (node.lang !== 'html') return;
    if (!node.meta || !node.meta.includes('tailwind')) return;

    const sanitized = sanitizeTailwindPlaygroundHtml(node.value ?? '');
    if (sanitized.trim().length > 0) {
      playgrounds.push(sanitized);
    }
  });

  return playgrounds;
};

export const loadMarkdownSource = async (absolutePath: string): Promise<MarkdownSource> => {
  const raw = await readText(absolutePath);
  const { data, content } = parseFrontmatter(raw);
  const tree = markdownParser.parse(content);

  return {
    absolutePath,
    sourcePath: relativeSourcePath(absolutePath),
    sourceHash: hashContents(raw),
    data,
    content,
    tree,
    headingAnchors: collectHeadingAnchors(tree),
    tailwindPlaygrounds: extractTailwindPlaygrounds(tree),
  };
};
