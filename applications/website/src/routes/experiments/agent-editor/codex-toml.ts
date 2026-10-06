import { stringify } from 'smol-toml';

/**
 * Top-level Codex keys written first, in this order. Everything else that
 * isn't a table follows them, in the order it was read.
 */
export const codexScalarOrder = [
  'name',
  'description',
  'nickname_candidates',
  'model',
  'model_reasoning_effort',
  'model_verbosity',
  'sandbox_mode',
] as const;

/** Codex's own per-agent tables, written in this order after the instructions. */
export const codexTableOrder = ['mcp_servers', 'hooks', 'skills', 'tools'] as const;

const INSTRUCTIONS_KEY = 'developer_instructions';

/** A control character a TOML literal string can't hold: any but tab and newline, carriage return included. */
const isControl = (character: string): boolean => {
  const code = character.charCodeAt(0);

  return (code < 0x20 && code !== 0x09 && code !== 0x0a) || code === 0x7f;
};

const escapeControl = (character: string): string =>
  character === '\r'
    ? '\\r'
    : `\\u${character.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * A multiline TOML string that reads like the Markdown it holds. A literal
 * string (`'''`) keeps backslashes and quotes as typed; text that contains
 * `'''` or a control character falls back to a basic string (`"""`) with
 * those escaped. The newline after the opening quotes isn't part of the value.
 */
export const multilineString = (text: string): string => {
  const characters = [...text];
  if (!text.includes("'''") && !characters.some(isControl)) {
    return `'''\n${text}'''`;
  }

  const escaped = characters
    .map((character) =>
      character === '\\'
        ? '\\\\'
        : character === '"'
          ? '\\"'
          : isControl(character)
            ? escapeControl(character)
            : character,
    )
    .join('');

  return `"""\n${escaped}"""`;
};

const isPresent = (value: unknown): boolean => value !== undefined && value !== null;

/** One `key = value` line, or a table block when the value is a table. */
const writeEntry = (key: string, value: unknown): string => stringify({ [key]: value }).trim();

const isTableBlock = (written: string): boolean => written.startsWith('[');

/**
 * Writes a Codex custom agent file. smol-toml's own `stringify` puts a
 * multiline string on one escaped line, which is unreadable for a system
 * prompt, so this writes the scalars in a fixed order, then
 * `developer_instructions` as a multiline string, then every table. Tables
 * come last because a `key = value` line after a table header belongs to that
 * table. Comments in a file that was read aren't kept.
 */
export const emitCodexAgent = (agent: Record<string, unknown>): string => {
  const entries = Object.entries(agent).filter(([, value]) => isPresent(value));
  const values = new Map(entries);

  const knownScalars: string[] = codexScalarOrder.filter((key) => values.has(key));
  const known = new Set<string>([...knownScalars, ...codexTableOrder, INSTRUCTIONS_KEY]);
  const ordered = [
    ...knownScalars,
    ...entries.map(([key]) => key).filter((key) => !known.has(key)),
    ...codexTableOrder.filter((key) => values.has(key)),
  ];

  const lines: string[] = [];
  const knownTables: Record<string, unknown> = {};
  const otherTables: Record<string, unknown> = {};

  for (const key of ordered) {
    const value = values.get(key);
    const written = writeEntry(key, value);
    if (!isTableBlock(written)) {
      lines.push(written);
    } else if ((codexTableOrder as readonly string[]).includes(key)) {
      knownTables[key] = value;
    } else {
      otherTables[key] = value;
    }
  }

  const instructions = values.get(INSTRUCTIONS_KEY);
  if (typeof instructions === 'string') {
    lines.push(`${INSTRUCTIONS_KEY} = ${multilineString(instructions)}`);
  } else if (instructions !== undefined) {
    lines.push(writeEntry(INSTRUCTIONS_KEY, instructions));
  }

  const tables = { ...knownTables, ...otherTables };
  const tableText = Object.keys(tables).length > 0 ? stringify(tables).trim() : '';

  return [lines.join('\n'), tableText].filter((part) => part.length > 0).join('\n\n') + '\n';
};
