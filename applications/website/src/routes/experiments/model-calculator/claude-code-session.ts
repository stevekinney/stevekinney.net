import { isRecord, readCount } from './session-records';
import type { JsonRecord, SessionRequest } from './session-records';
import { totalInputTokens } from './token-usage';
import type { TokenUsage } from './token-usage';

/** Claude Code writes placeholder responses, such as API errors, under this model name. */
const SYNTHETIC_MODEL = '<synthetic>';

export const UNKNOWN_ADVISOR_MODEL = 'unknown advisor model';

/** The billed requests behind one Claude Code transcript line. */
export type ClaudeCodeResponse = {
  /** Identifies the API response, which Claude Code can spread across several lines. */
  key: string;
  requests: SessionRequest[];
};

/**
 * Splits cache writes by lifetime. Anthropic bills five-minute writes at
 * 1.25 times the input price and one-hour writes at twice it, and Claude Code
 * uses both. Any write the split doesn't account for used the default
 * five-minute lifetime.
 */
const readCacheWrites = (usage: JsonRecord): Pick<TokenUsage, 'cacheWrite5m' | 'cacheWrite1h'> => {
  const split = isRecord(usage.cache_creation) ? usage.cache_creation : {};
  const fiveMinute = readCount(split.ephemeral_5m_input_tokens);
  const oneHour = readCount(split.ephemeral_1h_input_tokens);
  const total = Math.max(readCount(usage.cache_creation_input_tokens), fiveMinute + oneHour);

  return { cacheWrite5m: total - oneHour, cacheWrite1h: oneHour };
};

const toRequest = (model: string, usage: JsonRecord): SessionRequest => {
  const tokenUsage: TokenUsage = {
    uncachedInput: readCount(usage.input_tokens),
    cacheRead: readCount(usage.cache_read_input_tokens),
    ...readCacheWrites(usage),
    output: readCount(usage.output_tokens),
  };

  return { model, usage: tokenUsage, promptTokens: totalInputTokens(tokenUsage) };
};

const readResponseKey = (line: JsonRecord, message: JsonRecord): string | null => {
  for (const candidate of [message.id, line.requestId, line.uuid]) {
    if (typeof candidate === 'string' && candidate) return candidate;
  }

  return null;
};

/**
 * Reads the billed requests from an `assistant` line, or returns `null` for
 * every other line.
 *
 * Claude Code streams a response into several lines that share one message ID.
 * Each line repeats the usage, and output grows until the final line, so
 * callers must keep only the last line for each key. When the advisor tool
 * runs, its call appears as an `advisor_message` iteration on a different
 * model. The top-level usage excludes it, so it becomes a separate request.
 * When the response made several `message` iterations, the top-level usage is
 * their sum, but each prompt is measured on its own.
 */
export const readClaudeCodeResponse = (line: JsonRecord): ClaudeCodeResponse | null => {
  if (line.type !== 'assistant' || !isRecord(line.message)) return null;

  const { model, usage } = line.message;
  if (typeof model !== 'string' || model === SYNTHETIC_MODEL || !isRecord(usage)) return null;

  const key = readResponseKey(line, line.message);
  if (!key) return null;

  const requests = [toRequest(model, usage)];
  const advisorModel =
    typeof line.advisorModel === 'string' && line.advisorModel
      ? line.advisorModel
      : UNKNOWN_ADVISOR_MODEL;

  if (Array.isArray(usage.iterations)) {
    const executorPrompts: number[] = [];

    for (const iteration of usage.iterations) {
      if (!isRecord(iteration)) continue;

      if (iteration.type === 'advisor_message') {
        requests.push(toRequest(advisorModel, iteration));
      } else if (iteration.type === 'message') {
        executorPrompts.push(toRequest(model, iteration).promptTokens);
      }
    }

    // The top-level usage sums the executor's iterations, so its prompt is several requests added
    // together. The largest single prompt is what a price tier's prompt limit applies to.
    if (executorPrompts.length > 0) requests[0].promptTokens = Math.max(...executorPrompts);
  }

  return { key, requests };
};

/**
 * Reads the running cost that Claude Code records for itself. It includes
 * background requests, such as session titles, that never appear in the
 * transcript, so it's a sanity check rather than an exact match.
 */
export const readClaudeCodeReportedCost = (
  line: JsonRecord,
): { sessionId: string; cost: number } | null => {
  if (line.type !== 'cost-state' || typeof line.totalCostUSD !== 'number') return null;
  if (!Number.isFinite(line.totalCostUSD)) return null;

  return {
    sessionId: typeof line.sessionId === 'string' ? line.sessionId : '',
    cost: line.totalCostUSD,
  };
};

/** Claude Code stamps nearly every line with its session ID. */
export const isClaudeCodeLine = (line: JsonRecord): boolean =>
  typeof line.sessionId === 'string' ||
  typeof line.session_id === 'string' ||
  (line.type === 'assistant' && isRecord(line.message));
