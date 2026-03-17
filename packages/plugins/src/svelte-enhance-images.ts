import { readFileSync } from 'node:fs';
import path from 'node:path';
import MagicString from 'magic-string';
import { parse } from 'svelte/compiler';
import type { PreprocessorGroup } from 'svelte/compiler';
import { twMerge as merge } from 'tailwind-merge';
import type { ImageManifest, ImageManifestEntry } from '@stevekinney/utilities/image-manifest';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

type SvelteTextNode = {
  type: string;
  data: string;
  raw?: string;
  start: number;
  end: number;
};

type SvelteAttributeNode = {
  type: string;
  name?: string;
  value?: SvelteTextNode[];
  start: number;
  end: number;
};

type AstNode = {
  name?: string;
  type?: string;
  start: number;
  end: number;
  attributes: SvelteAttributeNode[];
  children?: AstNode[];
};

type ProcessImagesOptions = {
  manifestPath?: string;
  sizes?: string;
  classes?: string[];
  firstImagePriority?: boolean;
};

// ---------------------------------------------------------------------------
// Manifest loading
// ---------------------------------------------------------------------------

let cachedManifest: ImageManifest | null = null;
let cachedManifestPath: string | null = null;

const loadManifest = (manifestPath: string): ImageManifest => {
  if (cachedManifest && cachedManifestPath === manifestPath) return cachedManifest;

  try {
    const raw = readFileSync(manifestPath, 'utf8');
    cachedManifest = JSON.parse(raw) as ImageManifest;
    cachedManifestPath = manifestPath;
    return cachedManifest;
  } catch {
    cachedManifest = { version: 1, images: {} };
    cachedManifestPath = manifestPath;
    return cachedManifest;
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const defaultClasses = ['max-w-full'];

export const processImages = (opts: ProcessImagesOptions = {}): PreprocessorGroup => {
  const manifestPath =
    opts.manifestPath ?? path.resolve(process.cwd(), '..', '..', 'image-manifest.json');
  const defaultSizes = opts.sizes ?? '(min-width: 1280px) 800px, (min-width: 768px) 80vw, 100vw';
  const imageClasses = opts.classes ?? defaultClasses;
  const firstImagePriority = opts.firstImagePriority ?? false;

  return {
    name: 'markdown-image-optimization',
    markup(context: { content: string; filename?: string }) {
      const { content, filename } = context;
      if (!filename || !filename.endsWith('.md')) return undefined;
      if (!content.includes('<img')) return undefined;

      const manifest = loadManifest(manifestPath);

      const parsed = parse(content, { filename }) as {
        html: AstNode;
      };
      const s = new MagicString(content);

      let imageIndex = 0;
      walkHtml(parsed.html, (node, ancestors) => {
        if (node.name !== 'img') return;
        if (ancestors.some((ancestor) => ancestor.name === 'picture')) return;

        const src = getAttribute(node, 'src');
        if (!src) return;

        const srcValue = getStaticAttributeValueNode(src);
        if (!srcValue) return;

        const urlRaw = srcValue.data;
        if (isExternalUrl(urlRaw)) return;

        let url = safeDecode(urlRaw);
        if (url.startsWith('assets/')) url = `./${url}`;

        const urlForMatch = stripQueryHash(url);
        const isFirstImage = imageIndex === 0 && firstImagePriority;
        imageIndex++;

        // Resolve the image path relative to the markdown file, then make it repo-relative
        const manifestKey = resolveManifestKey(filename, urlForMatch);
        const entry = manifest.images[manifestKey];

        if (!entry) {
          // Not in manifest — leave unchanged for dev fallback
          return;
        }

        const extension = getFileExtension(urlForMatch);

        if (entry.videoMimeType) {
          formatVideo(s, node, entry, content, imageClasses);
          return;
        }

        if (entry.avif.length > 0) {
          formatPicture(s, node, entry, content, defaultSizes, imageClasses, isFirstImage);
          return;
        }

        const isSvg = extension === 'svg';
        const isGif = extension === 'gif';
        formatInlineImage(s, node, entry, imageClasses, isFirstImage, isSvg || isGif);
      });

      const code = s.toString();
      if (code === content) return undefined;

      return {
        code,
        map: s.generateMap({ hires: true }).toString(),
      };
    },
  };
};

// ---------------------------------------------------------------------------
// Manifest key resolution
// ---------------------------------------------------------------------------

/**
 * Given a markdown file path and a relative image URL, resolve to the repo-relative
 * manifest key (forward slashes, relative to repo root).
 */
const resolveManifestKey = (markdownFile: string, imageUrl: string): string => {
  let resolved: string;
  if (imageUrl.startsWith('/')) {
    // Root-relative paths point to `applications/website/static/`
    const staticRoot = path.resolve(process.cwd(), 'static');
    resolved = path.resolve(staticRoot, imageUrl.slice(1));
  } else {
    resolved = path.resolve(path.dirname(markdownFile), imageUrl);
  }

  // Find repo root (two levels up from applications/website or wherever cwd is)
  const repoRoot = path.resolve(process.cwd(), '..', '..');
  return normalizePath(path.relative(repoRoot, resolved));
};

const normalizePath = (value: string): string => value.split(path.sep).join('/');

// ---------------------------------------------------------------------------
// URL / path utilities
// ---------------------------------------------------------------------------

const stripQueryHash = (url: string): string => url.split(/[?#]/)[0];

const getFileExtension = (url: string): string => {
  const cleanUrl = stripQueryHash(url);
  const index = cleanUrl.lastIndexOf('.');
  if (index === -1) return '';
  return cleanUrl.slice(index + 1).toLowerCase();
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const isExternalUrl = (value: string): boolean => {
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value)) return true;
  return /^(data|blob|mailto|tel|javascript):/i.test(value);
};

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

const getAttribute = (node: AstNode, name: string): SvelteAttributeNode | undefined =>
  node.attributes.find((attr) => attr.type === 'Attribute' && attr.name === name);

const hasAttribute = (node: AstNode, name: string): boolean => Boolean(getAttribute(node, name));

const getStaticAttributeValueNode = (
  attr: SvelteAttributeNode | undefined,
): SvelteTextNode | undefined => {
  if (!attr || attr.type !== 'Attribute' || !attr.value || attr.value.length !== 1) return;
  const [value] = attr.value;
  if (value.type === 'Text') return value;
};

const getStaticAttributeText = (attr: SvelteAttributeNode | undefined): string | undefined =>
  getStaticAttributeValueNode(attr)?.data;

const getRawAttribute = (attr: SvelteAttributeNode, content: string): string =>
  content.slice(attr.start, attr.end);

const walkHtml = (
  node: unknown,
  visit: (node: AstNode, ancestors: AstNode[]) => void,
  ancestors: AstNode[] = [],
): void => {
  if (!node || typeof node !== 'object') return;

  const typedNode = node as AstNode;
  const isElement = typedNode.type === 'Element';
  if (isElement) {
    visit(typedNode, ancestors);
    ancestors.push(typedNode);
  }

  for (const value of Object.values(node as Record<string, unknown>)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === 'object' && 'type' in entry) {
          walkHtml(entry, visit, ancestors);
        }
      }
    } else if (typeof value === 'object' && 'type' in value) {
      walkHtml(value, visit, ancestors);
    }
  }

  if (isElement) ancestors.pop();
};

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

