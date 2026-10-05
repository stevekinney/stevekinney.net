import { parseTokenCount } from '$lib/experiments/format';

/** A context readout found in pasted text. */
export type ContextReadout = {
  /** Tokens in context, the first number of the pair. */
  used: number;
  /** The context window, the second number of the pair. */
  limit: number;
  /** The text that matched, for showing back to the person. */
  matched: string;
};

const AMOUNT = String.raw`\d[\d,]*(?:\.\d+)?[kKmM]?`;

// The interactive form: `312k/1000k tokens`.
const interactive = new RegExp(String.raw`(${AMOUNT})\s*/\s*(${AMOUNT})\s*tokens\b`, 'i');

// The print form from `claude -p "/context"`: `**Tokens:** 35.5k / 1m (4%)`.
const printed = new RegExp(String.raw`tokens\s*:?\s*\**\s*:?\s*(${AMOUNT})\s*/\s*(${AMOUNT})`, 'i');

/**
 * Finds the first `used/limit` pair in pasted text, in either of the two forms
 * Claude Code prints: `312k/1000k tokens` and `**Tokens:** 35.5k / 1m (4%)`.
 */
export const parseContextReadout = (text: string): ContextReadout | null => {
  const candidates = [interactive.exec(text), printed.exec(text)]
    .filter((match): match is RegExpExecArray => match !== null)
    .sort((first, second) => first.index - second.index);

  for (const match of candidates) {
    const used = parseTokenCount(match[1]);
    const limit = parseTokenCount(match[2]);
    if (used !== null && limit !== null && limit > 0 && used <= limit) {
      return { used, limit, matched: match[0].trim() };
    }
  }

  return null;
};
