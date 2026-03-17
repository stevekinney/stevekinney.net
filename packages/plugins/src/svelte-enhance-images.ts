import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { camelCase } from 'change-case';
import MagicString from 'magic-string';
import { parse } from 'svelte/compiler';
import type { PreprocessorGroup } from 'svelte/compiler';
import { twMerge as merge } from 'tailwind-merge';

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

type ImageConfig = {
  url: string;
  fallbackId: string;
  fallbackSrc: string;
  avifSetId?: string;
  avifSetSrc?: string;
  metaId?: string;
  metaSrc?: string;
  lqipId?: string;
  lqipSrc?: string;
  hasMeta: boolean;
  hasLqip: boolean;
  hasSrcset: boolean;
  isGif?: boolean;
  isVideo?: boolean;
  isPassthrough?: boolean;
  videoId?: string;
  videoSrc?: string;
};

type ProcessImagesOptions = {
  widths?: number[];
  mainWidth?: number;
  includeMetadata?: boolean;
  skipImages?: string[];
  sizes?: string;
  cacheDir?: string;
  classes?: string[];
  firstImagePriority?: boolean;
  lqip?: boolean;
};

/**
 * A minimal representation of an ESTree Program node as returned by Svelte's
 * legacy `parse`. We only model the fields this module actually reads.
 */
type ProgramNode = {
  start: number;
  end: number;
  body: Array<{
    type: string;
    start: number;
    end: number;
    source?: { value?: string };
    specifiers?: Array<{ type: string; local?: { name: string } }>;
  }>;
};

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

const defaultClasses = ['max-w-full'];
const cacheVersion = '1';

const isMissingFile = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

