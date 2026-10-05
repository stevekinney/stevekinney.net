import { describe, expect, it } from 'vitest';

import { defaultModels } from './pricing';
import { defaultScenario } from './scenario';
import type { Scenario } from './scenario';
import { decodeScenario, encodeScenario } from './share-link';

const scenario = (overrides: Partial<Scenario> = {}): Scenario => ({
  ...defaultScenario,
  ...overrides,
});

describe('encodeScenario and decodeScenario', () => {
  it('round-trips the default scenario', () => {
    const decoded = decodeScenario(encodeScenario(defaultScenario, defaultModels));

    expect(decoded?.scenario).toMatchObject({
      modelId: 'opus-5',
      ttl: '1h',
      warm: true,
      contextNow: 400_000,
      summaryPercent: 5,
      reread: 25_000,
      inputPerTurn: 5_000,
      outputPerTurn: 2_000,
      turns: 30,
    });
    expect(decoded?.scenario.laterEnabled).toBeUndefined();
    expect(decoded?.customModel).toBeNull();
  });

  it('round-trips a changed scenario, including compact later and a fractional summary', () => {
    const changed = scenario({
      modelId: 'haiku-4-5',
      ttl: '5m',
      warm: false,
      contextNow: 812_000,
      summaryPercent: 4.1,
      reread: 0,
      turns: 120,
      baseline: 18_000,
      charsPerToken: 3.5,
      laterEnabled: true,
      laterAfter: 12,
    });
    const decoded = decodeScenario(encodeScenario(changed, defaultModels));

    expect(decoded?.scenario).toMatchObject(changed);
  });

  it('carries custom prices for the selected model so the link reproduces the numbers', () => {
    const models = [...defaultModels, { id: 'opus-5-1', name: 'Opus 5.1', input: 6, output: 30 }];
    const decoded = decodeScenario(encodeScenario(scenario({ modelId: 'opus-5-1' }), models));

    expect(decoded?.customModel).toEqual({
      id: 'opus-5-1',
      name: 'Opus 5.1',
      input: 6,
      output: 30,
    });
  });

  it('carries changed prices for a default model', () => {
    const models = defaultModels.map((model) =>
      model.id === 'opus-5' ? { ...model, input: 6, output: 30 } : model,
    );

    expect(decodeScenario(encodeScenario(defaultScenario, models))?.customModel?.input).toBe(6);
  });

  it('ignores a custom price that an imported price table would reject', () => {
    for (const price of ['9'.repeat(400), '100001', '0']) {
      const query = `model=opus-5-1&name=Opus+5.1&inputPrice=${price}&outputPrice=30`;

      expect(decodeScenario(query)?.customModel).toBeNull();
    }
  });

  it('holds only controls, never anything from an imported session', () => {
    const encoded = encodeScenario(defaultScenario, defaultModels);

    expect([...new URLSearchParams(encoded).keys()].sort()).toEqual(
      ['cache', 'context', 'input', 'model', 'output', 'reread', 'summary', 'ttl', 'turns'].sort(),
    );
  });

  it('keeps values inside their limits and drops what is not valid', () => {
    const decoded = decodeScenario(
      'context=999999999999&turns=9000&summary=500&ttl=2h&cache=maybe&model=BAD%20ID&reread=-5&input=abc',
    );

    expect(decoded?.scenario).toEqual({
      contextNow: 10_000_000,
      turns: 500,
      summaryPercent: 90,
    });
  });

  it('holds compact later to a turn before the last', () => {
    expect(decodeScenario('turns=10&later=50')?.scenario.laterAfter).toBe(9);
  });

  it('returns null when nothing applies', () => {
    expect(decodeScenario('')).toBeNull();
    expect(decodeScenario('utm_source=newsletter')).toBeNull();
  });
});