const formatInlineImage = (
  s: MagicString,
  node: AstNode,
  entry: ImageManifestEntry,
  imageClasses: string[],
  isFirstImage: boolean,
  isPassthrough: boolean,
): void => {
  const hasPriority =
    isFirstImage || hasAttribute(node, 'data-priority') || hasAttribute(node, 'fetchpriority');

  const attrs: string[] = [`src="${entry.original}"`];

  // Preserve alt
  const altAttr = getAttribute(node, 'alt');
  if (altAttr) {
    const altText = getStaticAttributeText(altAttr) ?? '';
    attrs.push(`alt="${altText}"`);
  } else {
    attrs.push('alt=""');
  }

  // Class
  const classAttr = getAttribute(node, 'class');
  const classValue = getStaticAttributeText(classAttr) ?? '';
  const mergedClass = classValue.trim() ? merge(classValue, imageClasses) : imageClasses.join(' ');
  attrs.push(`class="${mergedClass}"`);

  // Priority
  if (isFirstImage && !hasAttribute(node, 'fetchpriority')) {
    attrs.push('fetchpriority="high"');
  }

  // Loading/decoding
  if (!hasAttribute(node, 'loading')) {
    attrs.push(hasPriority ? 'loading="eager"' : 'loading="lazy"');
  }
  if (!hasAttribute(node, 'decoding')) {
    attrs.push(hasPriority ? 'decoding="auto"' : 'decoding="async"');
  }

  // Dimensions
  if (!isPassthrough && entry.width && entry.height) {
    if (!hasAttribute(node, 'width')) attrs.push(`width="${entry.width}"`);
    if (!hasAttribute(node, 'height')) attrs.push(`height="${entry.height}"`);
  }

  s.update(node.start, node.end, `<img ${attrs.join(' ')} />`);
};

