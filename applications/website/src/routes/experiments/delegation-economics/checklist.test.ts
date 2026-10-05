import { describe, expect, it } from 'vitest';

import { checklistItems, isChecked, noChecks, verdict } from './checklist';
import { evaluate } from './economics';
import type { EconomicsInputs } from './economics';

const base: EconomicsInputs = {
  soloMinutes: 60,
  serialFraction: 0.4,
  workers: 4,
  integrationMinutes: 3,
  spawnTokens: 20_000,
  sharedTokens: 50_000,
  uniqueTokens: 300_000,
  outputTokens: 5_000,
  reportTokens: 2_000,
  sharedPrefix: false,
  mode: 'subagents',
  teamMultiplier: 3.5,
  planMultiplier: 7,
  prices: { input: 2, cachedInput: 0.2, output: 10 },
};

// Ten independent files: a genuinely good fit, so only the checklist can block it.
const goodFit = evaluate({
  ...base,
  serialFraction: 0.1,
  sharedTokens: 5_000,
  uniqueTokens: 400_000,
  workers: 5,
});

describe('acceptance check 7: the checklist', () => {
  it('says “Don’t fan out yet” when the shared interface is unresolved, whatever the numbers say', () => {
    expect(goodFit.warning).toBe(false);

    const result = verdict({ ...noChecks, interface: true }, goodFit);

    expect(result.blocked).toBe(true);
    expect(result.headline).toBe(
      'Don’t fan out yet: resolve the shared interface first. Otherwise workers implement against an imagined contract and the coordinator rewrites everything.',
    );
  });

  it('lists the outline’s five items in order', () => {
    expect(checklistItems.map((item) => item.label)).toEqual([
      'The task is smaller than the handoff.',
      'Every worker needs the same changing context.',
      'The shared interface is unresolved.',
      'Integration costs exceed parallel savings.',
      'There is no independent acceptance test.',
    ]);
  });

  it('checks the integration item itself when time(n) ≥ W', () => {
    const slower = evaluate({ ...base, serialFraction: 0.8, workers: 8 });

    expect(isChecked('integration', noChecks, slower)).toBe(true);
    expect(isChecked('integration', noChecks, goodFit)).toBe(false);
    expect(verdict(noChecks, slower).headline).toBe(
      'Don’t fan out: integration eats the parallel savings. 8 workers take 73.5 min against 60 min solo.',
    );
  });

  it('checks it at exactly time(n) = W, with no savings left', () => {
    // 60 × (0.5 + 0.25) + 7.5 × 2 = 60.
    const even = evaluate({ ...base, serialFraction: 0.5, workers: 2, integrationMinutes: 7.5 });

    expect(even.fanMinutes).toBe(60);
    expect(isChecked('integration', noChecks, even)).toBe(true);
  });

  it('gives a line for every checked item, headed by the first', () => {
    const result = verdict({ ...noChecks, smaller: true, 'no-test': true }, goodFit);

    expect(result.reasons).toHaveLength(2);
    expect(result.headline).toBe(result.reasons[0]);
    expect(result.reasons[1]).toMatch(/^Don’t fan out yet: there’s no independent acceptance test/);
  });

  it('weighs the trade when nothing is checked', () => {
    expect(verdict(noChecks, goodFit)).toEqual({
      blocked: false,
      headline:
        'Nothing on the checklist rules it out. Fanning out is 1.89× faster for 1.25× the cost.',
      reasons: [],
    });
    expect(verdict(noChecks, evaluate({ ...base, workers: 1 })).headline).toBe(
      'One worker is the solo session, so there’s nothing to fan out.',
    );
  });
});
