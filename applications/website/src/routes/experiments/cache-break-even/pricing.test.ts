import { describe, expect, it } from 'vitest';

import {
  defaultPricing,
  isCustomPricing,
  modelOptionLabel,
  parsePricingTable,
  serializePricingTable,
  slugify,
  uniqueModelId,
} from './pricing';

describe('the default table', () => {
  it('keeps the seven models in order, with the specification’s prices', () => {
    expect(defaultPricing.models.map((model) => [model.id, model.input, model.output])).toEqual([
      ['fable-5-1', 10, 50],
      ['opus-5', 5, 25],
      ['opus-5-5', 4, 20],
      ['sonnet-5', 2, 10],
      ['sonnet-5-5', 2, 10],
      ['sonnet-4-6', 3, 15],
      ['haiku-4-5', 1, 5],
    ]);
    expect(
      defaultPricing.models.filter((model) => model.preservesCache).map((model) => model.id),
    ).toEqual(['fable-5-1', 'opus-5']);
  });

  it('keeps the five effort factors, with the unpublished ones flagged', () => {
    expect(
      defaultPricing.efforts.map((effort) => [effort.id, effort.factor, effort.sourced]),
    ).toEqual([
      ['low', 0.25, true],
      ['medium', 0.5, true],
      ['high', 1, true],
      ['xhigh', 1.5, false],
      ['max', 2.2, false],
    ]);
  });

  it('labels the dropdown with the prices', () => {
    expect(modelOptionLabel(defaultPricing.models[1])).toBe('Opus 5 ($5/$25)');
    expect(modelOptionLabel({ ...defaultPricing.models[0], input: 0.8, output: 4 })).toBe(
      'Fable 5.1 ($0.8/$4)',
    );
  });
});

describe('isCustomPricing', () => {
  it('is false for the defaults and true after any change', () => {
    expect(isCustomPricing(defaultPricing)).toBe(false);
    expect(isCustomPricing({ ...defaultPricing, models: defaultPricing.models.slice(1) })).toBe(
      true,
    );
    expect(
      isCustomPricing({
        ...defaultPricing,
        models: defaultPricing.models.map((model, index) =>
          index === 2 ? { ...model, output: 11 } : model,
        ),
      }),
    ).toBe(true);
    expect(
      isCustomPricing({
        ...defaultPricing,
        efforts: defaultPricing.efforts.map((effort) =>
          effort.id === 'max' ? { ...effort, sourced: true } : effort,
        ),
      }),
    ).toBe(true);
  });
});

describe('model keys', () => {
  it('slugifies names and keeps keys unique', () => {
    expect(slugify('Opus 5.5')).toBe('opus-5-5');
    expect(uniqueModelId(defaultPricing, 'Opus 5')).toBe('opus-5-2');
    expect(uniqueModelId(defaultPricing, '!!!')).toBe('model');
  });
});

describe('parsePricingTable', () => {
  it('round-trips an exported table', () => {
    const result = parsePricingTable(JSON.parse(serializePricingTable(defaultPricing)));

    expect(result).toEqual({ ok: true, table: defaultPricing, warnings: [] });
  });

  it('skips unusable models with a warning and keeps the rest', () => {
    const result = parsePricingTable({
      models: [
        { name: 'Good', input: 1, output: 2, preservesCache: true },
        { name: 'No price' },
        'nope',
        { name: 'Negative', input: -1, output: 2 },
      ],
    });

    expect(result.ok && result.table.models.map((model) => model.name)).toEqual(['Good']);
    expect(result.ok && result.warnings).toHaveLength(3);
  });

  it('matches effort levels by ID and keeps the defaults for anything unusable', () => {
    const result = parsePricingTable({
      models: [{ name: 'Good', input: 1, output: 2 }],
      efforts: [
        { id: 'max', factor: 3, sourced: true },
        { id: 'low', factor: 'lots' },
        { id: 'unknown', factor: 9 },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.table.efforts).toHaveLength(5);
      expect(result.table.efforts.find((effort) => effort.id === 'max')).toMatchObject({
        factor: 3,
        sourced: true,
      });
      expect(result.table.efforts.find((effort) => effort.id === 'low')?.factor).toBe(0.25);
    }
  });

  it('gives duplicate names distinct keys', () => {
    const result = parsePricingTable({
      models: [
        { name: 'Same', input: 1, output: 2 },
        { name: 'Same', input: 3, output: 4 },
      ],
    });

    expect(result.ok && result.table.models.map((model) => model.id)).toEqual(['same', 'same-2']);
  });

  it('rejects files that are not tables', () => {
    expect(parsePricingTable(null).ok).toBe(false);
    expect(parsePricingTable([]).ok).toBe(false);
    expect(parsePricingTable({ models: [] }).ok).toBe(false);
    expect(parsePricingTable({ models: [{ name: '' }] }).ok).toBe(false);
  });
});
