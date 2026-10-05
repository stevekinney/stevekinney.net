import { describe, expect, test } from 'vitest';
import { centerTooltip, placeTooltip } from './tooltip-position';

describe('placeTooltip', () => {
  test('puts the tooltip to the right of the anchor when it fits', () => {
    expect(placeTooltip(40, 100, 320, 12)).toBe(52);
  });

  test('flips to the left of the anchor when the right side would overflow', () => {
    expect(placeTooltip(200, 160, 320, 12)).toBe(28);
  });

  test('keeps a mid-plot tooltip inside the container on a narrow screen', () => {
    // The case that scrolled the page sideways: anchor near the middle, tooltip about 256 wide.
    for (let anchor = 0; anchor <= 328; anchor += 4) {
      const left = placeTooltip(anchor, 256, 328, 14);

      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + 256).toBeLessThanOrEqual(328);
    }
  });

  test('never returns a negative edge, even when the tooltip is wider than the container', () => {
    expect(placeTooltip(100, 400, 300, 12)).toBe(0);
  });

  test('treats a tooltip that has not been measured yet as zero wide', () => {
    expect(placeTooltip(100, 0, 300, 12)).toBe(112);
  });

  test('stays between the insets so it clears the axis labels', () => {
    const inset = { left: 56, right: 14 };

    for (let anchor = 0; anchor <= 328; anchor += 4) {
      const left = placeTooltip(anchor, 200, 328, 12, inset);

      expect(left).toBeGreaterThanOrEqual(56);
      expect(left + 200).toBeLessThanOrEqual(328 - 14);
    }
  });

  test('flips to the left of the anchor when the right inset would be crossed', () => {
    // 150 + 12 + 100 = 262 fits in 300, but not inside the 300 - 60 = 240 boundary.
    expect(placeTooltip(150, 100, 300, 12, { left: 0, right: 60 })).toBe(38);
  });

  test('pins to the left inset when the tooltip is wider than the room between the insets', () => {
    expect(placeTooltip(100, 400, 300, 12, { left: 40, right: 20 })).toBe(40);
  });
});

describe('centerTooltip', () => {
  test('centers under the anchor when there is room', () => {
    expect(centerTooltip(150, 100, 300)).toBe(100);
  });

  test('holds the tooltip inside the container at either edge', () => {
    expect(centerTooltip(10, 100, 300)).toBe(0);
    expect(centerTooltip(295, 100, 300)).toBe(200);
    expect(centerTooltip(50, 400, 300)).toBe(0);
  });
});
