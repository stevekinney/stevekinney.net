import { stripByteOrderMark } from './lenient-json';
import { parseModelSetting } from './models';
import type { ModelSetting } from './models';

export type AgentDefinitionFile = {
  /** The `name` in frontmatter, or the file's name without `.md` when there isn't one. */
  name: string;
  nameFromFilename: boolean;
  /** The text after `model:`, with quotes removed, or `null` when the file has no `model:` line. */
  rawModel: string | null;
  declared: ModelSetting;
  /** The `model:` value isn't `inherit`, a family, or a full model ID. */
  unknownModel: boolean;
  description: string;
  /** Problems with this file. Malformed frontmatter warns instead of failing. */
  warnings: string[];
  /** Whether the frontmatter is well formed, so a patched copy can edit it in place. */
  patchable: boolean;
};

export type FrontmatterBlock = {
  /** The lines between the `---` fences, without line endings. */
  lines: string[];
  /** Where the opening fence is, as a line index. */
  start: number;
  /** Where the closing fence is, as a line index. */
  end: number;
};

const fence = /^---\s*$/;

/** The leading `---` block, or `null` when the file doesn't open with one or never closes it. */
export const findFrontmatter = (lines: string[]): FrontmatterBlock | null => {
  const start = lines.findIndex((line) => line.trim() !== '');
  if (start === -1 || !fence.test(stripByteOrderMark(lines[start]))) return null;

  const end = lines.findIndex((line, index) => index > start && fence.test(line));

  return end === -1 ? null : { lines: lines.slice(start + 1, end), start, end };
};

export const splitLines = (text: string): string[] => text.split(/\r?\n/);

const unquote = (value: string): string => {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.length >= 2 && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
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

const stripComment = (value: string): string => {
  const trimmed = value.trim();

  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const end = closingQuote(trimmed);
    if (end === -1) return trimmed;

    // A comment may follow the closing quote: `model: "inherit" # follow the main model`.
    return /^\s+#/.test(trimmed.slice(end + 1)) ? trimmed.slice(0, end + 1) : trimmed;
  }

  return trimmed.replace(/\s+#.*$/, '');
};

const keyPattern = /^([A-Za-z_][\w-]*)\s*:(?:\s+(.*)|\s*)$/;

/**
 * Reads the top-level scalar keys of a frontmatter block. This isn't a YAML
 * parser: it reads `key: value` lines, folds the indented lines under a block
 * scalar such as `description: >`, and skips lists and nested maps.
 */
export const readScalarKeys = (
  lines: string[],
): { values: Map<string, string[]>; malformed: number[] } => {
  const values = new Map<string, string[]>();
  const malformed: number[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    // Indented lines and list items belong to the key above.
    if (/^\s/.test(line) || /^-\s/.test(line) || line.trim() === '-') continue;

    const match = keyPattern.exec(line);
    if (!match) {
      malformed.push(index + 1);
      continue;
    }

    const [, key, rest = ''] = match;
    let value = rest;

    if (/^[>|][+-]?\s*$/.test(rest.trim())) {
      const folded: string[] = [];
      while (
        index + 1 < lines.length &&
        (/^\s/.test(lines[index + 1]) || lines[index + 1] === '')
      ) {
        index += 1;
        folded.push(lines[index].trim());
      }
      value = folded.join(' ').trim();
    }

    const existing = values.get(key) ?? [];
    existing.push(value);
    values.set(key, existing);
  }

  return { values, malformed };
};

const stem = (path: string): string => {
  const base = path.split(/[\\/]/).at(-1) ?? path;

  return base.replace(/\.md$/i, '');
};

/** Reads the name, model, and description from an agent definition file. */
export const parseAgentFile = (path: string, text: string): AgentDefinitionFile => {
  const warnings: string[] = [];
  const fallbackName = stem(path);
  const result: AgentDefinitionFile = {
    name: fallbackName,
    nameFromFilename: true,
    rawModel: null,
    declared: 'unset',
    unknownModel: false,
    description: '',
    warnings,
    patchable: false,
  };

  const lines = splitLines(text);
  const frontmatter = findFrontmatter(lines);

  if (!frontmatter) {
    warnings.push(
      lines.some((line) => fence.test(stripByteOrderMark(line)))
        ? 'The frontmatter never closes with a second ---, so nothing in it was read.'
        : 'There’s no frontmatter, so the name comes from the file name and no model is declared.',
    );

    return result;
  }

  const { values, malformed } = readScalarKeys(frontmatter.lines);

  if (malformed.length > 0) {
    warnings.push(
      `Frontmatter line ${malformed
        .slice(0, 3)
        .map((line) => line + frontmatter.start + 1)
        .join(', ')}${malformed.length > 3 ? ' and more' : ''} isn’t a key: value pair.`,
    );
  }

  const nameValue = values.get('name')?.[0];
  if (nameValue !== undefined && unquote(stripComment(nameValue)) !== '') {
    result.name = unquote(stripComment(nameValue));
    result.nameFromFilename = false;
  }

  const descriptionValue = values.get('description')?.[0];
  if (descriptionValue !== undefined) result.description = unquote(descriptionValue);

  const modelValues = values.get('model');
  if (modelValues && modelValues.length > 0) {
    if (modelValues.length > 1) warnings.push('The frontmatter has more than one `model:` line.');

    const raw = unquote(stripComment(modelValues[0]));
    result.rawModel = raw;

    const parsed = parseModelSetting(raw);
    result.declared = parsed.setting;
    result.unknownModel = parsed.unknown;
    if (parsed.unknown) {
      warnings.push(
        `\`model: ${raw}\` isn’t a model family, so it counts as an unrecognized model.`,
      );
    }
  }

  result.patchable = true;

  return result;
};

/**
 * Returns a copy of an agent file with its `model:` line set to `model`. Only
 * that line changes: an existing one is rewritten in place and a missing one
 * is added just before the closing fence. Returns `null` when the file has no
 * well-formed frontmatter to edit.
 */
export const setModelLine = (text: string, model: string): string | null => {
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const frontmatter = findFrontmatter(lines);
  if (!frontmatter) return null;

  const modelIndex = lines.findIndex(
    (line, index) =>
      index > frontmatter.start && index < frontmatter.end && /^model\s*:/.test(line),
  );

  if (modelIndex === -1) {
    lines.splice(frontmatter.end, 0, `model: ${model}`);
  } else {
    lines[modelIndex] = `model: ${model}`;
  }

  return lines.join(newline);
};
