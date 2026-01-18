import type { PreprocessorGroup } from 'svelte/compiler';
import { camelCase } from 'change-case';
import MagicString from 'magic-string';
import { parse } from 'svelte/compiler';
import { twMerge as merge } from 'tailwind-merge';

interface SvelteTextNode {
  type: string;
  data: string;
  raw?: string;
  start: number;
  end: number;
}

interface SvelteAttributeNode {
  type: string;
  name?: string;
  value?: SvelteTextNode[];
  start: number;
  end: number;
}

interface AstNode {
  name?: string;
  type?: string;
  start: number;
  end: number;
  attributes: SvelteAttributeNode[];
  children?: AstNode[];
}

interface ImageConfig {
  url: string;
  fallbackId: string;
  fallbackSrc: string;
  webpSetId?: string;
  webpSetSrc?: string;
  avifSetId?: string;
  avifSetSrc?: string;
  metaId?: string;
  metaSrc?: string;
  hasMeta: boolean;
  hasSrcset: boolean;
  isGif?: boolean;
  isVideo?: boolean;
  isPassthrough?: boolean;
  videoId?: string;
  videoSrc?: string;
}

interface ProcessImagesOptions {
  widths?: number[];
  mainWidth?: number;
  includeMetadata?: boolean;
  skipImages?: string[];
  sizes?: string;
}

interface ProgramNode {
  start: number;
  end: number;
  body: Array<{
    type: string;
    start: number;
    end: number;
    source?: { value?: string };
    specifiers?: Array<{ type: string; local?: { name: string } }>;
  }>;
}

const classes = ['max-w-full', 'rounded-md', 'shadow-md'];

/**
 * Add image optimization to the Markdown content.
 */
