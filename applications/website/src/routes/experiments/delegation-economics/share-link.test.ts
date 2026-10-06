import { describe, expect, it } from 'vitest';

import type { WorkerModel } from './pricing';
import { defaultScenario } from './scenario';
import { decodeScenario, encodeScenario } from './share-link';

const sonnet: WorkerModel = {
  id: 'claude-sonnet-5-5',
  name: 'Claude Sonnet 5.5',
  input: 2,
  cachedInput: 0.2,
  output: 10,
};
const models = [sonnet];

describe('share links', () => {
  it('round-trips every control', () => {
    const scenario = {
      ...defaultScenario(sonnet.id),
      workers: 7,
      serialFraction: 0.25,
      sharedPrefix: true,
      mode: 'plan' as const,
      planMultiplier: 6.5,
    };

    const encoded = encodeScenario(scenario, models, models);
    expect(encoded).not.toContain('inputPrice');
    expect(decodeScenario(encoded)).toEqual({ scenario, customModel: null });
  });

  it('carries edited prices so the link reproduces the numbers', () => {
    const edited = { ...sonnet, input: 3 };
    const decoded = decodeScenario(encodeScenario(defaultScenario(sonnet.id), [edited], models));

    expect(decoded?.customModel).toEqual(edited);
  });

  it('carries a cache-write price with edited prices', () => {
    const standard = { ...sonnet, cacheWrite5m: 2.5 };
    const edited = { ...standard, cacheWrite5m: 3 };
    const encoded = encodeScenario(defaultScenario(sonnet.id), [edited], [standard]);

    expect(encoded).toContain('writePrice=3');
    expect(decodeScenario(encoded)?.customModel).toEqual(edited);
  });

  it('holds untrusted values to the controls’ ranges and drops what doesn’t parse', () => {
    const decoded = decodeScenario(
      'workers=99&serial=7&minutes=abc&mode=swarm&model=Not%20An%20Id&inputPrice=-1',
    );

    expect(decoded).toEqual({ scenario: { workers: 32, serialFraction: 1 }, customModel: null });
    expect(decodeScenario('')).toBeNull();
    expect(decodeScenario('unrelated=1')).toBeNull();
  });

  it('rounds a fractional worker count', () => {
    expect(decodeScenario('workers=3.6')?.scenario.workers).toBe(4);
  });
});
