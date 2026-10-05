import { describe, expect, it } from 'vitest';

import {
  parseFractionField,
  parseNumberField,
  parseTokenField,
  parseWholeField,
} from './field-parsing';
import { ranges } from './scenario';

describe('field parsing', () => {
  it('reads token counts with shorthand and grouping, and empty as zero', () => {
    expect(parseTokenField('50k', ranges.sharedTokens)).toBe(50_000);
    expect(parseTokenField('1,000,000', ranges.sharedTokens)).toBe(1_000_000);
    expect(parseTokenField('9M', ranges.sharedTokens)).toBe(1_000_000);
    expect(parseTokenField('', ranges.uniqueTokens)).toBe(0);
    expect(parseTokenField('lots', ranges.uniqueTokens)).toBeNull();
  });

  it('lets a measured spawn overhead sit outside the slider’s 7.5K–44K', () => {
    expect(parseTokenField('70k', ranges.spawnTokens)).toBe(70_000);
    expect(parseTokenField('0', ranges.spawnTokens)).toBe(0);
  });

  it('reads the serial fraction as a fraction or a percentage', () => {
    expect(parseFractionField('0.4', ranges.serialFraction)).toBe(0.4);
    expect(parseFractionField('40%', ranges.serialFraction)).toBe(0.4);
    expect(parseFractionField('40', ranges.serialFraction)).toBe(0.4);
    expect(parseFractionField('1', ranges.serialFraction)).toBe(1);
    expect(parseFractionField('150%', ranges.serialFraction)).toBe(1);
    expect(parseFractionField('', ranges.serialFraction)).toBe(0);
    expect(parseFractionField('most', ranges.serialFraction)).toBeNull();
  });

  it('reads minutes, multipliers, and whole worker counts', () => {
    expect(parseNumberField('60 min', ranges.soloMinutes)).toBe(60);
    expect(parseNumberField('', ranges.soloMinutes)).toBe(0);
    expect(parseNumberField('3.5×', ranges.teamMultiplier)).toBe(3.5);
    expect(parseNumberField('900', ranges.soloMinutes)).toBe(600);
    expect(parseWholeField('4.4', ranges.workers)).toBe(4);
    expect(parseWholeField('', ranges.workers)).toBe(1);
    expect(parseWholeField('40', ranges.workers)).toBe(32);
  });
});
