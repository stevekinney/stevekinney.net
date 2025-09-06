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

      /** @type {Map<string, {url: string, id: string}>} */
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

          images.set(url, { id, url });

          if (isVideo(url)) {
            formatVideo(s, node, id);
            continue;
          }

          formatImage(s, node, id, srcValue);
        }
      }

      // Add the correct import statements at the top of the file.
      if (instance) {
        for (const node of walk(instance)) {
          if (node.type === 'Program') {
            const imports = Array.from(images.entries())
              .map(([url, { id }]) => {
                let importUrl = url;
                if (!url.endsWith('gif')) importUrl += '?w=902&format=avif&withoutEnlargement';
                return `import ${id} from '${importUrl}';`;
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
 * @returns {void}
 */
const formatImage = (s, node, id, src) => {
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
