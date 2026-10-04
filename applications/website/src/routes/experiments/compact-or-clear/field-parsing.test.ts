import { describe, expect, it } from 'vitest';

import {
  formatPercent,
  formatSummary,
  parseDecimalField,
  parseSummaryField,
  parseTokenField,
  parseTurnsField,
  sliderPosition,
} from './field-parsing';
import { ranges } from './scenario';

describe('parseTokenField', () => {
  it('accepts 400k, 1m, and 1,000,000', () => {
    expect(parseTokenField('400k', ranges.contextNow)).toBe(400_000);
    expect(parseTokenField('1m', ranges.contextNow)).toBe(1_000_000);
    expect(parseTokenField('1,000,000', ranges.contextNow)).toBe(1_000_000);
  });

  it('holds a value to the box’s limits and rejects what it cannot read', () => {
    expect(parseTokenField('900m', ranges.contextNow)).toBe(10_000_000);
    expect(parseTokenField('5', ranges.contextNow)).toBe(1_000);
    expect(parseTokenField('lots', ranges.contextNow)).toBeNull();
    expect(parseTokenField('', ranges.reread)).toBe(0);
  });
});

describe('parseTurnsField', () => {
  it('accepts whole numbers up to 500', () => {
    expect(parseTurnsField('30')).toBe(30);
    expect(parseTurnsField('500')).toBe(500);
    expect(parseTurnsField('9,000')).toBe(500);
    expect(parseTurnsField('0')).toBe(1);
  });

  it('rejects anything else', () => {
    expect(parseTurnsField('2.5')).toBeNull();
    expect(parseTurnsField('ten')).toBeNull();
    expect(parseTurnsField('')).toBeNull();
  });
});

describe('parseDecimalField', () => {
  it('accepts decimals within the limits', () => {
    expect(parseDecimalField('3.5', ranges.charsPerToken)).toBe(3.5);
    expect(parseDecimalField('0.2', ranges.charsPerToken)).toBe(1);
    expect(parseDecimalField('x', ranges.charsPerToken)).toBeNull();
  });
});

describe('parseSummaryField', () => {
  it('takes a percentage', () => {
    expect(parseSummaryField('5', 400_000)).toBe(5);
    expect(parseSummaryField('5%', 400_000)).toBe(5);
    expect(parseSummaryField('4.1', 400_000)).toBe(4.1);
  });

  it('takes a token count over 100 and turns it into a percentage of the context', () => {
    expect(parseSummaryField('20000', 400_000)).toBe(5);
    expect(parseSummaryField('20k', 400_000)).toBe(5);
    expect(parseSummaryField('13,000', 312_000)).toBe(4.2);
  });

  it('treats a number just over 100 as tokens, not a percentage', () => {
    expect(parseSummaryField('100', 400_000)).toBe(90);
    expect(parseSummaryField('500', 400_000)).toBe(1);
    expect(parseSummaryField('101', 400_000)).toBe(1);
  });

  it('reads back its own display, such as 20K (5%)', () => {
    expect(parseSummaryField('20K (5%)', 400_000)).toBe(5);
    expect(parseSummaryField('13K (4.1%)', 312_000)).toBe(4.1);
  });

  it('clamps to 1 through 90', () => {
    expect(parseSummaryField('0', 400_000)).toBe(1);
    expect(parseSummaryField('150%', 400_000)).toBe(90);
    expect(parseSummaryField('1m', 400_000)).toBe(90);
    expect(parseSummaryField('50', 400_000)).toBe(50);
  });

  it('rejects what it cannot read', () => {
    expect(parseSummaryField('big', 400_000)).toBeNull();
    expect(parseSummaryField('', 400_000)).toBeNull();
  });
});

describe('display', () => {
  it('shows the summary as 20K (5%)', () => {
    expect(formatSummary(20_000, 5)).toBe('20K (5%)');
    expect(formatSummary(12_969, 4.1)).toBe('13K (4.1%)');
    expect(formatPercent(4.147)).toBe('4.1%');
  });

  it('rests a slider at its nearest end for a value outside its range', () => {
    expect(sliderPosition(ranges.summaryPercent, 45)).toBe(30);
    expect(sliderPosition(ranges.turns, 500)).toBe(120);
    expect(sliderPosition(ranges.contextNow, 1_000)).toBe(20_000);
    expect(sliderPosition(ranges.contextNow, 400_000)).toBe(400_000);
  });
});
