import { describe, expect, it } from 'vitest';

import { clampLaterAfter, summaryNote } from './scenario';

describe('summaryNote', () => {
  it('stays quiet when the summary is smaller than both', () => {
    expect(summaryNote(400_000, 5, 25_000)).toBeNull();
  });

  it('flags a summary larger than the re-read', () => {
    expect(summaryNote(400_000, 10, 25_000)).toBe(
      'A 40K summary is larger than the 25K you’d re-read after a clear.',
    );
  });

  it('flags a summary as large as the context', () => {
    expect(summaryNote(10_000, 100, 25_000)).toContain('as large as your context');
  });
});

describe('clampLaterAfter', () => {
  it('keeps k between 1 and one fewer than T', () => {
    expect(clampLaterAfter(0, 30)).toBe(1);
    expect(clampLaterAfter(50, 30)).toBe(29);
    expect(clampLaterAfter(7.6, 30)).toBe(8);
    expect(clampLaterAfter(5, 1)).toBe(1);
  });
});
