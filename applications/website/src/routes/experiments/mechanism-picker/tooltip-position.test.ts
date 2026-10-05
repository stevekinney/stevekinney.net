import { describe, expect, it } from 'vitest';

import { placeTooltip } from './tooltip-position';

describe('placeTooltip', () => {
  it('centers the tooltip under its anchor when it fits', () => {
    expect(placeTooltip(200, 100, 400)).toBe(150);
  });

  it('holds it inside the left edge', () => {
    expect(placeTooltip(10, 100, 400)).toBe(0);
  });

  it('holds it inside the right edge', () => {
    expect(placeTooltip(390, 100, 400)).toBe(300);
  });

  it('starts a tooltip wider than its container at the left edge', () => {
    expect(placeTooltip(100, 500, 328)).toBe(0);
  });
});
