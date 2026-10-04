import { describe, expect, it } from 'vitest';

import { matchModel, parseModelId } from './match-model';
import { defaultPricing } from './pricing';

const nameFor = (modelId: string): string | null =>
  matchModel(modelId, defaultPricing)?.name ?? null;

describe('matchModel', () => {
  it('matches each default model by family and full version', () => {
    expect(nameFor('claude-opus-5')).toBe('Opus 5');
    expect(nameFor('claude-fable-5-1')).toBe('Fable 5.1');
    expect(nameFor('claude-sonnet-5')).toBe('Sonnet 5');
  });

  it('drops a trailing 1M-context marker and a dated suffix', () => {
    expect(nameFor('claude-sonnet-4-6[1m]')).toBe('Sonnet 4.6');
    expect(nameFor('claude-haiku-4-5-20251001')).toBe('Haiku 4.5');
    expect(nameFor('Claude-Opus-5[1M]')).toBe('Opus 5');
  });

  it('does not price a later version at an earlier version’s rates', () => {
    expect(nameFor('claude-opus-5-5')).toBeNull();
    expect(nameFor('claude-sonnet-5-5')).toBeNull();
    expect(nameFor('claude-opus-5-1')).toBeNull();
  });

  it('reads a trailing zero as the same version', () => {
    expect(nameFor('claude-opus-5-0')).toBe('Opus 5');
  });

  it('reads the older ordering with the version first', () => {
    expect(parseModelId('claude-3-5-sonnet-20241022')).toEqual({
      family: 'sonnet',
      version: '3-5',
    });
    expect(nameFor('claude-3-5-sonnet-20241022')).toBeNull();
  });

  it('returns nothing for text that is not a Claude model', () => {
    expect(nameFor('gpt-6-astra')).toBeNull();
    expect(nameFor('')).toBeNull();
    expect(nameFor('<synthetic>')).toBeNull();
    expect(nameFor('claude-opus')).toBeNull();
  });

  it('finds a model the person added to the table by name', () => {
    const table = {
      ...defaultPricing,
      models: [
        ...defaultPricing.models,
        { id: 'custom-1', name: 'Opus 5.5', input: 6, output: 30, preservesCache: true },
      ],
    };

    expect(matchModel('claude-opus-5-5', table)?.id).toBe('custom-1');
    expect(matchModel('claude-opus-5', table)?.id).toBe('opus-5');
  });
});