const readCacheEntry = async (
  cachePath: string,
): Promise<{ code: string; map: string | null } | null> => {
  try {
    const contents = await readFile(cachePath, 'utf8');
    return JSON.parse(contents) as { code: string; map: string | null };
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
};

const writeCacheEntry = async (
  cachePath: string,
  entry: { code: string; map: string | null },
): Promise<void> => {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(entry), 'utf8');
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add image optimization to the Markdown content.
 */
export const processImages = (opts: ProcessImagesOptions = {}): PreprocessorGroup => {
  const options: {
    widths: number[];
    mainWidth: number;
    includeMetadata: boolean;
    skipImages: string[];
    sizes?: string;
    cacheDir: string;
    classes: string[];
    firstImagePriority: boolean;
    lqip: boolean;
  } = {
    widths: [480, 1024, 1600],
    mainWidth: 1600,
    includeMetadata: true,
    skipImages: [],
    sizes: undefined,
    cacheDir: '.svelte-kit/process-images',
    classes: defaultClasses,
    firstImagePriority: false,
    lqip: false,
    ...opts,
  };

  const imageClasses = options.classes;

  const widths = normalizeWidths(options.widths, options.mainWidth);
  const defaultSizes =
    options.sizes ?? `(min-width: 1280px) ${options.mainWidth}px, (min-width: 768px) 80vw, 100vw`;
  const cacheDir = options.cacheDir ? path.resolve(options.cacheDir) : null;
  const cacheOptions = JSON.stringify({
    widths,
    mainWidth: options.mainWidth,
    includeMetadata: options.includeMetadata,
    skipImages: [...options.skipImages].sort(),
    sizes: defaultSizes,
    classes: options.classes,
    firstImagePriority: options.firstImagePriority,
    lqip: options.lqip,
  });
  const cachePrefix = createHash('sha256').update(cacheVersion).update(cacheOptions).digest('hex');

  const preprocessor: PreprocessorGroup = {
    name: 'markdown-image-optimization',
    async markup(context: { content: string; filename?: string }) {
      const { content, filename } = context;
      if (!filename || !filename.endsWith('.md')) return undefined;

      // Quick check: if no img tags, skip processing entirely
      if (!content.includes('<img')) return undefined;

      const cacheKey = createHash('sha256')
        .update(cachePrefix)
        .update(filename)
        .update(content)
        .digest('hex');
      const cachePath = cacheDir ? path.join(cacheDir, `${cacheKey}.json`) : null;

      if (cachePath) {
        const cached = await readCacheEntry(cachePath);
        if (cached) {
          return { code: cached.code, map: cached.map ?? undefined };
        }
      }

      // Parse the content with the Svelte Compiler and create a MagicString instance.
      const parsed = parse(content, { filename }) as {
        instance?: { content: ProgramNode };
        html: AstNode;
      };
      const { instance, html } = parsed;
      const s = new MagicString(content);

      const images = new Map<string, ImageConfig>();
      const importMap = collectExistingImports(instance?.content);

      // Walk the HTML AST and find all the image elements.
      let imageIndex = 0;
      walkHtml(html, (node, ancestors) => {
        if (node.name !== 'img') return;
        if (ancestors.some((ancestor) => ancestor.name === 'picture')) return;

        const src = getAttribute(node, 'src');
        if (!src) return;

        const srcValue = getStaticAttributeValueNode(src);
        if (!srcValue) return;

        const urlRaw = srcValue.data;
        // Skip external absolute URLs
        if (isExternalUrl(urlRaw)) return;

        let url = safeDecode(urlRaw);
        if (url.startsWith('assets/')) url = `./${url}`;

        const urlForMatch = stripQueryHash(url);
        if (options.skipImages.some((pattern) => urlForMatch.endsWith(pattern))) return;

        const isFirstImage = imageIndex === 0 && options.firstImagePriority;
        imageIndex++;

        const extension = getFileExtension(urlForMatch);
        const isGif = extension === 'gif';
        const isVid = isVideo(urlForMatch);
        const isSvg = extension === 'svg';
        const isWebp = extension === 'webp';
        const isAvif = extension === 'avif';
        const isPassthrough = isSvg || isWebp || isAvif;

        let config = images.get(url);
        if (!config) {
          const importIdSuffix =
            url === urlForMatch
              ? ''
              : `_${createHash('sha256').update(url).digest('hex').slice(0, 8)}`;
          const baseId = `_${camelCase(urlForMatch)}${importIdSuffix}`;
          const fallbackSrc = url;
          const fallbackId = resolveImportId(importMap, fallbackSrc, `${baseId}_src`);

          const hasMeta = options.includeMetadata && !isGif && !isVid && !isSvg;
          const metaSrc = hasMeta ? appendQuery(url, 'metadata') : undefined;
          const metaId = metaSrc
            ? resolveImportId(importMap, metaSrc, `${baseId}_meta`)
            : undefined;

          const hasSrcset = !isGif && !isVid && !isPassthrough;
          const avifSetSrc = hasSrcset
            ? appendQuery(url, `w=${widths.join(';')}&format=avif&as=srcset&withoutEnlargement`)
            : undefined;
          const avifSetId = avifSetSrc
            ? resolveImportId(importMap, avifSetSrc, `${baseId}_avif_set`)
            : undefined;

          const hasLqip = options.lqip && hasSrcset;
          const lqipSrc = hasLqip
            ? appendQuery(url, 'w=24&format=webp&quality=30&blur=10')
            : undefined;
          const lqipId = lqipSrc
            ? resolveImportId(importMap, lqipSrc, `${baseId}_lqip`)
            : undefined;

          const videoId = isVid ? resolveImportId(importMap, url, `${baseId}_video`) : undefined;

          config = {
            url,
            fallbackId,
            fallbackSrc,
            avifSetId,
            avifSetSrc,
            metaId,
            metaSrc,
            lqipId,
            lqipSrc,
            hasMeta: Boolean(metaId),
            hasLqip: Boolean(lqipId),
            hasSrcset,
            isGif,
            isVideo: isVid,
            isPassthrough,
            videoId,
            videoSrc: isVid ? url : undefined,
          };

          images.set(url, config);
        }

        if (config.isVideo && config.videoId) {
          formatVideo(s, node, config, content, imageClasses);
          return;
        }

        if (config.hasSrcset) {
          formatPicture(s, node, config, content, defaultSizes, imageClasses, isFirstImage);
          return;
        }

        formatInlineImage(s, node, srcValue, config, imageClasses, isFirstImage);
      });

      const importLines = buildImportLines(images, importMap);

      // Add the correct import statements at the top of the file.
      if (instance?.content && importLines.length > 0) {
        const insertAt = getImportInsertPosition(instance.content);
        const block = `${importLines.join('\n')}\n`;
        if (insertAt === instance.content.start) {
          s.appendLeft(insertAt, block);
        } else {
          s.appendLeft(insertAt, `\n${block}`);
        }
      } else if (importLines.length > 0) {
        // No <script> block present; create one
        s.prepend(`<script>\n${importLines.join('\n')}\n</script>\n`);
      }

      const map = s.generateMap({ hires: true });
      const result = {
        code: s.toString(),
        map: map.toString(),
      };

      if (cachePath) {
        await writeCacheEntry(cachePath, result);
      }

      return result;
    },
  };
  return preprocessor;
};

// ---------------------------------------------------------------------------
// URL / path utilities
// ---------------------------------------------------------------------------

const isVideo = (url: string): boolean => {
  const extension = getFileExtension(url);
  return extension === 'mp4' || extension === 'webm' || extension === 'ogg';
};

const getVideoMimeType = (url: string): string | undefined => {
  const extension = getFileExtension(url);
  if (extension === 'mp4') return 'video/mp4';
  if (extension === 'webm') return 'video/webm';
  if (extension === 'ogg') return 'video/ogg';
  return undefined;
};

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

const appendQuery = (url: string, query: string): string => {
  const [base, hash] = url.split('#');
  const separator = base.includes('?') ? '&' : '?';
  const next = `${base}${separator}${query}`;
  return hash ? `${next}#${hash}` : next;
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
// Import management
// ---------------------------------------------------------------------------

const resolveImportId = (
  importMap: Map<string, string>,
  source: string,
  fallback: string,
): string => importMap.get(source) ?? fallback;

const collectExistingImports = (program: ProgramNode | null | undefined): Map<string, string> => {
  const importMap = new Map<string, string>();
  if (!program?.body) return importMap;

  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    const source = node.source?.value;
    if (!source || typeof source !== 'string') continue;
    const defaultSpecifier = node.specifiers?.find(
      (specifier) => specifier.type === 'ImportDefaultSpecifier',
    );
    if (defaultSpecifier?.local?.name) {
      importMap.set(source, defaultSpecifier.local.name);
    }
  }

  return importMap;
};

const getImportInsertPosition = (program: ProgramNode): number => {
  let insertAt = program.start;
  for (const node of program.body) {
    if (node.type === 'ImportDeclaration') insertAt = node.end;
  }
  return insertAt;
};

const buildImportLines = (
  images: Map<string, ImageConfig>,
  importMap: Map<string, string>,
): string[] => {
  const lines: string[] = [];
  const added = new Set(importMap.keys());

  for (const config of images.values()) {
    if (config.isVideo && config.videoId && config.videoSrc) {
      if (!added.has(config.videoSrc)) {
        lines.push(`import ${config.videoId} from '${config.videoSrc}';`);
        added.add(config.videoSrc);
      }
      continue;
    }

    if (config.hasSrcset && config.avifSetId && config.avifSetSrc) {
      if (!added.has(config.avifSetSrc)) {
        lines.push(`import ${config.avifSetId} from '${config.avifSetSrc}';`);
        added.add(config.avifSetSrc);
      }
    }

    if (!added.has(config.fallbackSrc)) {
      lines.push(`import ${config.fallbackId} from '${config.fallbackSrc}';`);
      added.add(config.fallbackSrc);
    }

    if (config.hasMeta && config.metaId && config.metaSrc) {
      if (!added.has(config.metaSrc)) {
        lines.push(`import ${config.metaId} from '${config.metaSrc}';`);
        added.add(config.metaSrc);
      }
    }

    if (config.hasLqip && config.lqipId && config.lqipSrc) {
      if (!added.has(config.lqipSrc)) {
        lines.push(`import ${config.lqipId} from '${config.lqipSrc}';`);
        added.add(config.lqipSrc);
      }
    }
  }

  return lines;
};

// ---------------------------------------------------------------------------
// Width normalization
// ---------------------------------------------------------------------------

const normalizeWidths = (widths: number[] | undefined, mainWidth: number | undefined): number[] => {
  const values = [...(widths ?? [])];
  if (typeof mainWidth === 'number') values.push(mainWidth);

  const unique = Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)));
  unique.sort((a, b) => a - b);
  return unique;
};

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

