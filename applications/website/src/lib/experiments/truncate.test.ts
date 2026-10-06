import { describe, expect, it } from 'vitest';

import { countCharacters, truncateCharacters } from './truncate';

describe('truncateCharacters', () => {
  it('cuts by code point, so an emoji at the cut stays whole', () => {
    expect(truncateCharacters(`${'a'.repeat(59)}😀b`, 60)).toBe(`${'a'.repeat(59)}😀`);
  });

  it('trims before and after cutting', () => {
    expect(truncateCharacters(`  ${'a'.repeat(59)} b`, 60)).toBe('a'.repeat(59));
  });
});

describe('countCharacters', () => {
  it('counts an emoji once', () => {
    expect(countCharacters(`${'a'.repeat(59)}😀`)).toBe(60);
  });
});
