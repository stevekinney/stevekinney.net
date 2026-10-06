import { describe, expect, it } from 'vitest';

import { CONCURRENCY_LIMIT, nesting } from './nesting';

describe('acceptance check 5: nesting', () => {
  it('gives 4 + 16 + 64 = 84 workers for 4 children across 3 layers', () => {
    expect(nesting(4, 3)).toEqual({
      perLayer: [4, 16, 64],
      total: 84,
      overLimit: 64,
      deeperThanDefault: false,
    });
  });

  it('holds 20 subagents at once', () => {
    expect(CONCURRENCY_LIMIT).toBe(20);
    expect(nesting(4, 2)).toMatchObject({ total: 20, overLimit: 0 });
  });

  it('flags a tree deeper than the default three layers', () => {
    expect(nesting(2, 4)).toMatchObject({ total: 30, deeperThanDefault: true });
  });

  it('holds its inputs to whole numbers in range', () => {
    expect(nesting(0, 0)).toMatchObject({ perLayer: [1], total: 1 });
    expect(nesting(3.4, Number.NaN)).toMatchObject({ perLayer: [3], total: 3 });
  });
});
