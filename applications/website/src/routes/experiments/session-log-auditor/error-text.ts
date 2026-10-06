/**
 * Turns a failed tool result's content into the one line a person would read
 * as the error, and finds that line verbatim in the transcript line it came
 * from.
 */

export type ErrorText = {
  /** The `N` from a leading `Exit code N` line, or `null` without one. */
  exitCode: number | null;
  /** The first meaningful line, trimmed and capped at `MAXIMUM_MESSAGE_LENGTH`. */
  message: string;
};

/** Long enough for any real error line, short enough for a table cell. A cut message is still a substring. */
export const MAXIMUM_MESSAGE_LENGTH = 300;

const EXIT_CODE_LINE = /^Exit code (-?\d+)$/;
const TRACEBACK_LINE = /^Traceback \(most recent call last\):?$/;

/** A line with a letter in it. `{`, `---`, and `[]` say nothing about what went wrong. */
const isMeaningful = (line: string): boolean => /\p{L}/u.test(line);

const cap = (line: string): string => line.slice(0, MAXIMUM_MESSAGE_LENGTH).trimEnd();

/**
 * Builds the error text. A content that starts with a bare `Exit code N` line
 * records `N` and reads the message from the first meaningful line after it.
 * A Python traceback reads its last meaningful line, where the exception is.
 */
export const buildErrorText = (content: string): ErrorText => {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const exitMatch = EXIT_CODE_LINE.exec(lines[0] ?? '');
  const exitCode = exitMatch ? Number(exitMatch[1]) : null;
  const rest = exitMatch ? lines.slice(1) : lines;
  const meaningful = rest.filter(isMeaningful);

  let message = meaningful[0] ?? '';
  if (TRACEBACK_LINE.test(message)) message = meaningful.at(-1) ?? message;

  if (!message) message = exitMatch ? lines[0] : (lines.find((line) => line) ?? '');

  return { exitCode, message: cap(message) };
};

/**
 * Finds `text` exactly as it appears in `source`, the raw transcript line.
 * Text with a quote, backslash, or tab is stored escaped inside the JSON line,
 * so the escaped form is what's verbatim there. Returns `null` when neither
 * form appears, and then nothing is quoted.
 */
export const findVerbatim = (text: string, source: string): string | null => {
  if (!text) return null;
  if (source.includes(text)) return text;

  const escaped = JSON.stringify(text).slice(1, -1);

  return source.includes(escaped) ? escaped : null;
};
