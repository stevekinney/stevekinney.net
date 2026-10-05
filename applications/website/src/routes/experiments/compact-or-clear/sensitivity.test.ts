import { describe, expect, it } from 'vitest';

import { defaultModels, ratesFor } from './pricing';
import { SENSITIVITY_HORIZON, sensitivityRows } from './sensitivity';
import { toProjectionInputs, defaultScenario } from './scenario';

const inputs = toProjectionInputs(defaultScenario, defaultModels);
const rows = sensitivityRows(inputs, defaultModels, '1h');
const row = (id: string) => rows.find((entry) => entry.id === id)!;

describe('sensitivityRows', () => {
  it('has one row per input', () => {
    expect(rows.map((entry) => entry.id).sort()).toEqual(
      ['cache', 'context', 'inputPerTurn', 'model', 'outputPerTurn', 'reread', 'summary'].sort(),
    );
  });

  it('sorts by spread, widest first', () => {
    const spreads = rows.map((entry) => entry.spread);

    expect(spreads).toEqual([...spreads].sort((first, second) => second - first));
  });

  it('finds the compaction payback at each end of an input, holding the rest', () => {
    expect(row('cache').low).toBe(6);
    expect(row('cache').high).toBe(16);
    expect(row('cache').spread).toBe(10);
    expect(row('cache').lowLabel).toBe('Warm');
    expect(row('cache').highLabel).toBe('Cold');
  });

  it('leaves the model and the re-read size at a spread of zero, since neither moves the compaction payback', () => {
    expect(row('model').spread).toBe(0);
    expect(row('model').lowLabel).toBe('Haiku 4.5');
    expect(row('model').highLabel).toBe('Fable 5.1');
    expect(row('reread').spread).toBe(0);
  });

  it('shows a larger summary pushing the payback out', () => {
    expect(row('summary').high).toBeGreaterThan(row('summary').low ?? Infinity);
  });

  it('counts a payback that never comes as just past the horizon', () => {
    const wide = sensitivityRows({ ...inputs, summaryPercent: 30 }, defaultModels, '1h');
    const never = wide.find((entry) => entry.id === 'context')!;

    // A 20K context with a 30% summary and a 15K baseline can never pay.
    expect(never.low).toBeNull();
    expect(never.high).not.toBeNull();
    expect(never.spread).toBe(SENSITIVITY_HORIZON + 1 - (never.high ?? 0));
  });

  it('gives the model row a spread once a custom price breaks the 5× ratio', () => {
    const odd = { id: 'odd', name: 'Odd', input: 0.5, output: 40 };
    const custom = sensitivityRows(inputs, [...defaultModels, odd], '1h');

    expect(custom.find((entry) => entry.id === 'model')?.spread).toBeGreaterThan(0);
  });

  it('uses the selected TTL’s write price for each model', () => {
    const five = sensitivityRows(
      { ...inputs, rates: ratesFor(defaultModels[1], '5m') },
      defaultModels,
      '5m',
    );

    expect(five.find((entry) => entry.id === 'model')?.low).not.toBeNull();
  });
});
