import { Document, isMap, parseDocument } from 'yaml';

/**
 * A Markdown file with a YAML frontmatter block, such as a SKILL.md or a Claude
 * Code subagent definition, split so its fields can be edited one at a time
 * and written back with everything else left as it was.
 */
export type FrontmatterFile = {
  /** The parsed frontmatter. Comments, quoting, and key order survive a round trip. */
  document: Document;
  /** The frontmatter as plain values. */
  values: Record<string, unknown>;
  /** The Markdown after the frontmatter, without the blank lines that open it. */
  body: string;
};

export type FrontmatterReadResult =
  ({ ok: true } & FrontmatterFile) | { ok: false; message: string; body: string };

const FENCE = /^---[ \t]*$/;

/**
 * Splits a file into its frontmatter text and body. Returns null for the
 * frontmatter when the file doesn't open with a `---` fence or never closes it.
 */
export const splitFrontmatter = (text: string): { frontmatter: string | null; body: string } => {
  const lines = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n');

  if (!FENCE.test(lines[0] ?? '')) return { frontmatter: null, body: lines.join('\n') };

  const closing = lines.findIndex((line, index) => index > 0 && FENCE.test(line));
  if (closing === -1) return { frontmatter: null, body: lines.join('\n') };

  return {
    frontmatter: lines.slice(1, closing).join('\n'),
    body: lines
      .slice(closing + 1)
      .join('\n')
      .replace(/^\n+/, ''),
  };
};

/**
 * Reads a Markdown file's frontmatter. A file without one reads as empty
 * frontmatter. Some file formats eval a `---js` block, so this refuses any
 * fence with a language.
 */
export const readFrontmatterFile = (text: string): FrontmatterReadResult => {
  const normalized = text.replace(/^\uFEFF/, '');
  if (/^---[a-z]+/i.test(normalized)) {
    return {
      ok: false,
      message: 'The frontmatter fence names a language. Only YAML frontmatter is supported.',
      body: normalized,
    };
  }

  const { frontmatter, body } = splitFrontmatter(normalized);
  const document = parseDocument(frontmatter ?? '');

  if (document.errors.length > 0) {
    return {
      ok: false,
      message: `The frontmatter isn't valid YAML: ${document.errors[0]?.message ?? 'parse error'}`,
      body,
    };
  }

  const values: unknown = document.toJS() ?? {};
  if (typeof values !== 'object' || values === null || Array.isArray(values)) {
    return { ok: false, message: 'The frontmatter has to be a set of `key: value` lines.', body };
  }

  return { ok: true, document, values: values as Record<string, unknown>, body };
};

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0);

const sameValue = (first: unknown, second: unknown): boolean =>
  JSON.stringify(first) === JSON.stringify(second);

/**
 * Writes frontmatter and a body back into one file. Starting from the document
 * a file was read from keeps its comments and formatting for every field that
 * didn't change. Keys are written in the order of `values`; an empty value
 * (blank, an empty list, or an empty mapping) removes its key.
 */
export const writeFrontmatterFile = ({
  document,
  values,
  body,
}: {
  document?: Document | null;
  values: Record<string, unknown>;
  body: string;
}): string => {
  const output = document?.clone() ?? new Document({});
  if (!isMap(output.contents)) output.contents = output.createNode({});

  const original: Record<string, unknown> = (output.toJS() as Record<string, unknown> | null) ?? {};

  for (const key of Object.keys(original)) {
    if (!(key in values) || isEmpty(values[key])) output.delete(key);
  }

  for (const [key, value] of Object.entries(values)) {
    if (isEmpty(value)) continue;
    if (key in original && sameValue(original[key], value)) continue;
    output.set(key, value);
  }

  const yaml = isEmpty(output.toJS()) ? '' : output.toString({ lineWidth: 0 });
  const content = body.replace(/^\n+/, '');

  return `---\n${yaml}---\n${content ? `\n${content}` : ''}${content.endsWith('\n') || !content ? '' : '\n'}`;
};
