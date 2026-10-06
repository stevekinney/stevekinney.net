/**
 * The prices this page needs, picked out of the shared `model-pricing.toml`
 * while the page prerenders. Prices are US dollars per million tokens. Money is
 * always `tokens × price` summed first and divided by a million once at the
 * end, never built from per-token rates, which would leave float noise in a
 * total that should read $1.05.
 */

import { normalizeModelIdentifier } from '$lib/experiments/model-pricing';
import type { ModelPricingCatalog } from '$lib/experiments/model-pricing';

export type CacheTtl = '5m' | '1h';

export type ModelPrice = {
  /** A key such as `claude-opus-5-5`, derived from the catalog row's name. */
  id: string;
  name: string;
  input: number;
  cachedInput: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  output: number;
  /** Model IDs as Claude Code records them, so an imported session can find its row. */
  identifiers: string[];
};

export type SessionPricing = {
  /** When the shared price table was last checked, as `YYYY-MM-DD`. */
  updated: string;
  models: ModelPrice[];
  defaultModelId: string;
  defaultSwitchId: string;
};

/** Dollars per million tokens for each way a token can be billed. */
export type Rates = {
  input: number;
  output: number;
  read: number;
  write: number;
};

export const TOKENS_PER_PRICE_UNIT = 1_000_000;

/** Where a long session usually starts, and the cheaper model it might move to. */
export const DEFAULT_MODEL_IDENTIFIER = 'claude-opus-5-5';
export const DEFAULT_SWITCH_IDENTIFIER = 'claude-sonnet-5-5';

/** Compacting and switching models both happen inside Claude Code, so only Anthropic's rows apply. */
const PROVIDER = 'Anthropic';

/**
 * Hands the page plain prices with no schema library. A missing cache-write
 * price is billed at the input price, as the shared table's header says.
 * Throws when a default model is missing, which fails the build rather than
 * quietly defaulting to some other price.
 */
export const toSessionPricing = (catalog: ModelPricingCatalog): SessionPricing => {
  const models = catalog.models
    .filter((model) => model.provider === PROVIDER)
    .map((model) => ({
      id: model.id,
      name: model.name,
      input: model.input,
      cachedInput: model.cachedInput,
      cacheWrite5m: model.cacheWrite5m ?? model.input,
      cacheWrite1h: model.cacheWrite1h ?? model.input,
      output: model.output,
      identifiers: model.identifiers,
    }));

  const find = (identifier: string): string => {
    const model = models.find((entry) => entry.identifiers.includes(identifier));
    if (!model) throw new Error(`model-pricing.toml has no ${PROVIDER} model ${identifier}.`);

    return model.id;
  };

  return {
    updated: catalog.updated,
    models,
    defaultModelId: find(DEFAULT_MODEL_IDENTIFIER),
    defaultSwitchId: find(DEFAULT_SWITCH_IDENTIFIER),
  };
};

export const ratesFor = (model: ModelPrice, ttl: CacheTtl): Rates => ({
  input: model.input,
  output: model.output,
  read: model.cachedInput,
  write: ttl === '1h' ? model.cacheWrite1h : model.cacheWrite5m,
});

/** The row for a session's model ID, matched on the whole normalized ID, never a substring. */
export const matchModel = (
  sessionModel: string,
  models: readonly ModelPrice[],
): ModelPrice | null => {
  const normalized = normalizeModelIdentifier(sessionModel);

  return models.find((model) => model.identifiers.includes(normalized)) ?? null;
};

/** A model's name with its prices, such as `Claude Opus 5.5 ($4/$20)`. */
export const modelLabel = (model: ModelPrice): string =>
  `${model.name} ($${model.input}/$${model.output})`;
