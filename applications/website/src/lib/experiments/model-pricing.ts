/**
 * Client-safe pricing types and helpers. The zod schema that validates
 * `model-pricing.toml` lives in `model-pricing-schema.ts` and only runs on the
 * server, so zod never reaches a client bundle.
 */

/** The per-million-token prices that a cost calculation needs. */
export type PricingRates = {
  input: number;
  cachedInput: number;
  output: number;
  cacheWrite5m?: number;
  cacheWrite1h?: number;
};

/** One row of `model-pricing.toml`. Every price is in US dollars per million tokens. */
export type ModelPricing = PricingRates & {
  /** Unique, URL-safe key derived from the name and variant. */
  id: string;
  name: string;
  variant?: string;
  provider: string;
  maximumPromptTokens?: number;
  identifiers: string[];
};

export type ModelPricingCatalog = {
  /** The date the prices were last checked, as `YYYY-MM-DD`. */
  updated: string;
  models: ModelPricing[];
};

/**
 * Reduces a model ID from a session file to the form used in `identifiers`:
 * lowercase, without Claude Code's `[1m]` context-window suffix, and without a
 * trailing `-YYYYMMDD` snapshot date.
 */
export const normalizeModelIdentifier = (model: string): string =>
  model
    .trim()
    .toLowerCase()
    .replace(/\[1m\]$/, '')
    .replace(/-\d{8}$/, '');

/** Finds the first catalog row whose identifiers include the given session model ID. */
export const findModelPricing = (
  model: string,
  models: readonly ModelPricing[],
): ModelPricing | undefined => {
  const normalized = normalizeModelIdentifier(model);

  return models.find((pricing) => pricing.identifiers.includes(normalized));
};

/** The price of one million input tokens plus one million output tokens. */
export const blendedPrice = (pricing: PricingRates): number => pricing.input + pricing.output;
