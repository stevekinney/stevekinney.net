/**
 * Prices for the Claude models a Claude Code transcript can name, and what a
 * response cost. Prices are US dollars per million tokens. Money is summed as
 * `tokens × price` first and divided by a million once at the end, never built
 * from per-token rates, which would leave float noise in a total.
 */
import type { ResponseUsage } from '$lib/experiments/claude-code-transcript';

import { normalizeModelIdentifier } from '../model-calculator/model-pricing';
import type { ModelPricing } from '../model-calculator/model-pricing';

export type PriceRow = {
  /** The model ID as Claude Code records it, such as `claude-opus-5-5`. */
  id: string;
  name: string;
  /** The family word in the model ID, such as `opus`. */
  family: string;
  /** The version in the model ID, such as `5.5`. */
  version: string;
  input: number;
  cachedInput: number;
  output: number;
  /** A token written to a five-minute cache entry. */
  cacheWrite5m: number;
  /** A token written to a one-hour cache entry. */
  cacheWrite1h: number;
};

export const TOKENS_PER_PRICE_UNIT = 1_000_000;

const CLAUDE_IDENTIFIER = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?$/;

/**
 * Turns the shared price table's Claude rows into price rows. A missing cache
 * write price means the row bills writes at the input price, as the table's
 * own comments say. Throws when the table has no Claude rows, because the only
 * caller is a prerendered page and a thrown error there fails the build.
 */
export const toPriceRows = (models: readonly ModelPricing[]): PriceRow[] => {
  const rows = models.flatMap((model) =>
    model.identifiers.flatMap((identifier) => {
      const match = CLAUDE_IDENTIFIER.exec(identifier);
      if (!match) return [];

      const [, family, major, minor] = match;

      return [
        {
          id: identifier,
          name: model.name,
          family,
          version: minor ? `${major}.${minor}` : major,
          input: model.input,
          cachedInput: model.cachedInput,
          output: model.output,
          cacheWrite5m: model.cacheWrite5m ?? model.input,
          cacheWrite1h: model.cacheWrite1h ?? model.input,
        },
      ];
    }),
  );

  if (rows.length === 0) throw new Error('model-pricing.toml has no Claude model identifiers.');

  return rows;
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The version a model ID gives a family, such as `5.5` for `opus` in `claude-opus-5-5`. */
const versionOf = (model: string, family: string): string | null => {
  const word = escapeRegExp(family);
  // Current IDs put the family first, as in `claude-opus-5-5`. Older ones put it last, as in `claude-3-5-sonnet`.
  const match =
    new RegExp(`(?:^|-)${word}-(\\d+)(?:-(\\d{1,2}))?(?=-|$)`).exec(model) ??
    new RegExp(`(?:^|-)(\\d+)(?:-(\\d{1,2}))?-${word}(?=-|$)`).exec(model);
  if (!match) return null;

  return match[2] ? `${match[1]}.${match[2]}` : match[1];
};

/**
 * Finds the price row for a model ID by family and version. A family with a
 * different version, such as `claude-opus-5` against an Opus 5.5 row, finds
 * nothing: the page shows it as unpriced instead of guessing.
 */
export const matchPrice = (model: string, rows: readonly PriceRow[]): PriceRow | null => {
  const normalized = normalizeModelIdentifier(model);

  return (
    rows.find(
      (row) => normalized.includes(row.family) && versionOf(normalized, row.family) === row.version,
    ) ?? null
  );
};

/** Tokens in each billing bucket, with cache writes split by lifetime. */
export type BilledTokens = {
  input: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  output: number;
  /** Whether some cache writes had no recorded lifetime and were assumed to be five-minute writes. */
  assumedFiveMinute: boolean;
};

/**
 * Splits a response's usage into billing buckets. When the transcript records
 * the cache-write split, each part keeps its own lifetime; anything it doesn't
 * account for is billed as a five-minute write, and flagged.
 */
export const billedTokens = (usage: ResponseUsage): BilledTokens => {
  const split = usage.cacheWriteSplit;
  const fiveMinute = split?.fiveMinute ?? 0;
  const oneHour = split?.oneHour ?? 0;
  const unaccounted = Math.max(0, usage.cacheWriteTokens - fiveMinute - oneHour);

  return {
    input: usage.inputTokens,
    cacheRead: usage.cacheReadTokens,
    cacheWrite5m: fiveMinute + unaccounted,
    cacheWrite1h: oneHour,
    output: usage.outputTokens,
    assumedFiveMinute: unaccounted > 0,
  };
};

/**
 * A response's cost in price units: tokens times dollars per million tokens.
 * Divide a sum of these by `TOKENS_PER_PRICE_UNIT` once to get dollars.
 *
 * `input × in + read × cachedIn + write5m × write5mPrice + write1h × write1hPrice + output × out`
 */
export const costUnits = (tokens: BilledTokens, row: PriceRow): number =>
  tokens.input * row.input +
  tokens.cacheRead * row.cachedInput +
  tokens.cacheWrite5m * row.cacheWrite5m +
  tokens.cacheWrite1h * row.cacheWrite1h +
  tokens.output * row.output;

export const toDollars = (units: number): number => units / TOKENS_PER_PRICE_UNIT;

/** A response's cost in dollars. */
export const turnCost = (usage: ResponseUsage, row: PriceRow): number =>
  toDollars(costUnits(billedTokens(usage), row));

/** Cache reads over every prompt token: `read / (input + read + write)`, or `null` with no prompt. */
export const cacheHitRatio = (
  inputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number,
): number | null => {
  const prompt = inputTokens + cacheReadTokens + cacheWriteTokens;

  return prompt > 0 ? cacheReadTokens / prompt : null;
};

/** A multiplier of the input price, such as `1.25×`, for showing where a write price comes from. */
export const multiplierOf = (price: number, input: number): string =>
  input > 0 ? `${Number((price / input).toFixed(3))}×` : '—';

/** A usable price per million tokens: finite, zero or more, and at most $100,000. */
export const readPrice = (text: string): number | null => {
  const value = Number(text.trim().replace(/^\$/, ''));

  return text.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 100_000
    ? value
    : null;
};
