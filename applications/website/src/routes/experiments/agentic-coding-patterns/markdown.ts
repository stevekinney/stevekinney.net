import { parseWikilink } from './wikilinks';

/**
 * A small Markdown reader for the notes' sections. It returns a tree of plain
 * data, never HTML, and the page renders that tree with Svelte, which escapes
 * every string. A note, whether it ships with the page or comes from a folder
 * someone dropped, therefore can't add markup: `<script>` is text, and a link
 * only becomes a link when its address is an absolute http, https, or mailto
 * address. It supports paragraphs, lists, block quotes, fenced code, emphasis,
 * inline code, links, and `[[wikilinks]]`, and it drops embeds and images.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'emphasis' | 'strong' | 'delete'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: Inline[] }
  | { type: 'wikilink'; target: string; label: string }
  | { type: 'break' };

export type Block =
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'heading'; level: number; children: Inline[] }
  | { type: 'list'; ordered: boolean; start: number; items: Block[][] }
  | { type: 'blockquote'; children: Block[] }
  | { type: 'code'; text: string; language: string };

const safeProtocols = new Set(['http:', 'https:', 'mailto:']);

/**
 * Returns an address that is safe to put in an `href`, or `null`. Browsers
 * ignore tabs and newlines inside a scheme, so `java\tscript:` runs, and the
 * check removes them before it looks. Anything that isn't an absolute http,
 * https, or mailto address, including relative paths and `javascript:`, is `null`.
 */
