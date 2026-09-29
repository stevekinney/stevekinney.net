import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  parseTailwindPlaygroundMetadata,
  parseTailwindPlaygroundStyleMetadata,
  playgroundFingerprint,
  resolveTailwindPlaygroundTitle,
} from '@stevekinney/utilities/tailwind-playground-metadata';
import { PLAYGROUND_URL_PREFIX } from '@stevekinney/utilities/tailwind-playground-policy';
import type { PlaygroundManifest } from '@stevekinney/utilities/tailwind-playground-types';
import type { Code, Heading, Html, Parent, PhrasingContent, Root } from 'mdast';
import { decodeString } from 'micromark-util-decode-string';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

type VFileWithFilename = VFile & { filename?: string };

type RemarkTailwindPlaygroundOptions = {
  manifest?: PlaygroundManifest;
  manifestPath?: string;
  workspaceRoot?: string;
};

const DEFAULT_MANIFEST_PATH = path.resolve(
  process.cwd(),
  'applications',
  'website',
  '.generated',
  'playgrounds',
  'manifest.json',
);

const playgroundHtmlUrlPattern = new RegExp(`^${PLAYGROUND_URL_PREFIX}[a-f0-9]{64}\\.html$`);
const playgroundCssUrlPattern = new RegExp(`^${PLAYGROUND_URL_PREFIX}[a-f0-9]{64}\\.css$`);
const digestPattern = /^[a-f0-9]{64}$/;
const obsidianHeadingAnchorPattern = /^<span data-obsidian-heading="[^"]*">$/;
const embeddedSourceMarkerPattern = /^<!-- obsidian-embedded-source: ([^\s]+) -->$/;

const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/`/g, '&#96;');

const normalizePath = (sourcePath: string, workspaceRoot: string): string => {
  const resolvedPath = path.resolve(sourcePath);
  const relativePath = path.relative(workspaceRoot, resolvedPath);
  return relativePath.startsWith('..') || path.isAbsolute(relativePath)
    ? resolvedPath
    : relativePath.split(path.sep).join('/');
};

const loadManifestSync = (manifestPath: string): PlaygroundManifest => {
  if (!existsSync(manifestPath)) {
    throw new Error(`Tailwind playground manifest is missing: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PlaygroundManifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.examples)) {
    throw new Error(`Tailwind playground manifest has an unsupported shape: ${manifestPath}`);
  }
  return manifest;
};

const buildManifestKey = (sourcePath: string, ordinal: number): string =>
  `${sourcePath}:${ordinal}`;

const isTailwindPlaygroundBlock = (node: Code): boolean =>
  node.lang === 'html' && parseTailwindPlaygroundMetadata(node.meta ?? undefined) !== null;

const colorSchemeForTheme = (theme: PlaygroundManifest['examples'][number]['theme']): string => {
  if (theme === 'dark') return 'dark';
  if (theme === 'system') return 'light dark';
  return 'light';
};

const rawPositionedValue = (node: PhrasingContent, rawSource: string | undefined): string => {
  if (node.type === 'inlineCode') return node.value;
  if (node.type === 'image' || node.type === 'imageReference') return node.alt ?? '';
  if (!rawSource || !node.position || node.type !== 'text') {
    return 'value' in node && typeof node.value === 'string' ? node.value : '';
  }
  const start = node.position.start.offset;
  const end = node.position.end.offset;
  if (start === undefined || end === undefined) return node.value;
  return decodeString(rawSource.slice(start, end));
};

const phrasingContentToText = (
  nodes: PhrasingContent[] | undefined,
  rawSource: string | undefined,
): string =>
  (nodes ?? [])
    .map((node, index, siblings) => {
      // Embedded headings carry transport anchors (`<span data-obsidian-heading>` and its closing
      // tag) that are not part of the visible title.
      if (node.type === 'html') {
        if (obsidianHeadingAnchorPattern.test(node.value)) return '';
        const previous = siblings[index - 1];
        if (
          node.value === '</span>' &&
          previous?.type === 'html' &&
          obsidianHeadingAnchorPattern.test(previous.value)
        )
          return '';
      }
      if (
        node.type === 'text' ||
        node.type === 'inlineCode' ||
        node.type === 'image' ||
        node.type === 'imageReference'
      )
        return rawPositionedValue(node, rawSource);
      if ('children' in node && Array.isArray(node.children))
        return phrasingContentToText(node.children, rawSource);
      if ('value' in node && typeof node.value === 'string') return node.value;
      return '';
    })
    .join('');

const loadRawSource = (filePath: string): string | undefined => {
  if (!filePath || !existsSync(filePath)) return undefined;
  return readFileSync(filePath, 'utf8');
};

type PlaygroundHeading = { line: number; title: string; owner: number };

const embeddedSourceMarkerOf = (node: { type: string; value?: string }): string | undefined => {
  if (node.type !== 'html' || typeof node.value !== 'string') return;
  const marker = embeddedSourceMarkerPattern.exec(node.value.trim());
  if (!marker) return;
  return marker[1]!
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .join('/');
};