const formatPicture = (
  s: MagicString,
  node: AstNode,
  entry: ImageManifestEntry,
  content: string,
  defaultSizes: string,
  imageClasses: string[],
  isFirstImage: boolean,
): void => {
  const hasPriority =
    isFirstImage || hasAttribute(node, 'data-priority') || hasAttribute(node, 'fetchpriority');

  // Build AVIF srcset
  const avifSrcset = entry.avif.map((v) => `${v.url} ${v.width}w`).join(', ');

  // Determine sizes
  const sizesAttr = getAttribute(node, 'sizes');
  const sizesValue = getStaticAttributeText(sizesAttr) ?? defaultSizes;

  // Build img attributes
  const imgAttrs: string[] = [`src="${entry.original}"`];

  // Preserve alt
  const altAttr = getAttribute(node, 'alt');
  if (altAttr) {
    const altText = getStaticAttributeText(altAttr) ?? '';
    imgAttrs.push(`alt="${altText}"`);
  } else {
    imgAttrs.push('alt=""');
  }

  // Class
  const classAttr = getAttribute(node, 'class');
  const classValue = getStaticAttributeText(classAttr) ?? '';
  const mergedClass = classValue.trim() ? merge(classValue, imageClasses) : imageClasses.join(' ');
  imgAttrs.push(`class="${mergedClass}"`);

  // Priority
  if (isFirstImage && !hasAttribute(node, 'fetchpriority')) {
    imgAttrs.push('fetchpriority="high"');
  }

  // Loading/decoding
  if (!hasAttribute(node, 'loading')) {
    imgAttrs.push(hasPriority ? 'loading="eager"' : 'loading="lazy"');
  }
  if (!hasAttribute(node, 'decoding')) {
    imgAttrs.push(hasPriority ? 'decoding="auto"' : 'decoding="async"');
  }

  // Dimensions
  if (entry.width && entry.height) {
    if (!hasAttribute(node, 'width')) imgAttrs.push(`width="${entry.width}"`);
    if (!hasAttribute(node, 'height')) imgAttrs.push(`height="${entry.height}"`);
  }

  // LQIP
  if (entry.lqip) {
    imgAttrs.push(`style="background-size:cover;background-image:url(${entry.lqip})"`);
  }

  // Preserve other attributes (data-*, etc.)
  for (const attr of node.attributes) {
    if (attr.type !== 'Attribute') continue;
    const skip = new Set([
      'src',
      'srcset',
      'sizes',
      'alt',
      'class',
      'loading',
      'decoding',
      'width',
      'height',
      'fetchpriority',
      'data-priority',
    ]);
    if (attr.name && !skip.has(attr.name)) {
      imgAttrs.push(getRawAttribute(attr, content));
    }
  }

  const replacement = `
<picture>
  <source type="image/avif" srcset="${avifSrcset}" sizes="${sizesValue}" />
  <img ${imgAttrs.join(' ')} />
</picture>`;

  s.update(node.start, node.end, replacement);
};

const formatVideo = (
  s: MagicString,
  node: AstNode,
  entry: ImageManifestEntry,
  content: string,
  imageClasses: string[],
): void => {
  const classAttr = getAttribute(node, 'class');
  const classValue = getStaticAttributeText(classAttr) ?? '';
  const mergedClass = classValue.trim() ? merge(classValue, imageClasses) : imageClasses.join(' ');

  const hasControls = hasAttribute(node, 'controls');

  const attrs: string[] = [`class="${mergedClass}"`];
  if (!hasControls) attrs.push('controls');

  // Preserve other attributes
  for (const attr of node.attributes) {
    if (attr.type !== 'Attribute') continue;
    const skip = new Set(['src', 'srcset', 'sizes', 'alt', 'class', 'controls']);
    if (attr.name && !skip.has(attr.name)) {
      attrs.push(getRawAttribute(attr, content));
    }
  }

  const typeAttr = entry.videoMimeType ? ` type="${entry.videoMimeType}"` : '';
  const attrsString = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';

  s.update(
    node.start,
    node.end,
    `<video${attrsString}><source src="${entry.original}"${typeAttr} /></video>`,
  );
};
