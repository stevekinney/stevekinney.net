import type { PricingRates } from '$lib/experiments/model-pricing';
import type { TokenUsage } from './token-usage';

const TOKENS_PER_PRICE_UNIT = 1_000_000;

/**
 * Prices token usage against one model's rates, in US dollars. Cache writes
 * use the model's cache-write prices when it has them and the plain input
 * price when it doesn't, which matches providers that cache automatically
 * without a write premium.
 *
 * The parts are added before dividing by a million. Dividing each part first
 * compounds floating-point error, enough to show an exact half cent such as
 * $0.335 as $0.33.
 */
export const calculateCost = (usage: TokenUsage, rates: PricingRates): number =>
  (usage.uncachedInput * rates.input +
    usage.cacheRead * rates.cachedInput +
    usage.cacheWrite5m * (rates.cacheWrite5m ?? rates.input) +
    usage.cacheWrite1h * (rates.cacheWrite1h ?? rates.input) +
    usage.output * rates.output) /
  TOKENS_PER_PRICE_UNIT;