/**
 * Give every node an owner: 0 for the host note, and a distinct number for each embedded region.
 * Headings only title playgrounds owned by the same region, matching how each note is fingerprinted alone.
 */
const collectOwners = (tree: Root, hostSourcePath: string): Map<unknown, number> => {
  const owners = new Map<unknown, number>();
  const stack: Array<{ sourcePath: string; owner: number }> = [
    { sourcePath: hostSourcePath, owner: 0 },
  ];
  let nextOwner = 1;
  visit(tree, (node) => {
    const sourcePath = embeddedSourceMarkerOf(node as { type: string; value?: string });
    if (sourcePath !== undefined) {
      const enclosing = stack.at(-2);
      if (enclosing && enclosing.sourcePath === sourcePath) stack.pop();
      else stack.push({ sourcePath, owner: nextOwner++ });
      return;
    }
    owners.set(node, stack.at(-1)!.owner);
  });
  return owners;
};

const collectHeadings = (
  tree: Root,
  rawSource: string | undefined,
  owners: Map<unknown, number>,
): PlaygroundHeading[] => {
  const headings: PlaygroundHeading[] = [];
  visit(tree, 'heading', (node: Heading) => {
    const owner = owners.get(node) ?? 0;
    headings.push({
      line: node.position?.start.line ?? 1,
      // Raw offsets describe the host file, so embedded headings use their parsed text.
      title: phrasingContentToText(node.children, owner === 0 ? rawSource : undefined),
      owner,
    });
  });
  return headings;
};

const nearestHeading = (
  headings: PlaygroundHeading[],
  line: number | undefined,
  owner: number,
): string | undefined =>
  headings.filter((heading) => heading.owner === owner && heading.line <= (line ?? 1)).at(-1)
    ?.title;

/** Repeated embeds of one note need distinct anchors, so embedded owners get a suffix. */
const scopedAnchor = (anchor: string, owner: number): string =>
  owner === 0 ? anchor : `${anchor}-embed-${owner}`;

const styleKey = (owner: number, name: string): string => `${owner}:${name}`;

const collectStyles = (tree: Root, owners: Map<unknown, number>): Map<string, string> => {
  const styles = new Map<string, string>();
  visit(tree, 'code', (node: Code) => {
    if (node.lang !== 'css') return;
    const metadata = parseTailwindPlaygroundStyleMetadata(node.meta ?? undefined);
    if (!metadata) return;
    styles.set(styleKey(owners.get(node) ?? 0, metadata.name), node.value ?? '');
  });
  return styles;
};

const filenameFromPlaygroundUrl = (url: string): string => url.slice(PLAYGROUND_URL_PREFIX.length);

const assertPlaygroundEntryFiles = (
  entry: PlaygroundManifest['examples'][number],
  files: PlaygroundManifest['files'],
): void => {
  if (!playgroundHtmlUrlPattern.test(entry.src)) {
    throw new Error(
      `Invalid Tailwind playground document URL for ${entry.sourcePath}#${entry.ordinal}.`,
    );
  }
  if (!playgroundCssUrlPattern.test(entry.cssSrc)) {
    throw new Error(
      `Invalid Tailwind playground stylesheet URL for ${entry.sourcePath}#${entry.ordinal}.`,
    );
  }
  for (const url of [entry.src, entry.cssSrc]) {
    const filename = filenameFromPlaygroundUrl(url);
    const digest = files[filename];
    if (!digest || !digestPattern.test(digest)) {
      throw new Error(
        `Tailwind playground manifest is stale: missing generated asset ${filename} for ${entry.sourcePath}#${entry.ordinal}.`,
      );
    }
  }
};

const buildOpeningFigure = (
  entry: PlaygroundManifest['examples'][number],
  manifestFiles: PlaygroundManifest['files'],
  loading: 'eager' | 'lazy',
  cssAnchor: string | undefined,
): string => {
  if (!Number.isSafeInteger(entry.height) || entry.height <= 0) {
    throw new Error(`Invalid Tailwind playground height for ${entry.sourcePath}#${entry.ordinal}.`);
  }
  assertPlaygroundEntryFiles(entry, manifestFiles);

  const title = escapeAttribute(entry.title);
  const iframeSource = escapeAttribute(entry.src);
  const colorScheme = colorSchemeForTheme(entry.theme);
  const cssLink = cssAnchor
    ? `<a class="tailwind-playground__link" href="#${escapeAttribute(cssAnchor)}">CSS</a>`
    : '';

  return [
    `<figure class="tailwind-playground not-prose" data-tailwind-playground>`,
    `<figcaption class="tailwind-playground__caption">`,
    `<span class="tailwind-playground__title">${title}</span>`,
    `<span class="tailwind-playground__links">`,
    `<a class="tailwind-playground__link" href="${iframeSource}" target="_blank" rel="noopener noreferrer">Open example</a>`,
    cssLink,
    `</span>`,
    `</figcaption>`,
    `<iframe class="tailwind-playground__frame" title="${title}" src="${iframeSource}" sandbox="allow-forms" loading="${loading}" height="${entry.height}" style="--tailwind-playground-height:${entry.height}px;color-scheme:${colorScheme}"></iframe>`,
  ].join('');
};

