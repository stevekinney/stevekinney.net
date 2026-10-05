import modelPricingData from '$lib/experiments/model-pricing.toml';
import { parseModelPricingCatalog } from '$lib/experiments/model-pricing-schema';
import { experiment } from './experiment';
import { toPriceRows } from './pricing';
import type { PageServerLoad } from './$types';

export const prerender = true;

/**
 * Validates the shared `model-pricing.toml` while the page prerenders, so a bad
 * edit fails the build, and hands the browser only the Claude rows as plain data.
 */
export const load: PageServerLoad = () => {
  const catalog = parseModelPricingCatalog(modelPricingData);

  return {
    title: experiment.title,
    description: experiment.description,
    prices: toPriceRows(catalog.models),
    pricesUpdated: catalog.updated,
  };
};
