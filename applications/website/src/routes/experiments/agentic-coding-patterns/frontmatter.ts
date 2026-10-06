/** A frontmatter value: a plain string, or a list of them. */
export type FrontmatterValue = string | string[];

export type ParsedNote = {
  /** Whether the note opens with a frontmatter block. */
  hasFrontmatter: boolean;
  /** Keys are lowercase. Values are trimmed. */
  data: Record<string, FrontmatterValue>;
  /** Everything after the frontmatter block. */
  body: string;
};

const unquote = (value: string): string => {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.length >= 2 && trimmed.at(-1) === quote) {
    const inner = trimmed.slice(1, -1);

    return quote === '"' ? inner.replace(/\\(["\\])/g, '$1') : inner.replace(/''/g, "'");
  }

  return trimmed;
};

/** Where a quoted scalar's closing quote is, or -1. A `#` inside the quotes is part of the value. */
const closingQuote = (text: string): number => {
  const quote = text[0];

  for (let index = 1; index < text.length; index += 1) {
    if (quote === '"' && text[index] === '\\') {
      index += 1;
    } else if (text[index] === quote) {
      // A doubled single quote is an escaped quote, not the end.
      if (quote === "'" && text[index + 1] === "'") index += 1;
      else return index;
    }
  }

  return -1;
};

/** Drops a trailing ` # comment`, including one after a quoted scalar's closing quote. */
const stripComment = (value: string): string => {
  const trimmed = value.trim();

  if (trimmed[0] === '"' || trimmed[0] === "'") {
    const end = closingQuote(trimmed);
    if (end === -1) return trimmed;

    return /^\s+#/.test(trimmed.slice(end + 1)) ? trimmed.slice(0, end + 1) : trimmed;
  }

  return trimmed.replace(/\s+#.*$/, '').trim();
};

/** Splits the inside of `[a, "b, c", 'd']` on commas that aren't inside quotes. */
export const splitFlowList = (inner: string): string[] => {
  const items: string[] = [];
  let current = '';
  let quote: string | null = null;

  for (const character of inner) {
    if (quote) {
      current += character;
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
      current += character;
    } else if (character === ',') {
      items.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  items.push(current);

  return items.map(unquote).filter((item) => item !== '');
};

const parseScalar = (raw: string): FrontmatterValue => {
  const value = stripComment(raw);

  if (value.startsWith('[') && value.endsWith(']')) return splitFlowList(value.slice(1, -1));

  return unquote(value);
};

/**
 * Reads the frontmatter block at the top of a note. It understands the little
 * YAML that notes use: `key: value`, inline lists, block lists, and quoted
 * strings. Any other key or shape is skipped instead of failing the note, and
 * the parser needs no dependencies, so it runs in the browser as well.
 */
export const parseFrontmatter = (source: string): ParsedNote => {
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');

  if (lines[0]?.trim() !== '---') return { hasFrontmatter: false, data: {}, body: text };

  const end = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)\s*$/.test(line));
  if (end === -1) return { hasFrontmatter: false, data: {}, body: text };

  const data: Record<string, FrontmatterValue> = {};
  const block = lines.slice(1, end);

  for (let index = 0; index < block.length; index += 1) {
    const match = /^([A-Za-z0-9_-][\w -]*?)\s*:(?:\s+(.*)|\s*)$/.exec(block[index] ?? '');
    if (!match) continue;

    const key = (match[1] ?? '').toLowerCase();
    const rest = (match[2] ?? '').trim();

    if (rest === '' || rest === '|' || rest === '>') {
      // A block list: the following lines start with a dash.
      const items: string[] = [];
      while (/^\s*-\s+/.test(block[index + 1] ?? '') || /^\s*-\s*$/.test(block[index + 1] ?? '')) {
        index += 1;
        items.push(unquote(stripComment((block[index] ?? '').replace(/^\s*-\s*/, ''))));
      }
      if (items.length > 0) data[key] = items.filter((item) => item !== '');
      else if (rest === '') data[key] = '';
    } else if (rest.startsWith('[') && !rest.includes(']')) {
      // An inline list that continues over several lines.
      let joined = rest;
      while (index + 1 < block.length && !joined.includes(']')) {
        index += 1;
        joined += ` ${(block[index] ?? '').trim()}`;
      }
      data[key] = parseScalar(joined);
    } else {
      data[key] = parseScalar(rest);
    }
  }

  return { hasFrontmatter: true, data, body: lines.slice(end + 1).join('\n') };
};

/** Reads a frontmatter value as one string; a list yields its first item. */
export const frontmatterString = (value: FrontmatterValue | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? '';

  return value ?? '';
};

/** Reads a frontmatter value as a list: a single string becomes a list of one. */
export const frontmatterList = (value: FrontmatterValue | undefined): string[] => {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;

  return value === '' ? [] : [value];
};
