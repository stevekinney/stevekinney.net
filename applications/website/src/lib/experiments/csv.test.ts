import { describe, expect, it } from 'vitest';

import { csvCell } from './csv';

describe('csvCell', () => {
  it('defuses a string a spreadsheet would run as a formula', () => {
    expect(['=1+1', '+1', '-1', '@A1', '\tx'].map(csvCell)).toEqual([
      "'=1+1",
      "'+1",
      "'-1",
      "'@A1",
      "'\tx",
    ]);
    expect(csvCell('\rx')).toBe('"\'\rx"');
  });

  it('leaves numbers alone and quotes commas, quotes, and line breaks', () => {
    expect(csvCell(-1.5)).toBe('-1.5');
    expect(csvCell(null)).toBe('');
    expect(csvCell('a, "b"')).toBe('"a, ""b"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });
});