const formatInlineImage = (
  s: MagicString,
  node: AstNode,
  src: SvelteTextNode,
  cfg: ImageConfig,
  imageClasses: string[],
  isFirstImage: boolean,
): void => {
  s.update(src.start, src.end, `{${cfg.fallbackId}}`);

  const classAttr = getAttribute(node, 'class');
  const classValueNode = getStaticAttributeValueNode(classAttr);
  const classValue = classValueNode?.data ?? '';
  const mergedClass = classValue.trim() ? merge(classValue, imageClasses) : imageClasses.join(' ');

  const hasPriority =
    isFirstImage || hasAttribute(node, 'data-priority') || hasAttribute(node, 'fetchpriority');

  const additions: string[] = [];

  if (classAttr && classValueNode) {
    s.update(classValueNode.start, classValueNode.end, mergedClass);
  } else if (!classAttr) {
    additions.push(` class="${mergedClass}"`);
  }

  if (isFirstImage && !hasAttribute(node, 'fetchpriority')) {
    additions.push(' fetchpriority="high"');
  }

  if (!hasAttribute(node, 'loading')) {
    additions.push(hasPriority ? ' loading="eager"' : ' loading="lazy"');
  }
  if (!hasAttribute(node, 'decoding')) {
    additions.push(hasPriority ? ' decoding="auto"' : ' decoding="async"');
  }

  if (cfg.hasMeta && cfg.metaId) {
    if (!hasAttribute(node, 'width')) additions.push(` width={${cfg.metaId}.width}`);
    if (!hasAttribute(node, 'height')) additions.push(` height={${cfg.metaId}.height}`);
  }

  if (additions.length > 0) {
    s.appendLeft(node.start + 4, additions.join(''));
  }
};

