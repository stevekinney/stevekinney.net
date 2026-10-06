import { describe, expect, it } from 'vitest';

import {
  clampVersion,
  compareVersions,
  defaultRange,
  findVersion,
  formatVersion,
  isInRange,
  isValidRange,
  MAXIMUM_RANGE_LENGTH,
  parseVersion,
  rangeLength,
  v,
  versionsIn,
} from './versions';

describe('parseVersion', () => {
  it('reads x.y.z with an optional leading v', () => {
    expect(parseVersion('2.1.278')).toEqual(v(278));
    expect(parseVersion(' v2.1.5 ')).toEqual(v(5));
  });

  it('rejects anything else', () => {
    expect(parseVersion('2.1')).toBeNull();
    expect(parseVersion('latest')).toBeNull();
    expect(parseVersion('2.1.x')).toBeNull();
  });
});

describe('findVersion', () => {
  it('finds the version in claude --version output', () => {
    expect(findVersion('2.1.289 (Claude Code)')).toEqual(v(289));
  });
});

describe('comparison', () => {
  it('orders versions numerically, not as text', () => {
    expect(compareVersions(v(9), v(10))).toBeLessThan(0);
    expect(compareVersions({ major: 2, minor: 2, patch: 0 }, v(999))).toBeGreaterThan(0);
    expect(compareVersions(v(250), v(250))).toBe(0);
  });
});

describe('ranges', () => {
  it('covers 2.1.190 through 2.1.289 by default', () => {
    expect(formatVersion(defaultRange.first)).toBe('2.1.190');
    expect(formatVersion(defaultRange.last)).toBe('2.1.289');
    expect(rangeLength(defaultRange)).toBe(100);
    expect(versionsIn(defaultRange)).toHaveLength(100);
  });

  it('clamps a version outside the range', () => {
    expect(clampVersion(v(100), defaultRange)).toEqual(v(190));
    expect(clampVersion(v(400), defaultRange)).toEqual(v(289));
    expect(clampVersion({ major: 3, minor: 0, patch: 0 }, defaultRange)).toEqual(v(289));
    expect(isInRange(v(278), defaultRange)).toBe(true);
    expect(isInRange(v(290), defaultRange)).toBe(false);
  });

  it('only accepts a range inside one minor line with at least two versions', () => {
    expect(isValidRange({ first: v(190), last: v(289) })).toBe(true);
    expect(isValidRange({ first: v(190), last: v(190) })).toBe(false);
    expect(isValidRange({ first: v(190), last: { major: 2, minor: 2, patch: 5 } })).toBe(false);
  });

  it('rejects a range too wide to resolve, such as one from a hand-edited link', () => {
    expect(isValidRange({ first: v(0), last: v(MAXIMUM_RANGE_LENGTH - 1) })).toBe(true);
    expect(isValidRange({ first: v(0), last: v(MAXIMUM_RANGE_LENGTH) })).toBe(false);
    expect(isValidRange({ first: v(0), last: v(9_999_999_999) })).toBe(false);
  });
});
