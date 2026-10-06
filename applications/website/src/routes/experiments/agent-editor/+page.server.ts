import {
  claudeAgentFrontmatterSchema,
  codexAgentSchema,
  codexTurnContextPayloadSchema,
} from '@lostgradient/skillset';

import modelPricingData from '$lib/experiments/model-pricing.toml';
import { parseModelPricingCatalog } from '$lib/experiments/model-pricing-schema';

import { claudeModelAliases, sampleDocument } from './document';
import type { OptionsKey, SuggestionsKey } from './fields';
import { experiment } from './experiment';
import { buildReport } from './workbench';
import type { PageServerLoad } from './$types';

export const prerender = true;

const claude = claudeAgentFrontmatterSchema.shape;
const codex = codexAgentSchema.shape;

/** Every choice list comes from skillset's schemas, so a new value there shows up here. */
const options: Record<OptionsKey, string[]> = {
  permissionMode: [...claude.permissionMode.unwrap().options],
  memory: [...claude.memory.unwrap().options],
  isolation: [...claude.isolation.unwrap().options],
  color: [...claude.color.unwrap().options],
  cacheTtl: [...claude.experimental.unwrap().shape.cacheTtl.unwrap().options],
  modelVerbosity: [...codex.model_verbosity.unwrap().options],
  sandboxMode: [...codex.sandbox_mode.unwrap().options],
};

const catalog = parseModelPricingCatalog(modelPricingData);
const identifiersFrom = (provider: string): string[] =>
  catalog.models
    .filter((model) => model.provider === provider)
    .flatMap((model) => model.identifiers);

const suggestions: Record<SuggestionsKey | 'claudeModels' | 'codexModels', string[]> = {
  claudeEffort: [...claude.effort.unwrap().options[0].options],
  // Codex's built-in reasoning levels, from the effort its session files record.
  codexEffort: [...codexTurnContextPayloadSchema.shape.effort.unwrap().options[0].options],
  claudeModels: [...claudeModelAliases, ...identifiersFrom('Anthropic')],
  // The OpenAI model IDs Codex records in its session files, from the shared price list.
  codexModels: identifiersFrom('OpenAI'),
};

/**
 * Prerenders the sample's exported files and verdicts for both tools, so the
 * answer is in the HTML before any script runs, and hands the page the
 * schemas' choice lists as plain data.
 */
export const load: PageServerLoad = () => {
  const sample = sampleDocument();

  return {
    title: experiment.title,
    description: experiment.description,
    options,
    suggestions,
    sample: {
      claude: buildReport(sample, 'claude'),
      codex: buildReport(sample, 'codex'),
    },
  };
};
