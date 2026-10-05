import { describe, expect, it } from 'vitest';

import { parseContextReadout } from './context-readout';

describe('parseContextReadout', () => {
  it('reads the interactive form', () => {
    expect(parseContextReadout('312k/1000k tokens')).toMatchObject({
      used: 312_000,
      limit: 1_000_000,
    });
    expect(parseContextReadout('claude-opus-5 · 312k/1000k tokens (31%)')?.used).toBe(312_000);
  });

  it('reads the print form with spaces around the slash and a lowercase m', () => {
    expect(parseContextReadout('**Tokens:** 35.5k / 1m (4%)')).toMatchObject({
      used: 35_500,
      limit: 1_000_000,
    });
    expect(parseContextReadout('Tokens: 35.5k / 200k')?.used).toBe(35_500);
  });

  it('takes the first pair when there are several', () => {
    const text = '## Context Usage\n**Tokens:** 35.5k / 1m (4%)\n\nlater: 900k/1000k tokens';

    expect(parseContextReadout(text)?.used).toBe(35_500);
  });

  it('reads grouped digits and plain counts', () => {
    expect(parseContextReadout('312,450 / 1,000,000 tokens')?.used).toBe(312_450);
  });

  it('ignores pairs that are not token counts', () => {
    expect(parseContextReadout('Merged on 3/4 of the files')).toBeNull();
    expect(parseContextReadout('12/31 tasks done')).toBeNull();
    expect(parseContextReadout('')).toBeNull();
  });

  it('ignores a readout whose usage exceeds its window', () => {
    expect(parseContextReadout('1000k/312k tokens')).toBeNull();
  });
});
