import { readFileSync } from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';
import { h } from 'hastscript';
import type { Element, Root, Properties } from 'hast';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import type { ImageManifest, ImageManifestEntry } from '@stevekinney/utilities/image-manifest';

type Options = {
  manifestPath?: string;
  sizes?: string;
  classes?: string[];
  firstImagePriority?: boolean;
  strictManifest?: boolean;
};

// ---------------------------------------------------------------------------
// Manifest loading (cached across files within a single build)
// ---------------------------------------------------------------------------

let cachedManifest: ImageManifest | null = null;
let cachedManifestPath: string | null = null;

const loadManifest = (manifestPath: string, strictManifest: boolean): ImageManifest => {
  if (cachedManifest && cachedManifestPath === manifestPath) return cachedManifest;

  try {
    const raw = readFileSync(manifestPath, 'utf8');
    cachedManifest = JSON.parse(raw) as ImageManifest;
    cachedManifestPath = manifestPath;
    return cachedManifest;
  } catch (error) {
    if (strictManifest) {
      throw new Error(`Image manifest is required at ${manifestPath}: ${(error as Error).message}`);
    }

    cachedManifest = { version: 1, images: {} };
    cachedManifestPath = manifestPath;
    return cachedManifest;
  }
};

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const resolveManifestKey = (markdownFile: string, imageUrl: string): string => {
  const cwd = process.cwd();
  let resolved: string;

  if (imageUrl.startsWith('/')) {
    const staticRoot = path.resolve(cwd, 'static');
    resolved = path.resolve(staticRoot, imageUrl.slice(1));
  } else {
    resolved = path.resolve(path.dirname(markdownFile), imageUrl);
  }

  const repoRoot = path.resolve(cwd, '..', '..');
  const relative = path.relative(repoRoot, resolved);

  // If the path escapes the repo root, it can't match a manifest key
  if (relative.startsWith('..')) return '';

  return relative.split(path.sep).join('/');
};

// ---------------------------------------------------------------------------
// URL utilities
// ---------------------------------------------------------------------------

const stripQueryHash = (url: string): string => url.split(/[?#]/)[0];

const getExtension = (url: string): string => {
  const clean = stripQueryHash(url);
  const dot = clean.lastIndexOf('.');
  return dot === -1 ? '' : clean.slice(dot + 1).toLowerCase();
};

const isExternalUrl = (value: string): boolean => {
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value)) return true;
  return /^(data|blob|mailto|tel|javascript):/i.test(value);
};

const safeDecode = (value: string): string => {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
};

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const defaultClasses = ['max-w-full'];

const rehypeEnhanceImages: Plugin<[Options?], Root> = (options = {}) => {
  const manifestPath =
    options.manifestPath ?? path.resolve(process.cwd(), '..', '..', 'image-manifest.json');
  const defaultSizes = options.sizes ?? '(min-width: 1280px) 800px, (min-width: 768px) 80vw, 100vw';
  const imageClasses = options.classes ?? defaultClasses;
  const firstImagePriority = options.firstImagePriority ?? false;
  const strictManifest = options.strictManifest ?? false;

  return function transformer(tree: Root, file: VFile): void {
    const manifest = loadManifest(manifestPath, strictManifest);
    const filename =
      file.path ?? (file as unknown as { filename?: string }).filename ?? file.history[0];
    if (!filename) return;

    let imageIndex = 0;

    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'img') return;
      if (!parent || index === undefined) return;

      // Skip images already inside a <picture>
      if (parent.type === 'element' && (parent as Element).tagName === 'picture') {
        return;
      }

      const src = String(node.properties?.src ?? '');
      if (!src || isExternalUrl(src)) return;

      let url = safeDecode(src);
      if (url.startsWith('assets/')) url = `./${url}`;
      const urlForMatch = stripQueryHash(url);

      const key = resolveManifestKey(filename, urlForMatch);
      const entry = manifest.images[key];
      if (!entry) {
        if (strictManifest) {
          throw new Error(
            `Missing image manifest entry for '${urlForMatch}' in '${filename}' (resolved key: '${key}').`,
          );
        }

        // Unmanifested image: rewrite relative src to a repo-rooted absolute path
        // so the dev middleware (serveContentAssets) serves it regardless of the
        // current page URL. Without this, `<img src="assets/foo.png">` on a page
        // like /courses/<slug> resolves to /courses/assets/foo.png — wrong.
        // In production the manifest is authoritative, so this branch is a no-op.
        if (key && !src.startsWith('/') && !isExternalUrl(src)) {
          node.properties = { ...(node.properties ?? {}), src: `/${key}` };
        }
        return;
      }

      const isFirstImage = imageIndex === 0 && firstImagePriority;
      imageIndex++;

      const extension = getExtension(urlForMatch);

      let replacement: Element;

      if (entry.videoMimeType) {
        replacement = buildVideo(node, entry, imageClasses);
      } else if (entry.avif.length > 0) {
        replacement = buildPicture(node, entry, defaultSizes, imageClasses, isFirstImage);
      } else {
        const isPassthrough = extension === 'svg' || extension === 'gif';
        replacement = buildImage(node, entry, imageClasses, isFirstImage, isPassthrough);
      }

      parent.children.splice(index, 1, replacement);
    });
  };
};

