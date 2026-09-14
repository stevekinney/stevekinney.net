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
    .map((node) => {
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

const collectHeadings = (
  tree: Root,
  rawSource: string | undefined,
): Array<{ line: number; title: string }> => {
  const headings: Array<{ line: number; title: string }> = [];
  visit(tree, 'heading', (node: Heading) => {
    headings.push({
      line: node.position?.start.line ?? 1,
      title: phrasingContentToText(node.children, rawSource),
    });
  });
  return headings;
};

const nearestHeading = (
  headings: Array<{ line: number; title: string }>,
  line: number | undefined,
): string | undefined => headings.filter((heading) => heading.line <= (line ?? 1)).at(-1)?.title;

const collectStyles = (tree: Root): Map<string, string> => {
  const styles = new Map<string, string>();
  visit(tree, 'code', (node: Code) => {
    if (node.lang !== 'css') return;
    const metadata = parseTailwindPlaygroundStyleMetadata(node.meta ?? undefined);
    if (!metadata) return;
    styles.set(metadata.name, node.value ?? '');
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
): string => {
  if (!Number.isSafeInteger(entry.height) || entry.height <= 0) {
    throw new Error(`Invalid Tailwind playground height for ${entry.sourcePath}#${entry.ordinal}.`);
  }
  assertPlaygroundEntryFiles(entry, manifestFiles);

  const title = escapeAttribute(entry.title);
  const iframeSource = escapeAttribute(entry.src);
  const colorScheme = colorSchemeForTheme(entry.theme);
  const cssLink = entry.cssAnchor
    ? `<a class="tailwind-playground__link" href="#${escapeAttribute(entry.cssAnchor)}">CSS</a>`
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
    const headings = collectHeadings(tree, rawSource);
    const styles = collectStyles(tree);
    const examples = new Map(
      manifest.examples.map((entry) => [buildManifestKey(entry.sourcePath, entry.ordinal), entry]),
    );
    let ordinal = 0;

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
          value: `<span id="playground-css-${escapeAttribute(cssMetadata.name)}"></span>`,
        };
        parent.children.splice(index, 0, anchorNode);
        return index + 2;
      }

      const metadata =
        node.lang === 'html' ? parseTailwindPlaygroundMetadata(node.meta ?? undefined) : null;
      if (!metadata) return;

      const currentOrdinal = ordinal;
      ordinal += 1;
      const entry = examples.get(buildManifestKey(normalizedSourcePath, currentOrdinal));

      if (!entry) {
        throw new Error(
          `Tailwind playground manifest is stale: missing ${normalizedSourcePath}#${currentOrdinal}.`,
        );
      }

      const css = metadata.css ? styles.get(metadata.css) : undefined;
      if (metadata.css && css === undefined) {
        throw new Error(
          `Tailwind playground manifest is stale: missing CSS playground '${metadata.css}' for ${normalizedSourcePath}#${currentOrdinal}.`,
        );
      }
      const title = resolveTailwindPlaygroundTitle(
        metadata.title,
        nearestHeading(headings, node.position?.start.line),
        currentOrdinal,
      );
      const actualFingerprint = playgroundFingerprint(node.value ?? '', node.meta ?? undefined, {
        css: css ?? '',
        title,
      });
      if (entry.sourceFingerprint !== actualFingerprint) {
        throw new Error(
          `Tailwind playground manifest is stale: fingerprint changed for ${normalizedSourcePath}#${currentOrdinal}.`,
        );
      }

      const openingNode: Html = {
        type: 'html',
        value: buildOpeningFigure(entry, manifest.files, currentOrdinal === 0 ? 'eager' : 'lazy'),
      };
      const closingNode: Html = { type: 'html', value: '</figure>' };

      parent.children.splice(index, 0, openingNode);
      parent.children.splice(index + 2, 0, closingNode);

      return index + 3;
    };

    visit(tree, 'code', handleCode);
  };
}