const hasTailwindPlaygroundWork = (tree: Root): boolean => {
  let hasWork = false;
  visit(tree, 'code', (node: Code) => {
    if (hasWork) return;
    hasWork =
      isTailwindPlaygroundBlock(node) ||
      (node.lang === 'css' &&
        parseTailwindPlaygroundStyleMetadata(node.meta ?? undefined) !== null);
  });
  return hasWork;
};

/**
 * Replaces HTML fences marked `tailwind` with a static iframe preview while
 * preserving the original source block directly below it in the same figure.
 */
export default function remarkTailwindPlayground(
  options: RemarkTailwindPlaygroundOptions = {},
): Transformer<Root> {
  const manifestPath = options.manifestPath ?? DEFAULT_MANIFEST_PATH;
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());

  return function transformer(tree: Root, file: VFileWithFilename): void {
    const filePath = (file.filename ?? file.path ?? '').toString();
    if (filePath && !filePath.endsWith('.md')) return;
    if (!hasTailwindPlaygroundWork(tree)) return;

    const manifest = options.manifest ?? loadManifestSync(manifestPath);
    const normalizedSourcePath = normalizePath(filePath, workspaceRoot);
    const rawSource = loadRawSource(filePath);
    const owners = collectOwners(tree, normalizedSourcePath);
    const headings = collectHeadings(tree, rawSource, owners);
    const styles = collectStyles(tree, owners);
    const examples = new Map(
      manifest.examples.map((entry) => [buildManifestKey(entry.sourcePath, entry.ordinal), entry]),
    );
    // Each embed occurrence numbers its playgrounds from zero, like the source note does alone.
    const ordinals = new Map<number, number>();
    let currentSourcePath = normalizedSourcePath;

    const handleCode = (
      node: Code,
      index: number | undefined,
      parent: Parent | undefined,
    ): number | undefined => {
      if (!parent || typeof index !== 'number') return;
      if (!Array.isArray(parent.children)) return;
      const cssMetadata =
        node.lang === 'css' ? parseTailwindPlaygroundStyleMetadata(node.meta ?? undefined) : null;
      if (cssMetadata) {
        const anchorNode: Html = {
          type: 'html',
          value: `<span id="${escapeAttribute(scopedAnchor(`playground-css-${cssMetadata.name}`, owners.get(node) ?? 0))}"></span>`,
        };
        parent.children.splice(index, 0, anchorNode);
        return index + 2;
      }

      const metadata =
        node.lang === 'html' ? parseTailwindPlaygroundMetadata(node.meta ?? undefined) : null;
      if (!metadata) return;

      const owner = owners.get(node) ?? 0;
      const currentOrdinal = ordinals.get(owner) ?? 0;
      ordinals.set(owner, currentOrdinal + 1);
      const entry = examples.get(buildManifestKey(currentSourcePath, currentOrdinal));

      if (!entry) {
        throw new Error(
          `Tailwind playground manifest is stale: missing ${currentSourcePath}#${currentOrdinal}.`,
        );
      }

      const css = metadata.css
        ? styles.get(styleKey(owners.get(node) ?? 0, metadata.css))
        : undefined;
      if (metadata.css && css === undefined) {
        throw new Error(
          `Tailwind playground manifest is stale: missing CSS playground '${metadata.css}' for ${currentSourcePath}#${currentOrdinal}.`,
        );
      }
      const title = resolveTailwindPlaygroundTitle(
        metadata.title,
        nearestHeading(headings, node.position?.start.line, owners.get(node) ?? 0),
        currentOrdinal,
      );
      const actualFingerprint = playgroundFingerprint(node.value ?? '', node.meta ?? undefined, {
        css: css ?? '',
        title,
      });
      if (entry.sourceFingerprint !== actualFingerprint) {
        throw new Error(
          `Tailwind playground manifest is stale: fingerprint changed for ${currentSourcePath}#${currentOrdinal}.`,
        );
      }

      const openingNode: Html = {
        type: 'html',
        value: buildOpeningFigure(
          entry,
          manifest.files,
          currentOrdinal === 0 ? 'eager' : 'lazy',
          entry.cssAnchor ? scopedAnchor(entry.cssAnchor, owner) : undefined,
        ),
      };
      const closingNode: Html = { type: 'html', value: '</figure>' };

      parent.children.splice(index, 0, openingNode);
      parent.children.splice(index + 2, 0, closingNode);

      return index + 3;
    };

    visit(tree, (node, index, parent) => {
      if (node.type === 'html') {
        const sourcePath = embeddedSourceMarkerOf(node);
        if (sourcePath !== undefined) {
          currentSourcePath = sourcePath;
          node.value = '';
        }
        return;
      }
      if (node.type !== 'code') return;
      const sourcePath = currentSourcePath;
      const result = handleCode(node, index, parent);
      currentSourcePath = sourcePath;
      return result;
    });
  };
}
