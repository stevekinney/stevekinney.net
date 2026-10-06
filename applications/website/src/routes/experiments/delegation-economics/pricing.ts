import type { ModelPricingCatalog } from '$lib/experiments/model-pricing';

/**
 * The prices a worker model needs, in US dollars per million tokens. The
 * defaults come from the shared `model-pricing.toml`, validated while the page
 * prerenders, so this page never carries a second price table. Money is
 * `tokens × price` summed first and divided by a million once at the end.
 */
export type WorkerModel = {
  /** A key such as `claude-sonnet-5-5`. Shared links carry it. */
  id: string;
  name: string;
  input: number;
  cachedInput: number;
  /**
   * Writing a five-minute cache entry, which the first worker does for a shared
   * prefix. Without one, a cache write costs the input price, as the shared
   * table's header says.
   */
  cacheWrite5m?: number;
  output: number;
};

export type WorkerPricing = {
  /** When the shared price table was last checked, as `YYYY-MM-DD`. */
  updated: string;
  models: WorkerModel[];
  defaultModelId: string;
};

export const TOKENS_PER_PRICE_UNIT = 1_000_000;

/** The specification's default worker model. */
export const DEFAULT_MODEL_IDENTIFIER = 'claude-sonnet-5-5';

/** Subagents and agent teams run on Claude, so only Anthropic's rows are offered. */
const WORKER_PROVIDER = 'Anthropic';

/**
 * Picks the worker models out of the validated catalog and hands the page
 * plain data. Throws when the default model is missing, which fails the build
 * rather than quietly defaulting to some other price.
 */
export const toWorkerPricing = (catalog: ModelPricingCatalog): WorkerPricing => {
  const rows = catalog.models.filter((model) => model.provider === WORKER_PROVIDER);
  const fallback = rows.find((model) => model.identifiers.includes(DEFAULT_MODEL_IDENTIFIER));

  if (!fallback) {
    throw new Error(
      `model-pricing.toml has no ${WORKER_PROVIDER} model with the identifier ${DEFAULT_MODEL_IDENTIFIER}.`,
    );
  }

  return {
    updated: catalog.updated,
    models: rows.map(({ id, name, input, cachedInput, cacheWrite5m, output }) => ({
      id,
      name,
      input,
      cachedInput,
      ...(cacheWrite5m === undefined ? {} : { cacheWrite5m }),
      output,
    })),
    defaultModelId: fallback.id,
  };
};

export const findModel = (models: readonly WorkerModel[], id: string): WorkerModel | undefined =>
  models.find((model) => model.id === id);

/** What a model ID can be. A shared link carries it, so an imported table can't hold any other. */
export const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/;

const MAXIMUM_MODELS = 40;

/** A usable price per million tokens: finite, above zero, and at most $100,000. */
export const readPrice = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100_000
    ? value
    : null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Turns a name such as `Claude Sonnet 5.5` into an ID such as `claude-sonnet-5-5`. */
export const toModelId = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export type ParsedPriceTable = { models: WorkerModel[] } | { error: string };

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

  const models: WorkerModel[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of entries.entries()) {
    const position = `Model ${index + 1}`;
    if (!isRecord(entry)) return { error: `${position} isn’t an object.` };

    const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, 60) : '';
    if (!name) return { error: `${position} needs a name.` };

    const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : toModelId(name);
    if (!MODEL_ID_PATTERN.test(id)) {
      return {
        error: `The ID “${id}” can only use lowercase letters, numbers, and hyphens, up to 60 characters.`,
      };
    }
    if (seen.has(id)) return { error: `The ID “${id}” appears more than once.` };

    const input = readPrice(entry.input);
    const cachedInput = readPrice(entry.cachedInput);
    const output = readPrice(entry.output);
    if (input === null || cachedInput === null || output === null) {
      return {
        error: `${name} needs positive input, cached input, and output prices in dollars per million.`,
      };
    }

    const cacheWrite5m =
      entry.cacheWrite5m === undefined ? undefined : readPrice(entry.cacheWrite5m);
    if (cacheWrite5m === null) {
      return { error: `${name}’s cacheWrite5m has to be a positive price in dollars per million.` };
    }

    seen.add(id);
    models.push({
      id,
      name,
      input,
      cachedInput,
      ...(cacheWrite5m === undefined ? {} : { cacheWrite5m }),
      output,
    });
  }

  return { models };
};

export const serializePriceTable = (models: readonly WorkerModel[]): string =>
  `${JSON.stringify({ models }, null, 2)}\n`;

export const pricesEqual = (
  first: readonly WorkerModel[],
  second: readonly WorkerModel[],
): boolean =>
  first.length === second.length &&
  first.every((model, index) => {
    const other = second[index];

    return (
      model.id === other.id &&
      model.name === other.name &&
      model.input === other.input &&
      model.cachedInput === other.cachedInput &&
      model.cacheWrite5m === other.cacheWrite5m &&
      model.output === other.output
    );
  });

const trimPrice = (price: number): string => String(Number(price.toFixed(4)));

/** A model's name with its prices, such as `Claude Sonnet 5.5 ($2 / $0.2 cached / $10)`. */
export const modelLabel = (model: WorkerModel): string =>
  `${model.name} ($${trimPrice(model.input)} / $${trimPrice(model.cachedInput)} cached / $${trimPrice(model.output)})`;
