import { describe, expect, it } from 'vitest';

import { formatTokens } from './format-tokens';

describe('formatTokens', () => {
  it.each([
    [0, '0'],
    [850, '850'],
    [1_000, '1K'],
    [12_969, '13K'],
    [18_863, '18.9K'],
    [20_000, '20K'],
    [312_693, '313K'],
    [400_000, '400K'],
    [999_600, '1M'],
    [1_000_000, '1M'],
    [1_250_000, '1.25M'],
    [2_201_551, '2.2M'],
  ])('writes %i as %s', (count, text) => {
    expect(formatTokens(count)).toBe(text);
  });
});
