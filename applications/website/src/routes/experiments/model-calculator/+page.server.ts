import { experiment } from './experiment';
import modelPricingData from '$lib/experiments/model-pricing.toml';
import { parseModelPricingCatalog } from '$lib/experiments/model-pricing-schema';
import type { PageServerLoad } from './$types';

export const prerender = true;

/**
 * Validates `model-pricing.toml` while the page prerenders, so a bad edit
 * fails the build, and hands the browser plain data with no schema library.
 */
export const load: PageServerLoad = () => ({
  title: experiment.title,
  description: experiment.description,
  catalog: parseModelPricingCatalog(modelPricingData),
});
