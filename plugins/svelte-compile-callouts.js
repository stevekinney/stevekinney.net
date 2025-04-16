import { parse } from 'svelte/compiler';

import MagicString from 'magic-string';
import { walk } from 'svelte-tree-walker';

/**
 * Represents a callout message component.
 *
 * @typedef {Object} Callout
 * @property {string} title The title of the callout.
 * @property {string} variant The variant of the callout to display (e.g., "info", "warning").
 * @property {string} [description] An optional detailed description for the callout.
 * @property {boolean} [foldable] Whether the callout can be expanded or collapsed.
 */

/**
 * Turn Obsidian callouts into Svelte components.
 * @returns {import('svelte/compiler').PreprocessorGroup} A Svelte preprocessor.
 */
export const processCallouts = () => {
  return {
    name: 'markdown-process-callouts',
    markup: ({ content, filename }) => {
      if (!filename?.endsWith('.md')) return;

      const { instance, html } = parse(content, { filename });
      const s = new MagicString(content);

      /**
       * Did we find any callouts in the Markdown file?
       */
      let hasCallouts = false;

      for (const node of walk(html)) {
        if ('name' in node && node.name === 'blockquote') {
          const start = node.start;
          const end = node.end;

          const callout = parseCallout(content.substring(start, end));

          if (callout) {
            hasCallouts = true;
            s.overwrite(start, end, compileCallout(callout));
          }
        }
      }

      /**
       *  If we found any callouts, we need to import the `Callout` component.
       */
      if (hasCallouts) {
        if (instance) {
          for (const node of walk(instance)) {
            if (node.type === 'Program') {
              s.appendLeft(node.end, `\n\timport Callout from '$lib/components/callout';\n`);
              break;
            }
          }
        }
      }

      return {
        code: s.toString(),
        map: s.generateMap({ hires: true }),
      };
    },
  };
};

/**
 * A regular expression that *should* match callouts in Markdown.
 */
const pattern = /\[!\s*(\w+)\s*\]([+-]?)\s+([^<>\n]+)/i;

/**
 * Parse callout text into an object.
 * @param {string} markup A string that may or may not be a callout.
 * @returns {Callout | null} The metadata of the callout or `null`, if it's not a callout.
 */
export function parseCallout(markup) {
  const match = markup.match(pattern);
  if (!match) return null;

  /* Remove the HTML tags. */
  markup = markup.replace('<blockquote>', '').replace('</blockquote>', '');

  const title = match[3].trim();
  const variant = match[1].toLowerCase();
  const foldable = Boolean(match[2] === '+' || match[2] === '-');

  let description = markup
    .replace(pattern, '')
    .replace(/<p>\s+/, '<p>')
    .trim();

  if (description === '<p></p>') {
    description = undefined;
  }

  return {
    title,
    variant,
    description,
    foldable,
  };
}

/**
 * @typedef {import('./svelte-compile-callouts/src/callout').Callout} Callout
 */

/**
 * Takes a callout object and returns the markup for a Svelte compoonent.
 * @param {Callout} callout
 * @returns {string} The markup for a Svelte component.
 */
export const compileCallout = (callout) => {
  const { title, variant, description, foldable } = callout;

  const attributes = [];

  if (title) attributes.push(`title="${title}"`);
  if (variant) attributes.push(`variant="${variant}"`);
  if (foldable) attributes.push('foldable');

  if (description) return `<Callout ${attributes.join(' ')}>${description}</Callout>`;

  return `<Callout ${attributes.join(' ')} />`;
};
