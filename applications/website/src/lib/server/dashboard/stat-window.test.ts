import { describe, expect, it } from 'vitest';

import { lastYearWindow } from './stat-window';

describe('lastYearWindow', () => {
  it('starts exactly one calendar year before an ordinary date', () => {
    const window = lastYearWindow(new Date('2026-07-20T12:34:56.000Z'));

    expect(window.from).toBe('2025-07-20T12:34:56.000Z');
    expect(window.to).toBe('2026-07-20T12:34:56.000Z');
  });

  it('clamps a leap-day start to the last day of February instead of rolling into March', () => {
    const window = lastYearWindow(new Date('2028-02-29T12:00:00.000Z'));

    expect(window.from).toBe('2027-02-28T12:00:00.000Z');
    expect(window.to).toBe('2028-02-29T12:00:00.000Z');
  });
});
