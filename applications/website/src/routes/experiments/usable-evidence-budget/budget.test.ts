import { describe, expect, it } from 'vitest';

import { formatTokens, segments, usable } from './budget';
import { presets, toolSearchComparison } from './presets';

describe('the presets', () => {
  it.each([
    ['lean', '810K'],
    ['mcp-heavy', '603K'],
    ['tool-search', '775K'],
    ['deep', '173K'],
    ['small-window', '24K'],
  ])('%s leaves %s free', (id, free) => {
    const preset = presets.find((candidate) => candidate.id === id);

    expect(formatTokens(usable(preset!.scenario))).toBe(free);
  });

  it('turning tool search on returns 172K, about 17% of the window', () => {
    const change = usable(toolSearchComparison.on) - usable(toolSearchComparison.off);

    expect(change).toBe(172_000);
    expect(Math.round((change / toolSearchComparison.on.capacity) * 100)).toBe(17);
  });
});

describe('segments', () => {
  it('runs left to right and fills the whole bar', () => {
    const parts = segments(presets[1].scenario);

    expect(parts.map((part) => part.key)).toEqual([
      'instructions',
      'tools',
      'history',
      'generation',
      'margin',
      'free',
    ]);
    expect(parts.reduce((total, part) => total + part.percent, 0)).toBeCloseTo(100);
    expect(parts.find((part) => part.key === 'tools')?.percent).toBeCloseTo(18);
  });

  it('leaves out a term of zero', () => {
    expect(segments(presets[0].scenario).some((part) => part.key === 'tools')).toBe(false);
  });

  it('has no free segment when the claims exceed the window, and still fills the bar', () => {
    const parts = segments({
      capacity: 200_000,
      instructions: 20_000,
      tools: 40_000,
      history: 200_000,
      generation: 16_000,
      margin: 20_000,
    });

    expect(parts.some((part) => part.key === 'free')).toBe(false);
    expect(parts.reduce((total, part) => total + part.percent, 0)).toBeCloseTo(100);
  });
});
