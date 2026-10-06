import { describe, expect, it } from 'vitest';

import type { Scenario } from './budget';
import { findPreset } from './presets';
import { buildSummary } from './summary';

const lean = findPreset('lean')?.scenario as Scenario;

describe('buildSummary', () => {
  it('fills in the identity, the usable figure with its percentage, and the largest draw', () => {
    const summary = buildSummary(lean, null);

    expect(summary).toContain('usable evidence budget = context capacity');
    expect(summary).toContain('− trusted instructions (18K)');
    expect(summary).toContain('− exposed tool definitions (0)');
    expect(summary).toContain('= 810K');
    expect(summary).toContain('Usable: 810K (81.0% of the window)');
    expect(summary).toContain(
      'Largest single draw: operational margin (100K, 10.0% of the window)',
    );
    expect(summary).toContain('planning arithmetic');
  });

  it('says how far over an over-committed scenario is', () => {
    const summary = buildSummary({ ...lean, history: 900_000 }, null);

    expect(summary).toContain('= −50K');
    expect(summary).toContain('The claims exceed the window by 50K');
  });

  it('adds the evidence with a count and a total, and never a path', () => {
    const summary = buildSummary(lean, { tokens: 412_000, fileCount: 3, charactersPerToken: 4 });

    expect(summary).toContain(
      'Evidence: about 412K across 3 files at 4 characters per token, fits with 398K to spare',
    );
  });

  it('says when the evidence is over', () => {
    const deep = findPreset('deep')?.scenario as Scenario;
    const summary = buildSummary(deep, { tokens: 200_000, fileCount: 1, charactersPerToken: 4 });

    expect(summary).toContain('over by 27K');
    expect(summary).toContain('1 file at');
  });

  it('leaves the evidence line out when there are no files', () => {
    expect(buildSummary(lean, { tokens: 0, fileCount: 0, charactersPerToken: 4 })).not.toContain(
      'Evidence',
    );
  });
});
