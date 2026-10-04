import { isRecord, readCount } from './session-records';
import type { JsonRecord } from './session-records';
import type { TokenUsage } from './token-usage';

const CODEX_LINE_TYPES = new Set([
  'session_meta',
  'turn_context',
  'event_msg',
  'response_item',
  'compacted',
]);

/** Codex wraps every line in `{ timestamp, type, payload }`. */
export const isCodexLine = (line: JsonRecord): boolean =>
  typeof line.type === 'string' && CODEX_LINE_TYPES.has(line.type) && isRecord(line.payload);

/** Reads the model from a `turn_context` line. Codex can switch models between turns. */
export const readCodexTurnModel = (line: JsonRecord): string | null => {
  if (line.type !== 'turn_context' || !isRecord(line.payload)) return null;

  const { model } = line.payload;

  return typeof model === 'string' && model ? model : null;
};

/** One model request reported by a Codex `token_count` event. */
export type CodexTokenEvent = {
  /**
   * Identifies the event across files, or `null` when the event lacks the
   * running total that makes it identifiable.
   */
  key: string | null;
  usage: TokenUsage;
  promptTokens: number;
};

const COUNT_FIELDS = [
  'input_tokens',
  'cached_input_tokens',
  'cache_write_input_tokens',
  'output_tokens',
  'reasoning_output_tokens',
] as const;

const describeCounts = (counts: JsonRecord): string =>
  COUNT_FIELDS.map((field) => readCount(counts[field])).join(',');

/**
 * Reads the request usage from a `token_count` event, or returns `null` for
 * every other line.
 *
 * Codex follows OpenAI's conventions: `input_tokens` includes the cached
 * tokens and `output_tokens` includes the reasoning tokens. It emits most
 * events twice, resets its running total to zero after compaction, and
 * replays a parent thread's events into a forked subagent's file. Keying each
 * event by its running total plus its own usage lets callers drop all three
 * kinds of repeat, within one file or across several.
 */
export const readCodexTokenEvent = (line: JsonRecord): CodexTokenEvent | null => {
  if (line.type !== 'event_msg' || !isRecord(line.payload)) return null;
  if (line.payload.type !== 'token_count') return null;

  const { info } = line.payload;
  if (!isRecord(info) || !isRecord(info.last_token_usage)) return null;

  const last = info.last_token_usage;
  const input = readCount(last.input_tokens);
  const cacheRead = Math.min(readCount(last.cached_input_tokens), input);
  // OpenAI models report no cache writes. Other providers behind Codex may,
  // and like cached tokens they're part of `input_tokens`.
  const cacheWrite = Math.min(readCount(last.cache_write_input_tokens), input - cacheRead);

  return {
    key: isRecord(info.total_token_usage)
      ? `${describeCounts(info.total_token_usage)}|${describeCounts(last)}`
      : null,
    usage: {
      uncachedInput: input - cacheRead - cacheWrite,
      cacheRead,
      cacheWrite5m: cacheWrite,
      cacheWrite1h: 0,
      output: readCount(last.output_tokens),
    },
    promptTokens: input,
  };
};
