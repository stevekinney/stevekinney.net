import modelPricingData from '../model-calculator/model-pricing.toml';
import { parseModelPricingCatalog } from '../model-calculator/model-pricing-schema';

import { experiment } from './experiment';
import { toWorkflowModels } from './models';
import type { PageServerLoad } from './$types';

export const prerender = true;

/**
 * Validates the shared `model-pricing.toml` while the page prerenders, so a
 * bad edit fails the build, and hands the browser the Anthropic rows as plain
 * data with no schema library.
 */
export const load: PageServerLoad = () => ({
  title: experiment.title,
  description: experiment.description,
  models: toWorkflowModels(parseModelPricingCatalog(modelPricingData)),
});
