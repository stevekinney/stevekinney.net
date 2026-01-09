import type { PreprocessorGroup } from 'svelte/compiler';
import { parse } from 'svelte/compiler';
import MagicString from 'magic-string';
import { walk } from 'svelte-tree-walker';

/**
 * Represents a callout message component.
 */
export interface Callout {
  title: string;
  variant: string;
  description?: string;
  foldable: boolean;
}

/**
 * A regular expression that matches callouts in Markdown.
 *
 * **Format**: [!variant][+/-] title
 */
const CALLOUT_PATTERN = /\[!\s*(\w+)\s*\]([+-]?)\s+([^<>\n]+)/i;

/**
 * Turn Obsidian callouts into Svelte components.
 */
export const processCallouts = (): PreprocessorGroup => {
  return {
    name: 'markdown-process-callouts',
    markup: ({ content, filename }) => {
      if (!filename?.endsWith('.md')) return;

      const { instance, html } = parse(content, { filename });
      const s = new MagicString(content);
      let hasCallouts = false;

      for (const node of walk(html)) {
        if ('name' in node && node.name === 'blockquote') {
          const start = (node as { start: number }).start;
          const end = (node as { end: number }).end;
          const callout = parseCallout(content.substring(start, end));

          if (callout) {
            hasCallouts = true;
            s.overwrite(start, end, compileCallout(callout));
          }
        }
      }

      if (hasCallouts && instance) {
        for (const node of walk(instance)) {
          if (node.type === 'Program') {
            s.appendLeft(
              (node as { end: number }).end,
              `\n\timport Callout from '$lib/components/callout';\n`,
            );
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
};

/**
 * Parse callout text into an object.
 */
export function parseCallout(markup: string): Callout | null {
  const match = markup.match(CALLOUT_PATTERN);
  if (!match) return null;

  // Remove blockquote tags
  markup = markup.replace(/<\/?blockquote>/g, '');

  const title = match[3].trim();
  const variant = match[1].toLowerCase();
  const foldable = match[2] === '+' || match[2] === '-';
  let description = markup
    .replace(CALLOUT_PATTERN, '')
    .replace(/<p>\s+/, '<p>')
    .trim();

  // Only include description if it has actual content
  if (description === '<p></p>') {
    description = '';
  }

  return {
    title,
    variant,
    description: description || undefined,
    foldable,
  };
}

/**
 * Compile a callout object into Svelte component markup.
 */
export const compileCallout = (callout: Callout): string => {
  const { title, variant, description, foldable } = callout;
  const attributes: string[] = [];

  if (title) attributes.push(`title="${title}"`);
  if (variant) attributes.push(`variant="${variant}"`);
  if (foldable) attributes.push('foldable');

  return description
    ? `<Callout ${attributes.join(' ')}>${description}</Callout>`
    : `<Callout ${attributes.join(' ')} />`;
};