export const processImages = (opts: ProcessImagesOptions = {}): PreprocessorGroup => {
  const options = {
    widths: [480, 768, 1024],
    mainWidth: 902,
    includeMetadata: true,
    skipImages: [] as string[],
    sizes: undefined as string | undefined,
    // formats are currently avif + webp; keeping fixed for broad compatibility
    ...opts,
  };

  const widths = normalizeWidths(options.widths, options.mainWidth);
  const defaultSizes =
    options.sizes ?? `(min-width: 1280px) ${options.mainWidth}px, (min-width: 768px) 80vw, 100vw`;

  const preprocessor: PreprocessorGroup = {
    name: 'markdown-image-optimization',
    markup({ content, filename }) {
      if (!filename || !filename.endsWith('.md')) return undefined;

      // Quick check: if no img tags, skip processing entirely
      if (!content.includes('<img')) return undefined;

      // Parse the content with the Svelte Compiler and create a MagicString instance.
      const { instance, html } = parse(content, { filename }) as {
        instance?: { content: ProgramNode } | null;
        html: AstNode;
      };
      const s = new MagicString(content);

      const images = new Map<string, ImageConfig>();
      const importMap = collectExistingImports(instance?.content);

      // Walk the HTML AST and find all the image elements.
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

        const extension = getFileExtension(urlForMatch);
        const isGif = extension === 'gif';
        const isVid = isVideo(urlForMatch);
        const isSvg = extension === 'svg';
        const isWebp = extension === 'webp';
        const isAvif = extension === 'avif';
        const isPassthrough = isSvg || isWebp || isAvif;

        let config = images.get(url);
        if (!config) {
          const baseId = '_' + camelCase(urlForMatch);
          const fallbackSrc = url;
          const fallbackId = resolveImportId(importMap, fallbackSrc, `${baseId}_src`);

          const hasMeta = options.includeMetadata && !isGif && !isVid && !isSvg;
          const metaSrc = hasMeta ? appendQuery(url, 'metadata') : undefined;
          const metaId = metaSrc
            ? resolveImportId(importMap, metaSrc, `${baseId}_meta`)
            : undefined;

          const hasSrcset = !isGif && !isVid && !isPassthrough;
          const webpSetSrc = hasSrcset
            ? appendQuery(url, `w=${widths.join(';')}&format=webp&as=srcset&withoutEnlargement`)
            : undefined;
          const avifSetSrc = hasSrcset
            ? appendQuery(url, `w=${widths.join(';')}&format=avif&as=srcset&withoutEnlargement`)
            : undefined;
          const webpSetId = webpSetSrc
            ? resolveImportId(importMap, webpSetSrc, `${baseId}_webp_set`)
            : undefined;
          const avifSetId = avifSetSrc
            ? resolveImportId(importMap, avifSetSrc, `${baseId}_avif_set`)
            : undefined;

          const videoId = isVid ? resolveImportId(importMap, url, `${baseId}_video`) : undefined;

          config = {
            url,
            fallbackId,
            fallbackSrc,
            webpSetId,
            webpSetSrc,
            avifSetId,
            avifSetSrc,
            metaId,
            metaSrc,
            hasMeta: Boolean(metaId),
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
          formatVideo(s, node, config, content);
          return;
        }

        if (config.hasSrcset) {
          formatPicture(s, node, config, content, defaultSizes);
          return;
        }

        formatInlineImage(s, node, srcValue, config);
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

      return {
        code: s.toString(),
        map: s.generateMap({ hires: true }),
      };
    },
  };
  return preprocessor;
};

/**
 * Check if the URL is a video.
 */
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

/**
 * Gets an attribute by name.
 */
const getAttribute = (node: AstNode, name: string): SvelteAttributeNode | undefined =>
  node.attributes.find((attr) => attr.type === 'Attribute' && attr.name === name);

const hasAttribute = (node: AstNode, name: string): boolean => Boolean(getAttribute(node, name));

/**
 * Gets the value of a static text attribute.
 */
const getStaticAttributeValueNode = (attr?: SvelteAttributeNode): SvelteTextNode | undefined => {
  if (!attr || attr.type !== 'Attribute' || !attr.value || attr.value.length !== 1) return;
  const [value] = attr.value;
  if (value.type === 'Text') return value;
};

const getStaticAttributeText = (attr?: SvelteAttributeNode): string | undefined =>
  getStaticAttributeValueNode(attr)?.data;

const getRawAttribute = (attr: SvelteAttributeNode, content: string): string =>
  content.slice(attr.start, attr.end);

/**
 * Adds the imported image reference to as the image `src`.
 * Adds the Tailwind classes to the element.
 */
const formatInlineImage = (
  s: MagicString,
  node: AstNode,
  src: SvelteTextNode,
  cfg: ImageConfig,
): void => {
  s.update(src.start, src.end, `{${cfg.fallbackId}}`);

  const classAttr = getAttribute(node, 'class');
  const classValueNode = getStaticAttributeValueNode(classAttr);
  const classValue = classValueNode?.data ?? '';
  const mergedClass = classValue.trim() ? merge(classValue, classes) : classes.join(' ');

  const hasPriority = hasAttribute(node, 'data-priority') || hasAttribute(node, 'fetchpriority');

  const additions: string[] = [];

  if (classAttr && classValueNode) {
    s.update(classValueNode.start, classValueNode.end, mergedClass);
  } else if (!classAttr) {
    additions.push(` class="${mergedClass}"`);
  }

  if (!hasAttribute(node, 'loading') && !hasPriority) additions.push(' loading="lazy"');
  if (!hasAttribute(node, 'decoding') && !hasPriority) additions.push(' decoding="async"');

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
      if (attr.name === 'fetchpriority' || attr.name === 'data-priority') {
        hasPriority = true;
        otherAttrs.push(raw);
        continue;
      }

      otherAttrs.push(raw);
    } else {
      otherAttrs.push(raw);
    }
  }

  const mergedClass = classValue.trim() ? merge(classValue, classes) : classes.join(' ');
  const imgAttrs: string[] = [`src={${cfg.fallbackId}}`];

  if (!hasAlt) imgAttrs.push('alt=""');

  if (hasClass && classIsStatic) {
    imgAttrs.push(`class="${mergedClass}"`);
  } else if (!hasClass) {
    imgAttrs.push(`class="${mergedClass}"`);
  }

  if (!hasLoading && !hasPriority) imgAttrs.push('loading="lazy"');
  if (!hasDecoding && !hasPriority) imgAttrs.push('decoding="async"');

  if (cfg.hasMeta && cfg.metaId) {
    if (!hasWidth) imgAttrs.push(`width={${cfg.metaId}.width}`);
    if (!hasHeight) imgAttrs.push(`height={${cfg.metaId}.height}`);
  }

  const sizesAttr = sizesAttrRaw?.trim() || `sizes="${defaultSizes}"`;
  return {
    imgAttributes: imgAttrs.concat(otherAttrs).join(' '),
    sizesAttr,
  };
};

