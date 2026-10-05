/**
 * The price table and everything derived from it. Prices are US dollars per
 * million tokens. Money is always `tokens × price` summed first and divided by
 * a million once at the end, never built from per-token rates, which would
 * leave float noise such as `1.0499999999999998` in a total that should read
 * $1.05.
 */

export type ModelPrice = {
  /** A key such as `opus-5`. Imported session models match against it. */
  id: string;
  name: string;
  /** Dollars per million input tokens. */
  input: number;
  /** Dollars per million output tokens. */
  output: number;
};

export type CacheTtl = '5m' | '1h';

/** Cache reads cost a tenth of input. Writes cost 1.25× for five minutes and 2× for an hour. */
export const CACHE_READ_MULTIPLIER = 0.1;
export const CACHE_WRITE_MULTIPLIERS: Record<CacheTtl, number> = { '5m': 1.25, '1h': 2 };

export const TOKENS_PER_PRICE_UNIT = 1_000_000;

/** The default price table. These are the specification's prices, not live ones. */
export const defaultModels: readonly ModelPrice[] = [
  { id: 'fable-5-1', name: 'Fable 5.1', input: 10, output: 50 },
  { id: 'opus-5', name: 'Opus 5', input: 5, output: 25 },
  { id: 'sonnet-5', name: 'Sonnet 5', input: 2, output: 10 },
  { id: 'sonnet-4-6', name: 'Sonnet 4.6', input: 3, output: 15 },
  { id: 'haiku-4-5', name: 'Haiku 4.5', input: 1, output: 5 },
];

/** Dollars per million tokens for each way a token can be billed. */
export type Rates = {
  input: number;
  output: number;
  read: number;
  write: number;
};

export const ratesFor = (model: Pick<ModelPrice, 'input' | 'output'>, ttl: CacheTtl): Rates => ({
  input: model.input,
  output: model.output,
  read: model.input * CACHE_READ_MULTIPLIER,
  write: model.input * CACHE_WRITE_MULTIPLIERS[ttl],
});

/**
 * Reduces a model ID from a session to the form used in the price table:
 * lowercase, without Claude Code's `[1m]` context suffix, a trailing
 * `-YYYYMMDD` date, or a leading `claude-`.
 */
export const normalizeModelId = (model: string): string =>
  model
    .trim()
    .toLowerCase()
    .replace(/\[1m\]$/, '')
    .replace(/-\d{8}$/, '')
    .replace(/^claude-/, '');

/**
 * Finds the price table row for a session's model ID. The match is on the
 * whole normalized ID, never on a substring: `claude-opus-5-5` must not
 * silently pick up Opus 5's prices, because Opus 5.5 is priced differently.
 */
export const matchModel = (
  sessionModel: string,
  models: readonly ModelPrice[],
): ModelPrice | null => {
  const normalized = normalizeModelId(sessionModel);

  return models.find((model) => model.id === normalized) ?? null;
};

const trimPrice = (price: number): string => String(Number(price.toFixed(4)));

/** A model's name with its prices, such as `Opus 5 ($5/$25)`. */
export const modelLabel = (model: ModelPrice): string =>
  `${model.name} ($${trimPrice(model.input)}/$${trimPrice(model.output)})`;

/** How far a price can drift from exactly 5× before the ratio counts as broken. */
const RATIO_TOLERANCE = 1e-9;

/** The models whose output price isn't five times their input price. */
export const modelsOffTheRatio = (models: readonly ModelPrice[]): ModelPrice[] =>
  models.filter((model) => Math.abs(model.output - 5 * model.input) > RATIO_TOLERANCE);

export const pricesEqual = (first: readonly ModelPrice[], second: readonly ModelPrice[]): boolean =>
  first.length === second.length &&
  first.every((model, index) => {
    const other = second[index];

    return (
      model.id === other.id &&
      model.name === other.name &&
      model.input === other.input &&
      model.output === other.output
    );
  });

/** Turns a name such as `Opus 5.5` into an ID such as `opus-5-5`. */
export const toModelId = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const MAXIMUM_MODELS = 60;

export type ParsedPriceTable = { models: ModelPrice[] } | { error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A usable price per million tokens: finite, above zero, and at most $100,000. */
export const readPrice = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100_000
    ? value
    : null;

/** Reads a price table from JSON text: `{ "models": [...] }`, or the bare array. */
export const parsePriceTable = (text: string): ParsedPriceTable => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { error: 'That file isn’t valid JSON.' };
  }

  const entries = Array.isArray(value) ? value : isRecord(value) ? value.models : null;
  if (!Array.isArray(entries) || entries.length === 0) {
    return { error: 'Expected a "models" list with at least one model.' };
  }
  if (entries.length > MAXIMUM_MODELS) {
    return { error: `A price table can hold up to ${MAXIMUM_MODELS} models.` };
  }

  const models: ModelPrice[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of entries.entries()) {
    const position = `Model ${index + 1}`;
    if (!isRecord(entry)) return { error: `${position} isn’t an object.` };

    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!name) return { error: `${position} needs a name.` };

    const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : toModelId(name);
    if (!id) return { error: `${position} needs an ID.` };
    if (seen.has(id)) return { error: `The ID “${id}” appears more than once.` };

    const input = readPrice(entry.input);
    const output = readPrice(entry.output);
    if (input === null || output === null) {
      return { error: `${name} needs positive input and output prices in dollars per million.` };
    }

    seen.add(id);
    models.push({ id, name, input, output });
  }

  return { models };
};

export const serializePriceTable = (models: readonly ModelPrice[]): string =>
  `${JSON.stringify({ models }, null, 2)}\n`;
