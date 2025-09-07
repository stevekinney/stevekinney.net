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
export const processImages = () => {
  /** @type {import('svelte/compiler').PreprocessorGroup} */
  const preprocessor = {
    name: 'markdown-image-optimization',
    markup({ content, filename }) {
      if (!filename || !filename.endsWith('.md')) return undefined;

      // Parse the content with the Svelte Compiler and create a MagicString instance.
      const { instance, html } = parse(content, { filename });
      const s = new MagicString(content);

      /** @type {Map<string, {url: string, id: string, metaId?: string, setId?: string, hasMeta: boolean, hasSrcset: boolean}>} */
      const images = new Map();

      // Walk the HTML AST and find all the image elements.
      for (const node of walk(html)) {
        if ('name' in node && node.name === 'img') {
          const src = getAttribute(node, 'src');

          if (!src) continue;

          const srcValue = getAttributeValue(src);

          if (!srcValue) continue;

          let url = decodeURIComponent(srcValue.data);

          if (url.startsWith('assets/')) url = `./${url}`;

          const id = '_' + camelCase(url);
          const isGif = url.toLowerCase().endsWith('.gif');
          const metaId = isGif ? undefined : id + '_meta';
          const setId = isGif ? undefined : id + '_set';

          images.set(url, { id, url, metaId, setId, hasMeta: !isGif, hasSrcset: !isGif });

          if (isVideo(url)) {
            formatVideo(s, node, id);
            continue;
          }

          formatImage(
            s,
            node,
            id,
            srcValue,
            images.get(url) ?? { hasMeta: false, hasSrcset: false },
          );
        }
      }

      // Add the correct import statements at the top of the file.
      if (instance) {
        for (const node of walk(instance)) {
          if (node.type === 'Program') {
            const imports = Array.from(images.entries())
              .map(([url, cfg]) => {
                const lines = [];
                if (cfg.hasSrcset) {
                  // Multiple widths for responsive images
                  lines.push(
                    `import ${cfg.setId} from '${url}?w=480;768;1024&format=avif&srcset';`,
                  );
                }
                // Main src (single reasonably large width)
                const mainSrc = url.toLowerCase().endsWith('gif')
                  ? url
                  : `${url}?w=902&format=avif&withoutEnlargement`;
                lines.push(`import ${cfg.id} from '${mainSrc}';`);
                if (cfg.hasMeta && cfg.metaId) {
                  lines.push(`import ${cfg.metaId} from '${url}?metadata';`);
                }
                return lines.join('\n');
              })
              .join('\n');

            s.appendLeft(node.end, imports);
            break;
          }
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
 * @param {{ metaId?: string, setId?: string, hasMeta: boolean, hasSrcset: boolean }} cfg
 * @returns {void}
 */
const formatImage = (s, node, id, src, cfg) => {
  s.update(src.start, src.end, `{${id}}`);

  const classAttr = getAttribute(node, 'class');

  if (classAttr) {
    const classValue = getAttributeValue(classAttr);
    if (!classValue || !classValue.data.trim()) {
      // If the class attribute is empty, append the default classes
      s.appendLeft(node.start + 4, ` class="${classes.join(' ')}"`);
    } else {
      s.update(classValue.start, classValue.end, merge(classValue.data, classes));
    }
  } else {
    // Add the class attributes right after `<img`.
    s.appendLeft(node.start + 4, ` class="${classes.join(' ')}"`);
  }

  // Add loading and decoding hints if not present
  const loadingAttr = getAttribute(node, 'loading');
  if (!loadingAttr) {
    s.appendLeft(node.start + 4, ` loading="lazy"`);
  }
  const decodingAttr = getAttribute(node, 'decoding');
  if (!decodingAttr) {
    s.appendLeft(node.start + 4, ` decoding="async"`);
  }

  // Add width/height to reduce CLS when metadata is available
  if (cfg && cfg.hasMeta && cfg.metaId) {
    const widthAttr = getAttribute(node, 'width');
    if (!widthAttr) {
      s.appendLeft(node.start + 4, ` width="{${cfg.metaId}.width}"`);
    }
    const heightAttr = getAttribute(node, 'height');
    if (!heightAttr) {
      s.appendLeft(node.start + 4, ` height="{${cfg.metaId}.height}"`);
    }
  }

  // Add srcset and sizes if configured
  if (cfg && cfg.hasSrcset && cfg.setId) {
    const srcsetAttr = getAttribute(node, 'srcset');
    if (!srcsetAttr) {
      s.appendLeft(node.start + 4, ` srcset="{${cfg.setId}}"`);
    }
    const sizesAttr = getAttribute(node, 'sizes');
    if (!sizesAttr) {
      // Default sizes: full width on small screens, cap at ~902px otherwise
      s.appendLeft(
        node.start + 4,
        ` sizes="(min-width: 1280px) 902px, (min-width: 768px) 80vw, 100vw"`,
      );
    }
  }
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