/**
 * Replace <img> with <picture> that prefers AVIF, falls back to WebP, then original.
 */
const formatPicture = (
  s: MagicString,
  node: AstNode,
  cfg: ImageConfig,
  content: string,
  defaultSizes: string,
): void => {
  const { imgAttributes, sizesAttr } = buildImageAttributes(content, node, cfg, defaultSizes);
  const sizesSnippet = sizesAttr ? ` ${sizesAttr}` : '';

  const replacement = `
<picture>
  <source type="image/avif" srcset="{${cfg.avifSetId}}"${sizesSnippet} />
  <source type="image/webp" srcset="{${cfg.webpSetId}}"${sizesSnippet} />
  <img ${imgAttributes} />
</picture>`;

  s.update(node.start, node.end, replacement);
};

const buildVideoAttributes = (content: string, node: AstNode): string => {
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

  const mergedClass = classValue.trim() ? merge(classValue, classes) : classes.join(' ');
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
const formatVideo = (s: MagicString, node: AstNode, cfg: ImageConfig, content: string): void => {
  if (!cfg.videoId) return;

  const videoAttrs = buildVideoAttributes(content, node);
  const mimeType = getVideoMimeType(cfg.url);
  const typeAttr = mimeType ? ` type="${mimeType}"` : '';
  const attrs = videoAttrs ? ` ${videoAttrs}` : '';

  s.update(
    node.start,
    node.end,
    `<video${attrs}><source src={${cfg.videoId}}${typeAttr} /></video>`,
  );
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

    if (config.hasSrcset && config.webpSetId && config.webpSetSrc) {
      if (!added.has(config.webpSetSrc)) {
        lines.push(`import ${config.webpSetId} from '${config.webpSetSrc}';`);
        added.add(config.webpSetSrc);
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
  }

  return lines;
};

const collectExistingImports = (program?: ProgramNode | null): Map<string, string> => {
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

const resolveImportId = (
  importMap: Map<string, string>,
  source: string,
  fallback: string,
): string => importMap.get(source) ?? fallback;

const normalizeWidths = (widths: number[] | undefined, mainWidth?: number): number[] => {
  const values = [...(widths ?? [])];
  if (typeof mainWidth === 'number') values.push(mainWidth);

  const unique = Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)));
  unique.sort((a, b) => a - b);
  return unique;
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

const walkHtml = (
  node: AstNode,
  visit: (node: AstNode, ancestors: AstNode[]) => void,
  ancestors: AstNode[] = [],
): void => {
  if (!node || typeof node !== 'object') return;

  const isElement = node.type === 'Element';
  if (isElement) {
    visit(node, ancestors);
    ancestors.push(node);
  }

  for (const value of Object.values(node)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === 'object' && 'type' in entry) {
          walkHtml(entry as AstNode, visit, ancestors);
        }
      }
    } else if (typeof value === 'object' && 'type' in value) {
      walkHtml(value as AstNode, visit, ancestors);
    }
  }

  if (isElement) ancestors.pop();
};
