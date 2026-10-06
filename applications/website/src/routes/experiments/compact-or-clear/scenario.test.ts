import { describe, expect, it } from 'vitest';

import type { ModelPrice } from './pricing';
import { summaryNote, switchModel } from './scenario';

describe('summaryNote', () => {
  it('stays quiet when the summary is smaller than the context', () => {
    expect(summaryNote(400_000, 5)).toBeNull();
  });

  it('flags a summary as large as the context', () => {
    expect(summaryNote(10_000, 100)).toContain('as large as your context');
  });
});

describe('switchModel', () => {
  const model = (id: string, output: number): ModelPrice => ({
    id,
    name: id,
    input: output / 5,
    cachedInput: output / 50,
    cacheWrite5m: output / 4,
    cacheWrite1h: (output * 2) / 5,
    output,
    identifiers: [id],
  });
  const models = [model('fable', 50), model('opus', 20), model('sonnet', 10), model('haiku', 5)];

  it('uses the chosen model when it differs from the current one', () => {
    expect(switchModel(models, 'opus', 'sonnet')?.id).toBe('sonnet');
  });

  it('falls back to the cheapest other model when the two collide', () => {
    expect(switchModel(models, 'sonnet', 'sonnet')?.id).toBe('haiku');
    expect(switchModel(models, 'haiku', 'haiku')?.id).toBe('sonnet');
  });

  it('has nothing to switch to with a single model', () => {
    expect(switchModel([model('opus', 20)], 'opus', 'opus')).toBeNull();
  });
});
