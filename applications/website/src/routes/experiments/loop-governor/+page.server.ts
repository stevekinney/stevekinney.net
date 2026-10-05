import modelPricingData from '$lib/experiments/model-pricing.toml';
import { parseModelPricingCatalog } from '$lib/experiments/model-pricing-schema';
import { experiment } from './experiment';
import type { CatalogModel } from './iteration-pricing';
import type { PageServerLoad } from './$types';

export const prerender = true;

/**
 * Validates the shared `model-pricing.toml` while the page prerenders, so a bad
 * edit fails the build, and hands the browser only the prices it uses.
 */
export const load: PageServerLoad = () => {
  const catalog = parseModelPricingCatalog(modelPricingData);

  return {
    title: experiment.title,
    description: experiment.description,
    pricesUpdated: catalog.updated,
    models: catalog.models.map((model): CatalogModel => ({
      id: model.id,
      name: model.variant ? `${model.name} (${model.variant})` : model.name,
      provider: model.provider,
      input: model.input,
      cachedInput: model.cachedInput,
      output: model.output,
    })),
  };
};
