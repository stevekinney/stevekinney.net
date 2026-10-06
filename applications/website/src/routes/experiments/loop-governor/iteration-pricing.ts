import { roundDollars } from './cost';

/**
 * The part of a `model-pricing.toml` row this page needs. The server validates
 * the file and hands the page these plain rows, so no schema library reaches
 * the browser.
 */
export type CatalogModel = {
  id: string;
  /** The name with its variant, such as `DeepSeek V4 Pro (peak)`. */
  name: string;
  provider: string;
  /** Dollars per million uncached input tokens. */
  input: number;
  /** Dollars per million input tokens read from the prompt cache. */
  cachedInput: number;
  /** Dollars per million output tokens. */
  output: number;
};

export type IterationTokens = {
  /** Input tokens every iteration sends: the prompt, the spec, the tools. */
  prompt: number;
  /** Output tokens every iteration writes, including thinking. */
  output: number;
  /** Tokens a fresh iteration reads back from disk: the plan, the log, the files. */
  reread: number;
  /** Tokens an in-session loop's history grows by each iteration. */
  growth: number;
  /**
   * Whether the history is read back from a warm prompt cache. A loop that
   * waits longer than the cache lives, such as one that fires every 30
   * minutes, pays the full input price for it every time.
   */
  growthCached: boolean;
};

/** Opus 5.5 at these sizes gives the specification's $0.30, $0.10, and $0.08. */
export const defaultTokens: IterationTokens = {
  prompt: 25_000,
  output: 10_000,
  reread: 25_000,
  growth: 20_000,
  growthCached: false,
};

export const DEFAULT_MODEL_ID = 'claude-opus-5-5';

const TOKENS_PER_PRICE_UNIT = 1_000_000;

export type IterationPrices = { c0: number; r: number; g: number };

/**
 * Turns token counts into the simulation's dollar inputs. Each amount adds
 * `tokens × price` first and divides by a million once, so totals come out
 * exact rather than as float noise.
 */
export const priceIteration = (model: CatalogModel, tokens: IterationTokens): IterationPrices => ({
  c0: roundDollars(
    (tokens.prompt * model.input + tokens.output * model.output) / TOKENS_PER_PRICE_UNIT,
  ),
  r: roundDollars((tokens.reread * model.input) / TOKENS_PER_PRICE_UNIT),
  g: roundDollars(
    (tokens.growth * (tokens.growthCached ? model.cachedInput : model.input)) /
      TOKENS_PER_PRICE_UNIT,
  ),
});

export const findCatalogModel = (
  models: readonly CatalogModel[],
  id: string,
): CatalogModel | undefined => models.find((model) => model.id === id);