export const safeHref = (address: string): string | null => {
  // Control characters and spaces in a scheme are ignored by browsers.
  // eslint-disable-next-line no-control-regex
  const compact = address.replace(/[\u0000- \u007f-\u009f]/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(compact)?.[1]?.toLowerCase();

  if (!scheme || !safeProtocols.has(scheme)) return null;

  try {
    return new URL(compact).href;
  } catch {
    return null;
  }
};

const punctuation = /[!-/:-@[-`{-~]/;

/** Skips a backtick code span starting at `index`, returning the index after it. */
const skipCodeSpan = (source: string, index: number): number => {
  const ticks = /^`+/.exec(source.slice(index))?.[0] ?? '`';
  const close = source.indexOf(ticks, index + ticks.length);

  return close === -1 ? index + ticks.length : close + ticks.length;
};

/**
 * Finds where a closing delimiter starts, skipping escapes and code spans. A
 * closer can't follow whitespace, and an underscore can't close inside a word.
 * When the run is longer than the delimiter, as in `**bold *em***`, the
 * closer is the last of the run, and a one-character delimiter skips a longer
 * run, because `**` inside `*em*` belongs to something else.
 */
const findClosingDelimiter = (source: string, from: number, delimiter: string): number => {
  const character = delimiter[0] ?? '*';

  for (let index = from; index < source.length;) {
    const current = source[index];

    if (current === '\\') {
      index += 2;
    } else if (current === '`') {
      index = skipCodeSpan(source, index);
    } else if (current === character) {
      let runLength = 0;
      while (source[index + runLength] === character) runLength += 1;

      const closes =
        index > from &&
        !/\s/.test(source[index - 1] ?? '') &&
        (character !== '_' || !/[\p{L}\p{N}]/u.test(source[index + runLength] ?? ''));

      if (closes && runLength === delimiter.length) return index;
      if (closes && runLength > delimiter.length && delimiter.length > 1) {
        return index + runLength - delimiter.length;
      }

      index += runLength;
    } else {
      index += 1;
    }
  }

  return -1;
};

/** Finds the `]` that closes the `[` at `index`, allowing nested brackets. */
const findClosingBracket = (source: string, index: number): number => {
  let depth = 0;

  for (let cursor = index; cursor < source.length; cursor += 1) {
    const current = source[cursor];

    if (current === '\\') cursor += 1;
    else if (current === '`') cursor = skipCodeSpan(source, cursor) - 1;
    else if (current === '[') depth += 1;
    else if (current === ']') {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }

  return -1;
};

/** Finds the `)` that closes the `(` at `index`, allowing balanced parentheses in an address. */
const findClosingParenthesis = (source: string, index: number): number => {
  let depth = 0;

  for (let cursor = index; cursor < source.length; cursor += 1) {
    const current = source[cursor];

    if (current === '\\') cursor += 1;
    else if (current === '(') depth += 1;
    else if (current === ')') {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }

  return -1;
};

const parseAddress = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.startsWith('<'))
    return trimmed.slice(1, trimmed.indexOf('>') === -1 ? undefined : trimmed.indexOf('>'));

  // The address ends at the first space, where an optional "title" begins.
  return trimmed.split(/\s/)[0] ?? '';
};

const trimBareAddress = (address: string): string => {
  let result = address;

  for (;;) {
    const last = result.at(-1) ?? '';

    if (/[.,;:!?'"*_~]/.test(last)) {
      result = result.slice(0, -1);
    } else if (
      last === ')' &&
      (result.match(/\(/g)?.length ?? 0) < (result.match(/\)/g)?.length ?? 0)
    ) {
      result = result.slice(0, -1);
    } else {
      return result;
    }
  }
};

export const parseInline = (source: string): Inline[] => {
  const nodes: Inline[] = [];
  let text = '';
  let index = 0;

  const flush = (): void => {
    if (text !== '') nodes.push({ type: 'text', text });
    text = '';
  };

  while (index < source.length) {
    const character = source[index] ?? '';
    const rest = source.slice(index);

    if (character === '\\') {
      const next = source[index + 1] ?? '';

      if (next === '\n') {
        flush();
        nodes.push({ type: 'break' });
        index += 2;
      } else if (punctuation.test(next)) {
        text += next;
        index += 2;
      } else {
        text += character;
        index += 1;
      }
      continue;
    }

    if (character === '`') {
      const ticks = /^`+/.exec(rest)?.[0] ?? '`';
      const close = source.indexOf(ticks, index + ticks.length);

      if (close !== -1) {
        flush();
        const code = source.slice(index + ticks.length, close).replace(/\n/g, ' ');
        nodes.push({
          type: 'code',
          text: /^ .* $/.test(code) && code.trim() !== '' ? code.slice(1, -1) : code,
        });
        index = close + ticks.length;
      } else {
        text += ticks;
        index += ticks.length;
      }
      continue;
    }

    if (character === '!' && rest.startsWith('![[')) {
      // An embed such as ![[diagram.svg|720]]: dropped.
      const close = source.indexOf(']]', index + 3);

      if (close !== -1) {
        index = close + 2;
        continue;
      }
    }

    if (character === '!' && rest.startsWith('![')) {
      const close = findClosingBracket(source, index + 1);

      if (close !== -1 && source[close + 1] === '(') {
        const end = findClosingParenthesis(source, close + 1);

        if (end !== -1) {
          // An image: dropped.
          index = end + 1;
          continue;
        }
      }
    }

    if (rest.startsWith('[[')) {
      const close = source.indexOf(']]', index + 2);
      const inner = close === -1 ? '' : source.slice(index + 2, close);
      const link = inner.includes('\n') ? null : parseWikilink(inner);

      if (link) {
        flush();
        nodes.push({ type: 'wikilink', target: link.target, label: link.label });
        index = close + 2;
        continue;
      }
    }

    if (character === '[') {
      const close = findClosingBracket(source, index);

      if (close !== -1 && source[close + 1] === '(') {
        const end = findClosingParenthesis(source, close + 1);

        if (end !== -1) {
          flush();
          const children = parseInline(source.slice(index + 1, close));
          const href = safeHref(parseAddress(source.slice(close + 2, end)));

          // An address that isn't safe leaves just the label, as plain text.
          if (href) nodes.push({ type: 'link', href, children });
          else nodes.push(...children);
          index = end + 1;
          continue;
        }
      }
    }

    if (character === '<') {
      const autolink = /^<((?:https?:\/\/|mailto:)[^\s<>]+)>/i.exec(rest);
      const href = autolink ? safeHref(autolink[1] ?? '') : null;

      if (autolink && href) {
        flush();
        nodes.push({ type: 'link', href, children: [{ type: 'text', text: autolink[1] ?? '' }] });
        index += autolink[0].length;
        continue;
      }
    }

    if (
      character === 'h' &&
      /^https?:\/\//i.test(rest) &&
      !/[\p{L}\p{N}]/u.test(source[index - 1] ?? '')
    ) {
      const address = trimBareAddress(/^\S+/.exec(rest)?.[0] ?? '');
      const href = safeHref(address);

      if (href) {
        flush();
        nodes.push({ type: 'link', href, children: [{ type: 'text', text: address }] });
        index += address.length;
        continue;
      }
    }

    if (character === '*' || character === '_' || character === '~') {
      const run = /^[*_~]+/.exec(rest)?.[0] ?? character;
      const length = character === '~' ? (run.length >= 2 ? 2 : 0) : Math.min(run.length, 3);
      const previous = source[index - 1] ?? '';
      const next = source[index + run.length] ?? '';
      const opens =
        length > 0 &&
        next !== '' &&
        !/\s/.test(next) &&
        (character !== '_' || !/[\p{L}\p{N}]/u.test(previous));

      if (opens) {
        const delimiter = character.repeat(length);
        const close = findClosingDelimiter(source, index + run.length, delimiter);

        if (close !== -1) {
          flush();
          // Anything left over from a longer opening run stays as text inside.
          const inner = source.slice(index + length, close);
          const children = parseInline(inner);

          if (length === 3) {
            nodes.push({ type: 'strong', children: [{ type: 'emphasis', children }] });
          } else {
            nodes.push({
              type: length === 2 ? (character === '~' ? 'delete' : 'strong') : 'emphasis',
              children,
            });
          }
          index = close + length;
          continue;
        }
      }

      text += run;
      index += run.length;
      continue;
    }

    if (character === '\n') {
      // Two spaces before the newline make a hard break. Otherwise it's a space.
      if (/ {2,}$/.test(text)) {
        text = text.replace(/ +$/, '');
        flush();
        nodes.push({ type: 'break' });
      } else {
        text += ' ';
      }
      index += 1;
      continue;
    }

    text += character;
    index += 1;
  }

  flush();

  return nodes;
};

const fencePattern = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/;
const headingPattern = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/;
const listPattern = /^( {0,12})([-*+]|\d{1,9}[.)])[ \t]+(.*)$/;
const quotePattern = /^ {0,3}> ?(.*)$/;
const rulePattern = /^ {0,3}([-*_])([ \t]*\1){2,}[ \t]*$/;

const indentOf = (line: string): number => /^ */.exec(line)?.[0].length ?? 0;

const startsBlock = (line: string): boolean =>
  fencePattern.test(line) ||
  headingPattern.test(line) ||
  quotePattern.test(line) ||
  listPattern.test(line) ||
  rulePattern.test(line);

const isEmptyParagraph = (children: Inline[]): boolean =>
  children.every((child) => child.type === 'text' && child.text.trim() === '');

export const parseBlocks = (source: string): Block[] => {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (line.trim() === '') {
      index += 1;
      continue;
    }

    const fence = fencePattern.exec(line);
    if (fence) {
      const marker = fence[1] ?? '```';
      const content: string[] = [];
      index += 1;

      while (
        index < lines.length &&
        !new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`).test(lines[index] ?? '')
      ) {
        content.push(lines[index] ?? '');
        index += 1;
      }
      index += 1;
      blocks.push({ type: 'code', text: content.join('\n'), language: fence[2] ?? '' });
      continue;
    }

    const heading = headingPattern.exec(line);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1]?.length ?? 1,
        children: parseInline(heading[2] ?? ''),
      });
      index += 1;
      continue;
    }

    if (rulePattern.test(line)) {
      index += 1;
      continue;
    }

    if (quotePattern.test(line)) {
      const content: string[] = [];

      while (index < lines.length && quotePattern.test(lines[index] ?? '')) {
        content.push(quotePattern.exec(lines[index] ?? '')?.[1] ?? '');
        index += 1;
      }
      blocks.push({ type: 'blockquote', children: parseBlocks(content.join('\n')) });
      continue;
    }

    const marker = listPattern.exec(line);
    if (marker) {
      const baseIndent = marker[1]?.length ?? 0;
      const ordered = /\d/.test(marker[2] ?? '');
      const start = ordered ? Number.parseInt(marker[2] ?? '1', 10) : 1;
      const items: Block[][] = [];

      while (index < lines.length) {
        const current = listPattern.exec(lines[index] ?? '');
        if (
          !current ||
          (current[1]?.length ?? 0) !== baseIndent ||
          /\d/.test(current[2] ?? '') !== ordered
        )
          break;

        const contentIndent = baseIndent + (current[2]?.length ?? 1) + 1;
        const content: string[] = [current[3] ?? ''];
        index += 1;

        while (index < lines.length) {
          const next = lines[index] ?? '';

          if (next.trim() === '') {
            // A blank line belongs to the item only if an indented line follows.
            const following = lines.slice(index).find((candidate) => candidate.trim() !== '');
            if (following === undefined || indentOf(following) < contentIndent) break;
            content.push('');
          } else if (indentOf(next) >= contentIndent) {
            content.push(next.slice(contentIndent));
          } else if (indentOf(next) > baseIndent && listPattern.test(next)) {
            content.push(next.slice(Math.min(indentOf(next), contentIndent)));
          } else if (!startsBlock(next) && content.at(-1)?.trim() !== '') {
            // A lazy continuation of the item's paragraph.
            content.push(next.trim());
          } else {
            break;
          }
          index += 1;
        }

        items.push(parseBlocks(content.join('\n')));
      }

      blocks.push({ type: 'list', ordered, start, items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      (lines[index] ?? '').trim() !== '' &&
      (paragraph.length === 0 || !startsBlock(lines[index] ?? ''))
    ) {
      paragraph.push((lines[index] ?? '').replace(/^\s+/, ''));
      index += 1;
    }

    const children = parseInline(paragraph.join('\n'));
    if (!isEmptyParagraph(children)) blocks.push({ type: 'paragraph', children });
  }

  return blocks;
};

/** The text of inline nodes without any formatting. A wikilink contributes its label. */
export const inlineText = (nodes: Inline[]): string =>
  nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
        case 'code':
          return node.text;
        case 'wikilink':
          return node.label;
        case 'break':
          return ' ';
        default:
          return inlineText(node.children);
      }
    })
    .join('');

const blockText = (block: Block): string => {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return inlineText(block.children);
    case 'code':
      return block.text;
    case 'blockquote':
      return block.children.map(blockText).join(' ');
    case 'list':
      return block.items.map((item) => item.map(blockText).join(' ')).join(' ');
  }
};

/**
 * Markdown as one line of plain text with the formatting removed. Search
 * looks in this, and a snippet shows a piece of it.
 */
export const toPlainText = (markdown: string): string =>
  parseBlocks(markdown).map(blockText).join(' ').replace(/\s+/g, ' ').trim();
