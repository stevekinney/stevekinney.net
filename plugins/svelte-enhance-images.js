import { camelCase } from 'change-case';
import MagicString from 'magic-string';
import { walk } from 'svelte-tree-walker';
import { parse } from 'svelte/compiler';
import { twMerge as merge } from 'tailwind-merge';

/**
 * @typedef {{ name: string; value: { type: string; data: string; start: number; end: number }[] }} SvelteAttribute
 * @typedef {{ type: string; data: string; start: number; end: number }} SvelteTextNode
 * @typedef {any} AstNode
 * @typedef {import('magic-string').SourceMap} SourceMap // Keep this if needed elsewhere
 */

const classes = ['max-w-full', 'rounded-md', 'shadow-md'];

/**
 * Add image optimization to the Markdown content.
 * @returns {import('svelte/compiler').PreprocessorGroup}
 */
export const processImages = (opts = {}) => {
  const options = {
    widths: [480, 768, 1024],
    mainWidth: 902,
    // formats are currently avif + webp; keeping fixed for broad compatibility
    ...opts,
  };
  /** @type {import('svelte/compiler').PreprocessorGroup} */
  const preprocessor = {
    name: 'markdown-image-optimization',
    markup({ content, filename }) {
      if (!filename || !filename.endsWith('.md')) return undefined;

      // Parse the content with the Svelte Compiler and create a MagicString instance.
      const { instance, html } = parse(content, { filename });
      const s = new MagicString(content);

      /** @type {Map<string, {url: string,
       *  webpId: string,
       *  avifId: string,
       *  webpSetId?: string,
       *  avifSetId?: string,
       *  metaId?: string,
       *  hasMeta: boolean,
       *  hasSrcset: boolean,
       *  isGif?: boolean,
       *  isVideo?: boolean,
       *  videoId?: string
       * }>} */
      const images = new Map();

      // Walk the HTML AST and find all the image elements.
      for (const node of walk(html)) {
        if ('name' in node && node.name === 'img') {
          const src = getAttribute(node, 'src');

          if (!src) continue;

          const srcValue = getAttributeValue(src);

          if (!srcValue) continue;

          let urlRaw = srcValue.data;
          // Skip external absolute URLs
          if (/^(https?:)?\/\//i.test(urlRaw)) continue;
          let url;
          try {
            url = decodeURIComponent(urlRaw);
          } catch {
            url = urlRaw;
          }

          if (url.startsWith('assets/')) url = `./${url}`;

          const baseId = '_' + camelCase(url);
          const isGif = url.toLowerCase().endsWith('.gif');
          const isVid = isVideo(url);
          const metaId = isGif ? undefined : baseId + '_meta';
          const webpSetId = isGif ? undefined : baseId + '_webp_set';
          const avifSetId = isGif ? undefined : baseId + '_avif_set';
          const webpId = baseId + '_webp';
          const avifId = baseId + '_avif';
          const videoId = isVid ? baseId + '_video' : undefined;

          images.set(url, {
            url,
            webpId,
            avifId,
            webpSetId,
            avifSetId,
            metaId,
            hasMeta: !isGif && !isVid,
            hasSrcset: !isGif && !isVid,
            isGif,
            isVideo: isVid,
            videoId,
          });

          if (isVid && videoId) {
            formatVideo(s, node, videoId);
            continue;
          }

          formatImage(
            s,
            node,
            baseId,
            srcValue,
            images.get(url) ?? { hasMeta: false, hasSrcset: false },
          );
        }
      }

      // Add the correct import statements at the top of the file.
      if (instance) {
        for (const node of walk(instance)) {
          if (node.type === 'Program') {
            const importLines = [];
            for (const [url, cfg] of images.entries()) {
              if (cfg.isVideo) {
                const videoLine = `import ${cfg.videoId} from '${url}';`;
                if (!content.includes(videoLine)) importLines.push(videoLine);
              } else if (!cfg.isGif && cfg.hasSrcset) {
                const avifSet = `import ${cfg.avifSetId} from '${url}?w=${options.widths.join(
                  ';',
                )}&format=avif&srcset';`;
                const webpSet = `import ${cfg.webpSetId} from '${url}?w=${options.widths.join(
                  ';',
                )}&format=webp&srcset';`;
                if (!content.includes(avifSet)) importLines.push(avifSet);
                if (!content.includes(webpSet)) importLines.push(webpSet);
              }
              // Main sources
              if (cfg.isGif) {
                const webpMain = `import ${cfg.webpId} from '${url}';`;
                if (!content.includes(webpMain)) importLines.push(webpMain);
              } else if (!cfg.isVideo) {
                const avifMain = `import ${cfg.avifId} from '${url}?w=${options.mainWidth}&format=avif&withoutEnlargement';`;
                const webpMain = `import ${cfg.webpId} from '${url}?w=${options.mainWidth}&format=webp&withoutEnlargement';`;
                if (!content.includes(avifMain)) importLines.push(avifMain);
                if (!content.includes(webpMain)) importLines.push(webpMain);
              }
              if (cfg.hasMeta && cfg.metaId) {
                const metaLine = `import ${cfg.metaId} from '${url}?metadata';`;
                if (!content.includes(metaLine)) importLines.push(metaLine);
              }
            }
            if (importLines.length > 0) {
              s.appendLeft(node.end, `\n${importLines.join('\n')}\n`);
            }
            break;
          }
        }
      } else if (images.size > 0) {
        // No <script> block present; create one
        const lines = [];
        for (const [url, cfg] of images.entries()) {
          if (cfg.isVideo) {
            lines.push(`import ${cfg.videoId} from '${url}';`);
          } else if (!cfg.isGif && cfg.hasSrcset) {
            lines.push(
              `import ${cfg.avifSetId} from '${url}?w=${options.widths.join(';')}&format=avif&srcset';`,
            );
            lines.push(
              `import ${cfg.webpSetId} from '${url}?w=${options.widths.join(';')}&format=webp&srcset';`,
            );
          }
          if (cfg.isGif) {
            lines.push(`import ${cfg.webpId} from '${url}';`);
          } else if (!cfg.isVideo) {
            lines.push(
              `import ${cfg.avifId} from '${url}?w=${options.mainWidth}&format=avif&withoutEnlargement';`,
            );
            lines.push(
              `import ${cfg.webpId} from '${url}?w=${options.mainWidth}&format=webp&withoutEnlargement';`,
            );
          }
          if (cfg.hasMeta && cfg.metaId) {
            lines.push(`import ${cfg.metaId} from '${url}?metadata';`);
          }
        }
        if (lines.length > 0) {
          s.prepend(`<script>\n${lines.join('\n')}\n</script>\n`);
        }
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
 * @param {string} url
 * @returns {boolean}
 */
const isVideo = (url) => url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg');

/**
 * Gets an attribute by name.
 * @param {AstNode} node
 * @param {string} name
 * @returns {SvelteAttribute | undefined}
 **/
const getAttribute = (node, name) =>
  node.attributes.find((/** @type {SvelteAttribute} */ attr) => attr.name === name);

/**
 * Gets the value of an attribute.
 * @param {SvelteAttribute} attr
 * @returns {SvelteTextNode | undefined}
 */
const getAttributeValue = (attr) => {
  if (attr.value.length === 0) return;
  const [value] = attr.value;
  if (value.type === 'Text') return value;
};

/**
 * Adds the imported image refernce to as the image `src`.
 * Adds the Tailwind classes to the element.
 * @param {MagicString} s
 * @param {AstNode} node
 * @param {string} id
 * @param {SvelteTextNode} src
 * @param {{ metaId?: string, setId?: string, webpId?: string, avifId?: string, webpSetId?: string, avifSetId?: string, hasMeta: boolean, hasSrcset: boolean, isGif?: boolean }} cfg
 * @returns {void}
 */
const formatImage = (s, node, id, src, cfg) => {
  const altAttr = getAttribute(node, 'alt');
  const altValue = altAttr ? getAttributeValue(altAttr) : undefined;
  const alt = altValue ? altValue.data : '';

  const classAttr = getAttribute(node, 'class');
  const classValue = classAttr ? getAttributeValue(classAttr) : undefined;
  const mergedClass =
    classValue && classValue.data.trim() ? merge(classValue.data, classes) : classes.join(' ');

  const sizes = `(min-width: 1280px) 902px, (min-width: 768px) 80vw, 100vw`;

  // Build width/height attributes if metadata available
  const dimAttrs =
    cfg && cfg.hasMeta && cfg.metaId
      ? ` width="{${cfg.metaId}.width}" height="{${cfg.metaId}.height}"`
      : '';

  // If GIF, keep as a simple img
  if (cfg && cfg.isGif) {
    s.update(src.start, src.end, `{${cfg.webpId}}`);
    // Ensure class/loading/decoding
    if (classAttr && classValue && classValue.data.trim()) {
      s.update(classValue.start, classValue.end, mergedClass);
    } else {
      s.appendLeft(node.start + 4, ` class="${mergedClass}"`);
    }
    if (!getAttribute(node, 'loading')) s.appendLeft(node.start + 4, ` loading="lazy"`);
    if (!getAttribute(node, 'decoding')) s.appendLeft(node.start + 4, ` decoding="async"`);
    if (dimAttrs) s.appendLeft(node.start + 4, dimAttrs);
    return;
  }

  // Replace <img> with <picture> that prefers AVIF, falls back to WebP, then img
  const replacement = `
<picture>
  <source type="image/avif" srcset="{${cfg.avifSetId}}" sizes="${sizes}" />
  <source type="image/webp" srcset="{${cfg.webpSetId}}" sizes="${sizes}" />
  <img src="{${cfg.webpId}}" alt=${JSON.stringify(alt)} class="${mergedClass}" loading="lazy" decoding="async"${dimAttrs} />
</picture>`;

  s.update(node.start, node.end, replacement);
};

/**
 * Adds the imported video refernce to as the video `src`.
 * Adds the Tailwind classes to the element.
 * @param {MagicString} s
 * @param {AstNode} node
 * @param {string} id
 * @returns {void}
 */
const formatVideo = (s, node, id) => {
  s.update(
    node.start,
    node.end,
    `<video src={${id}} class="${classes.join(' ')}" controls><track kind="captions"></video>`,
  );
};
