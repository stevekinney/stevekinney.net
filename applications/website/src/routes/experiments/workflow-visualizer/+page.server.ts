import modelPricingData from '$lib/experiments/model-pricing.toml';
import { parseModelPricingCatalog } from '$lib/experiments/model-pricing-schema';

import { analyzeWorkflow } from './analyze-workflow';
import { experiment } from './experiment';
import sampleSource from './sample.workflow.js?raw';
import { checkWorkflow } from './workflow-checks';
import type { PageServerLoad } from './$types';

export const prerender = true;

/** The OpenAI model IDs the Codex export offers, from the shared price list. */
const openAiModels = parseModelPricingCatalog(modelPricingData)
  .models.filter((model) => model.provider === 'OpenAI')
  .flatMap((model) => model.identifiers);

/**
 * Analyzes and checks the sample while the page prerenders, so its diagram
 * and verdict are in the HTML before any script runs. The page loads the
 * parser itself only after it mounts.
 */
export const load: PageServerLoad = () => {
  const analysis = analyzeWorkflow(sampleSource);
  if (!analysis.ok) {
    throw new Error(`The sample workflow doesn't parse: ${analysis.error.message}`);
  }

  return {
    title: experiment.title,
    description: experiment.description,
    openAiModels,
    sample: { source: sampleSource, analysis, checks: checkWorkflow(sampleSource) },
  };
};
