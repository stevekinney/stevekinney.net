import { z } from 'zod';

import { normalizeModelIdentifier } from './model-pricing';
import type { ModelPricing, ModelPricingCatalog } from './model-pricing';

const PriceSchema = z.number().finite().nonnegative();

// Strict objects reject unknown keys, so a misspelled field such as
// `cachedinput` fails the build instead of silently pricing at zero.
const ModelPricingSchema = z.strictObject({
  name: z.string().trim().min(1),
  variant: z.string().trim().min(1).optional(),
  provider: z.string().trim().min(1),
  input: PriceSchema,
  cachedInput: PriceSchema,
  output: PriceSchema,
  cacheWrite5m: PriceSchema.optional(),
  cacheWrite1h: PriceSchema.optional(),
  maximumPromptTokens: z.number().int().positive().optional(),
  identifiers: z.array(z.string().trim().min(1)).default([]),
});

const ModelPricingCatalogSchema = z.strictObject({
  updated: z.iso.date(),
  models: z.array(ModelPricingSchema).min(1),
});

const toModelId = (name: string, variant: string | undefined): string =>
  [name, variant]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const describeModel = (model: Pick<ModelPricing, 'name' | 'variant'>): string =>
  model.variant ? `${model.name} (${model.variant})` : model.name;

/**
 * Catches the likeliest data-entry slips without pinning any price: a
 * misplaced decimal that makes cached input dearer than input, or a
 * multiplier such as 1.25 typed where a cache-write price belongs.
 */
const findPriceProblems = (model: ModelPricing): string[] => {
  const problems: string[] = [];

  if (model.cachedInput > model.input) {
    problems.push(
      `${describeModel(model)}: cachedInput (${model.cachedInput}) is more than input (${model.input}).`,
    );
  }

  for (const field of ['cacheWrite5m', 'cacheWrite1h'] as const) {
    const price = model[field];

    if (price !== undefined && price < model.input) {
      problems.push(
        `${describeModel(model)}: ${field} (${price}) is less than input (${model.input}). ` +
          'Cache writes are a price per million tokens, not a multiplier.',
      );
    }
  }

  return problems;
};

/** Reports every value that appears more than once, in first-seen order. */
const findDuplicates = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
};

/**
 * Validates the parsed contents of `model-pricing.toml` and derives each row's
 * `id`. Throws a readable error naming every problem, because the only caller
 * is a prerendered page and a thrown error there fails the build.
 */
export const parseModelPricingCatalog = (raw: unknown): ModelPricingCatalog => {
  const result = ModelPricingCatalogSchema.safeParse(raw);

  if (!result.success) {
    throw new Error(`Invalid model-pricing.toml:\n${z.prettifyError(result.error)}`);
  }

  const models: ModelPricing[] = result.data.models.map((model) => ({
    ...model,
    id: toModelId(model.name, model.variant),
    identifiers: model.identifiers.map(normalizeModelIdentifier),
  }));

  const problems = [
    ...findDuplicates(models.map((model) => model.id)).map(
      (id) => `Two models share the name and variant that produce the ID "${id}".`,
    ),
    ...findDuplicates(models.flatMap((model) => model.identifiers)).map(
      (identifier) => `The identifier "${identifier}" is listed on more than one model.`,
    ),
    ...models.flatMap(findPriceProblems),
  ];

  if (problems.length > 0) {
    throw new Error(`Invalid model-pricing.toml:\n${problems.join('\n')}`);
  }

  return { updated: result.data.updated, models };
};