export default rehypeEnhanceImages;

// ---------------------------------------------------------------------------
// Element builders
// ---------------------------------------------------------------------------

const mergeClasses = (existing: unknown, additional: string[]): string => {
  const parts: string[] = [];
  if (typeof existing === 'string' && existing.trim()) {
    parts.push(existing.trim());
  } else if (Array.isArray(existing)) {
    parts.push(...existing.map(String).filter(Boolean));
  }
  parts.push(...additional);
  return parts.join(' ');
};

const loadingProps = (isFirstImage: boolean, node: Element): Properties => {
  const hasPriority =
    isFirstImage ||
    node.properties?.['data-priority'] !== undefined ||
    node.properties?.fetchpriority !== undefined;

  const props: Properties = {};

  // Preserve explicit values; only add defaults when absent
  props.loading = node.properties?.loading ?? (hasPriority ? 'eager' : 'lazy');
  props.decoding = node.properties?.decoding ?? (hasPriority ? 'auto' : 'async');

  if (node.properties?.fetchpriority) {
    props.fetchpriority = node.properties.fetchpriority;
  } else if (isFirstImage) {
    props.fetchpriority = 'high';
  }

  return props;
};

const preservedProperties = (node: Element): Properties => {
  const skip = new Set([
    'src',
    'srcset',
    'srcSet',
    'sizes',
    'class',
    'className',
    'loading',
    'decoding',
    'fetchpriority',
    'data-priority',
    'alt',
  ]);

  const props: Properties = {};
  for (const [key, value] of Object.entries(node.properties ?? {})) {
    if (!skip.has(key)) {
      props[key] = value;
    }
  }
  return props;
};

const buildImage = (
  node: Element,
  entry: ImageManifestEntry,
  classes: string[],
  isFirstImage: boolean,
  isPassthrough: boolean,
): Element => {
  const props: Properties = {
    src: entry.original,
    alt: node.properties?.alt ?? '',
    class: mergeClasses(node.properties?.className, classes),
    ...loadingProps(isFirstImage, node),
    ...preservedProperties(node),
  };

  if (!isPassthrough && entry.width && entry.height) {
    if (!node.properties?.width) props.width = entry.width;
    if (!node.properties?.height) props.height = entry.height;
  }

  return h('img', props);
};

const buildPicture = (
  node: Element,
  entry: ImageManifestEntry,
  defaultSizes: string,
  classes: string[],
  isFirstImage: boolean,
): Element => {
  const avifSrcset = entry.avif.map((v) => `${v.url} ${v.width}w`).join(', ');
  const sizes = String(node.properties?.sizes ?? defaultSizes);

  const imgProps: Properties = {
    src: entry.original,
    alt: node.properties?.alt ?? '',
    class: mergeClasses(node.properties?.className, classes),
    ...loadingProps(isFirstImage, node),
    ...preservedProperties(node),
  };

  if (entry.width && entry.height) {
    if (!node.properties?.width) imgProps.width = entry.width;
    if (!node.properties?.height) imgProps.height = entry.height;
  }

  if (entry.lqip) {
    const lqipStyle = `background-size:cover;background-image:url(${entry.lqip})`;
    const existing = typeof imgProps.style === 'string' ? imgProps.style : '';
    imgProps.style = existing ? `${existing};${lqipStyle}` : lqipStyle;
  }

  return h('picture', [
    h('source', { type: 'image/avif', srcset: avifSrcset, sizes }),
    h('img', imgProps),
  ]);
};

const buildVideo = (node: Element, entry: ImageManifestEntry, classes: string[]): Element => {
  const videoProps: Properties = {
    class: mergeClasses(node.properties?.className, classes),
  };

  if (!node.properties?.controls) {
    videoProps.controls = true;
  }

  // Preserve non-image attributes
  const skip = new Set([
    'src',
    'srcset',
    'srcSet',
    'sizes',
    'alt',
    'class',
    'className',
    'controls',
  ]);
  for (const [key, value] of Object.entries(node.properties ?? {})) {
    if (!skip.has(key)) {
      videoProps[key] = value;
    }
  }

  const sourceProps: Properties = { src: entry.original };
  if (entry.videoMimeType) {
    sourceProps.type = entry.videoMimeType;
  }

  return h('video', videoProps, [h('source', sourceProps)]);
};
