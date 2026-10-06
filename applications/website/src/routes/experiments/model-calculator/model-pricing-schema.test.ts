import { describe, expect, it } from 'vitest';

import modelPricingData from './model-pricing.toml';
import { parseModelPricingCatalog } from './model-pricing-schema';

const exampleModel = {
  name: 'Example',
  provider: 'Example Labs',
  input: 2,
  cachedInput: 0.2,
  output: 10,
};

const catalogWith = (...models: Record<string, unknown>[]) => ({ updated: '2026-10-04', models });

describe('parseModelPricingCatalog', () => {
  it('accepts the checked-in pricing file', () => {
    const catalog = parseModelPricingCatalog(modelPricingData);

    expect(catalog.models.length).toBeGreaterThan(0);
    expect(new Set(catalog.models.map((model) => model.id)).size).toBe(catalog.models.length);
  });

  it('derives an ID from the name and variant', () => {
    const catalog = parseModelPricingCatalog(
      catalogWith({ ...exampleModel, name: 'DeepSeek V4 Pro', variant: 'off-peak' }),
    );

    expect(catalog.models[0].id).toBe('deepseek-v4-pro-off-peak');
  });

  it('normalizes identifiers the same way session model IDs are normalized', () => {
    const catalog = parseModelPricingCatalog(
      catalogWith({ ...exampleModel, identifiers: ['Claude-Haiku-4-5-20251001'] }),
    );

    expect(catalog.models[0].identifiers).toEqual(['claude-haiku-4-5']);
  });

  it('defaults identifiers to an empty list', () => {
    expect(parseModelPricingCatalog(catalogWith(exampleModel)).models[0].identifiers).toEqual([]);
  });

  it('rejects an unknown key, so a misspelled field cannot silently price at zero', () => {
    const { cachedInput, ...withoutCachedInput } = exampleModel;

    expect(() =>
      parseModelPricingCatalog(catalogWith({ ...withoutCachedInput, cachedinput: cachedInput })),
    ).toThrow(/cachedinput/);
  });

  it('rejects negative prices and a malformed date', () => {
    expect(() => parseModelPricingCatalog(catalogWith({ ...exampleModel, output: -1 }))).toThrow(
      /Invalid model-pricing\.toml/,
    );
    expect(() =>
      parseModelPricingCatalog({ updated: 'October 4', models: [exampleModel] }),
    ).toThrow(/Invalid model-pricing\.toml/);
  });

  it('rejects two rows with the same name and variant', () => {
    expect(() => parseModelPricingCatalog(catalogWith(exampleModel, exampleModel))).toThrow(
      /"example"/,
    );
  });

  it('rejects an identifier listed on two rows', () => {
    expect(() =>
      parseModelPricingCatalog(
        catalogWith(
          { ...exampleModel, identifiers: ['example-1'] },
          { ...exampleModel, name: 'Other', identifiers: ['example-1'] },
        ),
      ),
    ).toThrow(/"example-1" is listed on more than one model/);
  });

  it('rejects cached input priced above uncached input', () => {
    expect(() =>
      parseModelPricingCatalog(catalogWith({ ...exampleModel, cachedInput: 20 })),
    ).toThrow(/cachedInput \(20\) is more than input \(2\)/);
  });

  it('rejects a cache-write multiplier typed where a price belongs', () => {
    expect(() =>
      parseModelPricingCatalog(catalogWith({ ...exampleModel, input: 4, cacheWrite5m: 1.25 })),
    ).toThrow(/cacheWrite5m \(1\.25\) is less than input \(4\)/);
  });
});
