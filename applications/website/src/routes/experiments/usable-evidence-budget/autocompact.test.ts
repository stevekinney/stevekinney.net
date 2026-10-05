import { describe, expect, it } from 'vitest';

import {
  formatThresholdPercent,
  marginForCapacity,
  marginFromPercent,
  marginFromThreshold,
  marginShareOf,
  parsePercent,
  thresholdPercent,
  thresholdTokens,
} from './autocompact';

describe('autocompact threshold', () => {
  it('sets margin to the capacity minus the threshold', () => {
    expect(marginFromThreshold(1_000_000, 900_000)).toBe(100_000);
    expect(thresholdTokens(1_000_000, 100_000)).toBe(900_000);
  });

  it('sets margin from a percentage: 90% on 1M is 100K', () => {
    expect(marginFromPercent(1_000_000, 90)).toBe(100_000);
    expect(thresholdPercent(1_000_000, 100_000)).toBe(90);
  });

  it('keeps 90% when the window shrinks to 200K, which leaves a 20K margin', () => {
    const share = marginShareOf(1_000_000, 100_000);

    expect(marginForCapacity(200_000, share)).toBe(20_000);
    expect(thresholdPercent(200_000, 20_000)).toBe(90);
  });

  it('keeps the percentage across custom windows', () => {
    const share = marginShareOf(1_000_000, 100_000);

    expect(marginForCapacity(400_000, share)).toBe(40_000);
    expect(marginForCapacity(2_000_000, share)).toBe(200_000);
  });

  it('rejects a threshold outside the window', () => {
    expect(marginFromThreshold(1_000_000, 1_000_001)).toBeNull();
    expect(marginFromThreshold(1_000_000, -1)).toBeNull();
    expect(marginFromPercent(1_000_000, 101)).toBeNull();
  });

  it('allows a threshold at either end of the window', () => {
    expect(marginFromThreshold(1_000_000, 1_000_000)).toBe(0);
    expect(marginFromPercent(1_000_000, 0)).toBe(1_000_000);
  });

  it('has no share for an empty window', () => {
    expect(marginShareOf(0, 10)).toBe(0);
    expect(thresholdPercent(0, 10)).toBe(0);
  });
});

describe('parsePercent', () => {
  it('reads numbers with or without a percent sign', () => {
    expect(parsePercent('90')).toBe(90);
    expect(parsePercent('90%')).toBe(90);
    expect(parsePercent(' 87.5 % ')).toBe(87.5);
  });

  it('rejects anything else', () => {
    expect(parsePercent('')).toBeNull();
    expect(parsePercent('ninety')).toBeNull();
    expect(parsePercent('-5')).toBeNull();
  });

  it('formats without trailing zeros', () => {
    expect(formatThresholdPercent(90)).toBe('90');
    expect(formatThresholdPercent(87.54)).toBe('87.5');
  });
});
