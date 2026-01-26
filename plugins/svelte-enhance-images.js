import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { camelCase } from 'change-case';
import MagicString from 'magic-string';
import { parse } from 'svelte/compiler';
import { twMerge as merge } from 'tailwind-merge';

/**
 * @typedef {{ type: string, data: string, raw?: string, start: number, end: number }} SvelteTextNode
 * @typedef {{ type: string, name?: string, value?: SvelteTextNode[], start: number, end: number }} SvelteAttributeNode
 * @typedef {{ name?: string, type?: string, start: number, end: number, attributes: SvelteAttributeNode[], children?: AstNode[] }} AstNode
 * @typedef {{
 *  url: string,
 *  fallbackId: string,
 *  fallbackSrc: string,
 *  webpSetId?: string,
 *  webpSetSrc?: string,
 *  avifSetId?: string,
 *  avifSetSrc?: string,
 *  metaId?: string,
 *  metaSrc?: string,
 *  hasMeta: boolean,
 *  hasSrcset: boolean,
 *  isGif?: boolean,
 *  isVideo?: boolean,
 *  isPassthrough?: boolean,
 *  videoId?: string,
 *  videoSrc?: string
 * }} ImageConfig
 * @typedef {{
 *  widths?: number[],
 *  mainWidth?: number,
 *  includeMetadata?: boolean,
 *  skipImages?: string[],
 *  sizes?: string,
 *  cacheDir?: string
 * }} ProcessImagesOptions
 * @typedef {{
 *  start: number,
 *  end: number,
 *  body: Array<{
 *    type: string,
 *    start: number,
 *    end: number,
 *    source?: { value?: string },
 *    specifiers?: Array<{ type: string, local?: { name: string } }>
 *  }>
 * }} ProgramNode
 */

const classes = ['max-w-full', 'rounded-md', 'shadow-md'];
const cacheVersion = '1';
/** @type {Map<string, { code: string, map: string | null }>} */
const transformCache = new Map();

/**
 * @param {unknown} error
 */
const isMissingFile = (error) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

/**
 * @param {string} cacheKey
 * @param {string} cachePath
 * @returns {Promise<{ code: string, map: string | null } | null>}
 */
const readCacheEntry = async (cacheKey, cachePath) => {
  const cached = transformCache.get(cacheKey);
  if (cached) return cached;

  try {
    const contents = await readFile(cachePath, 'utf8');
    const entry = JSON.parse(contents);
    transformCache.set(cacheKey, entry);
    return entry;
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
};

/**
 * @param {string} cacheKey
 * @param {string} cachePath
 * @param {{ code: string, map: string | null }} entry
 */
const writeCacheEntry = async (cacheKey, cachePath, entry) => {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(entry), 'utf8');
  transformCache.set(cacheKey, entry);
};

/**
 * Add image optimization to the Markdown content.
 */
/**
 * Add image optimization to the Markdown content.
 * @param {ProcessImagesOptions} [opts]
 * @returns {import('svelte/compiler').PreprocessorGroup}
 */
export const processImages = (opts = {}) => {
  /** @type {{ widths: number[], mainWidth: number, includeMetadata: boolean, skipImages: string[], sizes?: string, cacheDir: string }} */
  const options = {
    widths: [480, 768, 1024],
    mainWidth: 902,
    includeMetadata: true,
    skipImages: [],
    sizes: undefined,
    cacheDir: '.svelte-kit/process-images',
    // formats are currently avif + webp; keeping fixed for broad compatibility
    ...opts,
  };

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
  });
  const cachePrefix = createHash('sha256').update(cacheVersion).update(cacheOptions).digest('hex');

  const preprocessor = {
    name: 'markdown-image-optimization',
    /**
     * @param {{ content: string, filename?: string }} context
     */
    async markup(context) {
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
        const cached = await readCacheEntry(cacheKey, cachePath);
        if (cached) {
          return { code: cached.code, map: cached.map ?? undefined };
        }
      }

      // Parse the content with the Svelte Compiler and create a MagicString instance.
      const { instance, html } = parse(content, { filename });
      const s = new MagicString(content);

      /** @type {Map<string, ImageConfig>} */
      const images = new Map();
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

      const map = s.generateMap({ hires: true });
      const result = {
        code: s.toString(),
        map: map.toString(),
      };

      if (cachePath) {
        await writeCacheEntry(cacheKey, cachePath, result);
      }

      return result;
    },
  };
  return preprocessor;
};

/**
 * Check if the URL is a video.
 * @param {string} url
 */
const isVideo = (url) => {
  const extension = getFileExtension(url);
  return extension === 'mp4' || extension === 'webm' || extension === 'ogg';
};

/**
 * @param {string} url
 * @returns {string | undefined}
 */
const getVideoMimeType = (url) => {
  const extension = getFileExtension(url);
  if (extension === 'mp4') return 'video/mp4';
  if (extension === 'webm') return 'video/webm';
  if (extension === 'ogg') return 'video/ogg';
  return undefined;
};

/**
 * Gets an attribute by name.
 * @param {AstNode} node
 * @param {string} name
 * @returns {SvelteAttributeNode | undefined}
 */
const getAttribute = (node, name) =>
  node.attributes.find((attr) => attr.type === 'Attribute' && attr.name === name);

/**
 * @param {AstNode} node
 * @param {string} name
 */