const buildImageAttributes = (
  content: string,
  node: AstNode,
  cfg: ImageConfig,
  defaultSizes: string,
  imageClasses: string[],
  isFirstImage: boolean,
): { imgAttributes: string; sizesAttr: string } => {
  const otherAttrs: string[] = [];
  let sizesAttrRaw: string | undefined;
  let hasAlt = false;
  let hasClass = false;
  let classIsStatic = false;
  let classValue = '';
  let hasLoading = false;
  let hasDecoding = false;
  let hasWidth = false;
  let hasHeight = false;
  let hasPriority = false;
  let hasFetchpriority = false;

  for (const attr of node.attributes) {
    const raw = getRawAttribute(attr, content);
    if (attr.type === 'Attribute') {
      if (attr.name === 'src' || attr.name === 'srcset') continue;
      if (attr.name === 'sizes') {
        sizesAttrRaw = raw;
        continue;
      }
      if (attr.name === 'class') {
        hasClass = true;
        const value = getStaticAttributeText(attr);
        if (value !== undefined) {
          classIsStatic = true;
          classValue = value;
        } else {
          otherAttrs.push(raw);
        }
        continue;
      }
      if (attr.name === 'alt') {
        hasAlt = true;
        otherAttrs.push(raw);
        continue;
      }
      if (attr.name === 'loading') {
        hasLoading = true;
        otherAttrs.push(raw);
        continue;
      }
      if (attr.name === 'decoding') {
        hasDecoding = true;
        otherAttrs.push(raw);
        continue;
      }
      if (attr.name === 'width') {
        hasWidth = true;
        otherAttrs.push(raw);
        continue;
      }
      if (attr.name === 'height') {
        hasHeight = true;
        otherAttrs.push(raw);
        continue;
      }
      if (attr.name === 'fetchpriority') {
        hasPriority = true;
        hasFetchpriority = true;
        otherAttrs.push(raw);
        continue;
      }
      if (attr.name === 'data-priority') {
        hasPriority = true;
        otherAttrs.push(raw);
        continue;
      }

      otherAttrs.push(raw);
    } else {
      otherAttrs.push(raw);
    }
  }

  if (isFirstImage) hasPriority = true;

  const mergedClass = classValue.trim() ? merge(classValue, imageClasses) : imageClasses.join(' ');
  const imgAttrs: string[] = [`src={${cfg.fallbackId}}`];

  if (!hasAlt) imgAttrs.push('alt=""');

  if (hasClass && classIsStatic) {
    imgAttrs.push(`class="${mergedClass}"`);
  } else if (!hasClass) {
    imgAttrs.push(`class="${mergedClass}"`);
  }

  if (isFirstImage && !hasFetchpriority) {
    imgAttrs.push('fetchpriority="high"');
  }

  if (!hasLoading) {
    imgAttrs.push(hasPriority ? 'loading="eager"' : 'loading="lazy"');
  }
  if (!hasDecoding) {
    imgAttrs.push(hasPriority ? 'decoding="auto"' : 'decoding="async"');
  }

  if (cfg.hasMeta && cfg.metaId) {
    if (!hasWidth) imgAttrs.push(`width={${cfg.metaId}.width}`);
    if (!hasHeight) imgAttrs.push(`height={${cfg.metaId}.height}`);
  }

  if (cfg.hasLqip && cfg.lqipId) {
    imgAttrs.push(`style="background-size:cover;background-image:url({${cfg.lqipId}})"`);
  }

  const sizesAttr = sizesAttrRaw?.trim() || `sizes="${defaultSizes}"`;
  return {
    imgAttributes: imgAttrs.concat(otherAttrs).join(' '),
    sizesAttr,
  };
};

