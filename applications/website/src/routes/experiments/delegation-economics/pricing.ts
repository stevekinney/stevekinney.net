import type { ModelPricingCatalog } from '$lib/experiments/model-pricing';

/**
 * The prices a worker model needs, in US dollars per million tokens. They come
 * from the shared `model-pricing.toml`, validated while the page prerenders,
 * so this page never carries a second price table.
 */
export type WorkerModel = {
  /** A key such as `claude-sonnet-5-5`. */
  id: string;
  name: string;
  input: number;
  output: number;
};

export type WorkerPricing = {
  /** When the shared price table was last checked, as `YYYY-MM-DD`. */
  updated: string;
  models: WorkerModel[];
  defaultModelId: string;
};

export const TOKENS_PER_PRICE_UNIT = 1_000_000;

/** The default worker model. */
export const DEFAULT_MODEL_IDENTIFIER = 'claude-sonnet-5-5';

/** Subagents run on Claude, so only Anthropic's rows are offered. */
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
    models: rows.map(({ id, name, input, output }) => ({ id, name, input, output })),
    defaultModelId: fallback.id,
  };
};

/** The model with this ID, or the first one when it's gone from the table. */
export const findModel = (models: readonly WorkerModel[], id: string): WorkerModel =>
  models.find((model) => model.id === id) ?? models[0];

const trimPrice = (price: number): string => String(Number(price.toFixed(4)));

/** A model's name with its prices, such as `Claude Sonnet 5.5 ($2 in / $10 out)`. */
export const modelLabel = (model: WorkerModel): string =>
  `${model.name} ($${trimPrice(model.input)} in / $${trimPrice(model.output)} out)`;