const hasAttribute = (node, name) => Boolean(getAttribute(node, name));

/**
 * Gets the value of a static text attribute.
 * @param {SvelteAttributeNode | undefined} attr
 * @returns {SvelteTextNode | undefined}
 */
const getStaticAttributeValueNode = (attr) => {
  if (!attr || attr.type !== 'Attribute' || !attr.value || attr.value.length !== 1) return;
  const [value] = attr.value;
  if (value.type === 'Text') return value;
};

/**
 * @param {SvelteAttributeNode | undefined} attr
 * @returns {string | undefined}
 */
const getStaticAttributeText = (attr) => getStaticAttributeValueNode(attr)?.data;

/**
 * @param {SvelteAttributeNode} attr
 * @param {string} content
 */
const getRawAttribute = (attr, content) => content.slice(attr.start, attr.end);

/**
 * Adds the imported image reference to as the image `src`.
 * Adds the Tailwind classes to the element.
 * @param {MagicString} s
 * @param {AstNode} node
 * @param {SvelteTextNode} src
 * @param {ImageConfig} cfg
 */
const formatInlineImage = (s, node, src, cfg) => {
  s.update(src.start, src.end, `{${cfg.fallbackId}}`);

  const classAttr = getAttribute(node, 'class');
  const classValueNode = getStaticAttributeValueNode(classAttr);
  const classValue = classValueNode?.data ?? '';
  const mergedClass = classValue.trim() ? merge(classValue, classes) : classes.join(' ');

  const hasPriority = hasAttribute(node, 'data-priority') || hasAttribute(node, 'fetchpriority');

  const additions = [];

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

/**
 * @param {string} content
 * @param {AstNode} node
 * @param {ImageConfig} cfg
 * @param {string} defaultSizes
 * @returns {{ imgAttributes: string, sizesAttr: string }}
 */
const buildImageAttributes = (content, node, cfg, defaultSizes) => {
  const otherAttrs = [];
  let sizesAttrRaw;
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
  const imgAttrs = [`src={${cfg.fallbackId}}`];

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
 * @param {MagicString} s
 * @param {AstNode} node
 * @param {ImageConfig} cfg
 * @param {string} content
 * @param {string} defaultSizes
 */
const formatPicture = (s, node, cfg, content, defaultSizes) => {
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

/**
 * @param {string} content
 * @param {AstNode} node
 * @returns {string}
 */
const buildVideoAttributes = (content, node) => {
  const otherAttrs = [];
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
  const attrs = [];

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
 * @param {MagicString} s
 * @param {AstNode} node
 * @param {ImageConfig} cfg
 * @param {string} content
 */
const formatVideo = (s, node, cfg, content) => {
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

/**
 * @param {Map<string, ImageConfig>} images
 * @param {Map<string, string>} importMap
 * @returns {string[]}
 */
const buildImportLines = (images, importMap) => {
  const lines = [];
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

/**
 * @param {ProgramNode | null | undefined} program
 * @returns {Map<string, string>}
 */
const collectExistingImports = (program) => {
  /** @type {Map<string, string>} */
  const importMap = new Map();
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

/**
 * @param {ProgramNode} program
 * @returns {number}
 */
const getImportInsertPosition = (program) => {
  let insertAt = program.start;
  for (const node of program.body) {
    if (node.type === 'ImportDeclaration') insertAt = node.end;
  }
  return insertAt;
};

/**
 * @param {Map<string, string>} importMap
 * @param {string} source
 * @param {string} fallback
 * @returns {string}
 */
const resolveImportId = (importMap, source, fallback) => importMap.get(source) ?? fallback;

/**
 * @param {number[] | undefined} widths
 * @param {number | undefined} mainWidth
 * @returns {number[]}
 */
const normalizeWidths = (widths, mainWidth) => {
  const values = [...(widths ?? [])];
  if (typeof mainWidth === 'number') values.push(mainWidth);

  const unique = Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)));
  unique.sort((a, b) => a - b);
  return unique;
};

/**
 * @param {string} url
 */
const stripQueryHash = (url) => url.split(/[?#]/)[0];

/**
 * @param {string} url
 */
const getFileExtension = (url) => {
  const cleanUrl = stripQueryHash(url);
  const index = cleanUrl.lastIndexOf('.');
  if (index === -1) return '';
  return cleanUrl.slice(index + 1).toLowerCase();
};

/**
 * @param {string} value
 * @returns {string}
 */
const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * @param {string} value
 */
const isExternalUrl = (value) => {
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value)) return true;
  return /^(data|blob|mailto|tel|javascript):/i.test(value);
};

/**
 * @param {string} url
 * @param {string} query
 */
const appendQuery = (url, query) => {
  const [base, hash] = url.split('#');
  const separator = base.includes('?') ? '&' : '?';
  const next = `${base}${separator}${query}`;
  return hash ? `${next}#${hash}` : next;
};

/**
 * @param {any} node
 * @param {(node: AstNode, ancestors: AstNode[]) => void} visit
 * @param {AstNode[]} [ancestors]
 */
const walkHtml = (node, visit, ancestors = []) => {
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
          walkHtml(entry, visit, ancestors);
        }
      }
    } else if (typeof value === 'object' && 'type' in value) {
      walkHtml(value, visit, ancestors);
    }
  }

  if (isElement) ancestors.pop();
};
