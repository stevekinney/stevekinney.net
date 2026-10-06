import defaultPricingData from './default-pricing.json';

/** One model's prices, in dollars per million tokens. */
export type ModelPrice = {
  /** Stable key for links and saved scenarios. Editing the name doesn't change it. */
  id: string;
  name: string;
  input: number;
  output: number;
  /** Whether the effort level can change per request without resetting the cache. */
  preservesCache: boolean;
};

/** An effort level and how much output it generates relative to `high`. */
export type EffortLevel = {
  id: string;
  label: string;
  factor: number;
  /** `false` for a placeholder that isn't backed by published runs. */
  sourced: boolean;
};

/** Everything a person can edit under "Prices and assumptions". */
export type PricingTable = {
  models: ModelPrice[];
  efforts: EffortLevel[];
};

export const defaultPricing: PricingTable = defaultPricingData;

/** The version written into exported files. */
export const PRICING_FILE_VERSION = 1;

export const MAX_MODELS = 40;

const sameModel = (first: ModelPrice, second: ModelPrice): boolean =>
  first.id === second.id &&
  first.name === second.name &&
  first.input === second.input &&
  first.output === second.output &&
  first.preservesCache === second.preservesCache;

const sameEffort = (first: EffortLevel, second: EffortLevel): boolean =>
  first.id === second.id &&
  first.label === second.label &&
  first.factor === second.factor &&
  first.sourced === second.sourced;

/** Whether any value differs from the defaults, including added or removed models. */
export const isCustomPricing = (table: PricingTable): boolean =>
  table.models.length !== defaultPricing.models.length ||
  table.efforts.length !== defaultPricing.efforts.length ||
  table.models.some((model, index) => !sameModel(model, defaultPricing.models[index])) ||
  table.efforts.some((effort, index) => !sameEffort(effort, defaultPricing.efforts[index]));

export const findModel = (table: PricingTable, id: string): ModelPrice | undefined =>
  table.models.find((model) => model.id === id);

export const findEffort = (table: PricingTable, id: string): EffortLevel | undefined =>
  table.efforts.find((effort) => effort.id === id);

/** `Opus 5.5` becomes `opus-5-5`. */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** A key that no model in the table uses yet, based on a name. */
export const uniqueModelId = (table: PricingTable, name: string): string => {
  const base = slugify(name) || 'model';
  const taken = new Set(table.models.map((model) => model.id));
  if (!taken.has(base)) return base;

  for (let suffix = 2; ; suffix += 1) {
    if (!taken.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
  }
};

/** The label in a model dropdown, such as `Opus 5 ($5/$25)`. */
export const modelOptionLabel = (model: ModelPrice): string =>
  `${model.name} ($${formatPriceNumber(model.input)}/$${formatPriceNumber(model.output)})`;

/** A price without trailing zeros: 5, 0.8, 12.5. */
export const formatPriceNumber = (price: number): string =>
  Number.isInteger(price) ? String(price) : String(Number(price.toFixed(4)));

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The most a model can cost per million tokens. Larger values overflow the cost arithmetic. */
export const MAX_PRICE = 100_000;

/** The most an effort level can scale output volume. */
export const MAX_EFFORT_FACTOR = 100;

/**
 * The least an effort level can scale output volume. Below it the ratio between two levels can
 * overflow, since a subnormal factor divides into infinity.
 */
export const MIN_EFFORT_FACTOR = 0.001;

const readNumber = (value: unknown, maximum: number, minimum = 0): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;

const readPrice = (value: unknown): number | null => readNumber(value, MAX_PRICE);

export type PricingParseResult =
  { ok: true; table: PricingTable; warnings: string[] } | { ok: false; error: string };

/**
 * Reads a pricing table that came from a file or a link. Nothing here trusts
 * the shape: models that aren't usable are reported and skipped, and effort
 * levels are matched to the defaults by ID, because the rest of the page
 * depends on those five existing.
 */
export const parsePricingTable = (value: unknown): PricingParseResult => {
  if (!isRecord(value) || !Array.isArray(value.models)) {
    return { ok: false, error: 'That file doesn’t have a list of models.' };
  }

  const warnings: string[] = [];
  const models: ModelPrice[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.models.entries()) {
    const position = `Model ${index + 1}`;
    if (!isRecord(entry)) {
      warnings.push(`${position} isn’t an object, so it was skipped.`);
      continue;
    }

    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    const input = readPrice(entry.input);
    const output = readPrice(entry.output);
    if (!name || input === null || output === null) {
      warnings.push(`${position} needs a name and an input and output price, so it was skipped.`);
      continue;
    }

    const requestedId =
      typeof entry.id === 'string' && slugify(entry.id) ? slugify(entry.id) : slugify(name);
    let id = requestedId || `model-${index + 1}`;
    for (let suffix = 2; seen.has(id); suffix += 1) id = `${requestedId}-${suffix}`;
    seen.add(id);

    models.push({ id, name, input, output, preservesCache: entry.preservesCache === true });
  }

  if (models.length === 0)
    return { ok: false, error: 'None of the models in that file were usable.' };
  if (models.length > MAX_MODELS) {
    return { ok: false, error: `That file has more than ${MAX_MODELS} models.` };
  }

  const importedEfforts = Array.isArray(value.efforts) ? value.efforts.filter(isRecord) : [];
  const efforts = defaultPricing.efforts.map((standard): EffortLevel => {
    const imported = importedEfforts.find((entry) => entry.id === standard.id);
    if (!imported) return { ...standard };

    const factor = readNumber(imported.factor, MAX_EFFORT_FACTOR, MIN_EFFORT_FACTOR);
    if (factor === null) {
      warnings.push(
        `The factor for ${standard.label} effort wasn’t a number from ${MIN_EFFORT_FACTOR} to ${MAX_EFFORT_FACTOR}, so the default stays.`,
      );

      return { ...standard };
    }

    return {
      ...standard,
      factor,
      sourced: typeof imported.sourced === 'boolean' ? imported.sourced : standard.sourced,
    };
  });

  return { ok: true, table: { models, efforts }, warnings };
};

/** The table as a file a person can keep and import later. */
export const serializePricingTable = (table: PricingTable): string =>
  `${JSON.stringify({ version: PRICING_FILE_VERSION, ...table }, null, 2)}\n`;