/**
 * Replace <img> with <picture> that prefers AVIF, falls back to original format.
 */
const formatPicture = (
  s: MagicString,
  node: AstNode,
  cfg: ImageConfig,
  content: string,
  defaultSizes: string,
  imageClasses: string[],
  isFirstImage: boolean,
): void => {
  const { imgAttributes, sizesAttr } = buildImageAttributes(
    content,
    node,
    cfg,
    defaultSizes,
    imageClasses,
    isFirstImage,
  );
  const sizesSnippet = sizesAttr ? ` ${sizesAttr}` : '';

  const replacement = `
<picture>
  <source type="image/avif" srcset="{${cfg.avifSetId}}"${sizesSnippet} />
  <img ${imgAttributes} />
</picture>`;

  s.update(node.start, node.end, replacement);
};

const buildVideoAttributes = (content: string, node: AstNode, imageClasses: string[]): string => {
  const otherAttrs: string[] = [];
  let hasClass = false;
  let classIsStatic = false;
  let classValue = '';
  let hasControls = false;

  for (const attr of node.attributes) {
    const raw = getRawAttribute(attr, content);
    if (attr.type === 'Attribute') {
      if (attr.name === 'src' || attr.name === 'srcset' || attr.name === 'sizes') continue;
      if (attr.name === 'alt') continue;
      if (attr.name === 'class') {
        hasClass = true;
        const value = getStaticAttributeText(attr);
        if (value !== undefined) {
          classIsStatic = true;
          classValue = value;
        } else {
          otherAttrs.push(raw);
        }
        continue;
      }
      if (attr.name === 'controls') {
        hasControls = true;
        otherAttrs.push(raw);
        continue;
      }

      otherAttrs.push(raw);
    } else {
      otherAttrs.push(raw);
    }
  }

  const mergedClass = classValue.trim() ? merge(classValue, imageClasses) : imageClasses.join(' ');
  const attrs: string[] = [];

  if (hasClass && classIsStatic) {
    attrs.push(`class="${mergedClass}"`);
  } else if (!hasClass) {
    attrs.push(`class="${mergedClass}"`);
  }

  if (!hasControls) attrs.push('controls');

  return attrs.concat(otherAttrs).join(' ');
};

/**
 * Adds the imported video reference as the video `src`.
 * Adds the Tailwind classes to the element.
 */
const formatVideo = (
  s: MagicString,
  node: AstNode,
  cfg: ImageConfig,
  content: string,
  imageClasses: string[],
): void => {
  if (!cfg.videoId) return;

  const videoAttrs = buildVideoAttributes(content, node, imageClasses);
  const mimeType = getVideoMimeType(cfg.url);
  const typeAttr = mimeType ? ` type="${mimeType}"` : '';
  const attrs = videoAttrs ? ` ${videoAttrs}` : '';

  s.update(
    node.start,
    node.end,
    `<video${attrs}><source src={${cfg.videoId}}${typeAttr} /></video>`,
  );
};
