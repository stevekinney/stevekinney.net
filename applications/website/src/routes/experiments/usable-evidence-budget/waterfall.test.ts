import { describe, expect, it } from 'vitest';

import type { Scenario } from './budget';
import { findPreset } from './presets';
import { buildAxis, describeColumn, layoutWaterfall, splitEvidence, wrapLabel } from './waterfall';

const preset = (id: string): Scenario => ({ ...(findPreset(id)?.scenario as Scenario) });

describe('wrapLabel', () => {
  it('wraps at about 13 characters per line', () => {
    expect(wrapLabel('Context capacity')).toEqual(['Context', 'capacity']);
    expect(wrapLabel('Exposed tool definitions')).toEqual(['Exposed tool', 'definitions']);
    expect(wrapLabel('Task and retained history')).toEqual(['Task and', 'retained', 'history']);
    expect(wrapLabel('Reserved generation')).toEqual(['Reserved', 'generation']);
  });

  it('never uses more than three lines', () => {
    const lines = wrapLabel('one two three four five six seven eight nine ten');

    expect(lines).toHaveLength(3);
    expect(lines.at(-1)?.endsWith('…')).toBe(true);
  });

  it('keeps a long word on a line of its own', () => {
    expect(wrapLabel('Supercalifragilistic word')).toEqual(['Supercalifragilistic', 'word']);
  });
});

describe('buildAxis', () => {
  it('draws exactly five gridlines from zero to the capacity when nothing is negative', () => {
    const axis = buildAxis(1_000_000, 0);

    expect(axis.ticks.map((tick) => tick.value)).toEqual([0, 250_000, 500_000, 750_000, 1_000_000]);
    expect(axis.ticks.map((tick) => tick.label)).toEqual(['0', '250K', '500K', '750K', '1M']);
    expect(axis.hasNegative).toBe(false);
    expect(axis.min).toBe(0);
  });

  it('extends below zero in whole steps and keeps zero where it belongs', () => {
    const axis = buildAxis(1_000_000, -50_000);

    expect(axis.hasNegative).toBe(true);
    expect(axis.min).toBe(-250_000);
    expect(axis.y(0)).toBeLessThan(axis.y(-250_000));
    expect(axis.zeroY).toBe(axis.y(0));
    expect(axis.ticks.map((tick) => tick.label)).toContain('−250K');
  });

  it('widens the steps when a term is far larger than the window', () => {
    const axis = buildAxis(200_000, -5_000_000);
    const negatives = axis.ticks.filter((tick) => tick.value < 0);

    expect(negatives.length).toBeLessThanOrEqual(8);
    expect(axis.min).toBeLessThanOrEqual(-5_000_000);
    expect(axis.ticks.at(-1)?.value).toBe(200_000);
  });

  it('puts the capacity at the top of the plot', () => {
    const axis = buildAxis(200_000, 0);

    expect(axis.y(200_000)).toBeLessThan(axis.y(100_000));
    expect(axis.y(100_000)).toBeLessThan(axis.y(0));
  });
});

describe('layoutWaterfall', () => {
  it('draws seven columns, from capacity down to usable', () => {
    const chart = layoutWaterfall(preset('lean'), null, null);

    expect(chart.columns.map((column) => column.key)).toEqual([
      'capacity',
      'instructions',
      'history',
      'tools',
      'generation',
      'margin',
      'usable',
    ]);
    expect(chart.columns.map((column) => column.valueLabel)).toEqual([
      '1M',
      '−18K',
      '−40K',
      '0',
      '−32K',
      '−100K',
      '810K',
    ]);
  });

  it('floats each draw from the running total down', () => {
    const chart = layoutWaterfall(preset('lean'), null, null);
    const [capacity, instructions, history] = chart.columns;

    expect(capacity.high).toBe(1_000_000);
    expect(instructions.high).toBe(1_000_000);
    expect(instructions.low).toBe(982_000);
    expect(history.high).toBe(982_000);
    expect(history.low).toBe(942_000);
    expect(chart.columns.at(-1)).toMatchObject({ high: 810_000, low: 0, over: false });
  });

  it('draws bars in proportion to their values', () => {
    const chart = layoutWaterfall(preset('lean'), null, null);
    const capacity = chart.columns[0].rect;
    const usable = chart.columns[6].rect;

    expect(usable.height / capacity.height).toBeCloseTo(0.81, 2);
  });

  it('joins each bar to the next with a connector at the running total', () => {
    const chart = layoutWaterfall(preset('lean'), null, null);

    expect(chart.connectors).toHaveLength(6);
    expect(chart.connectors[0].y).toBeCloseTo(chart.columns[0].rect.y, 5);
    expect(chart.connectors[5].y).toBeCloseTo(chart.columns[6].rect.y, 5);
    for (const [index, connector] of chart.connectors.entries()) {
      expect(connector.x1).toBeCloseTo(
        chart.columns[index].rect.x + chart.columns[index].rect.width,
        5,
      );
      expect(connector.x2).toBeCloseTo(chart.columns[index + 1].rect.x, 5);
    }
  });

  it('shows a zero draw as a thin line rather than nothing', () => {
    const chart = layoutWaterfall(preset('lean'), null, null);

    expect(chart.columns[3].rect.height).toBeGreaterThan(0);
  });

  it('draws a negative usable bar below the zero line and extends the axis', () => {
    const chart = layoutWaterfall({ ...preset('lean'), history: 900_000 }, null, null);
    const usableColumn = chart.columns[6];

    expect(chart.axis.hasNegative).toBe(true);
    expect(usableColumn.over).toBe(true);
    expect(usableColumn.valueLabel).toBe('−50K');
    expect(usableColumn.rect.y).toBeCloseTo(chart.axis.zeroY, 5);
    expect(usableColumn.rect.y + usableColumn.rect.height).toBeGreaterThan(chart.axis.zeroY);
    expect(usableColumn.rect.y + usableColumn.rect.height).toBeCloseTo(chart.axis.y(-50_000), 5);
  });

  it('extends below zero when the window shrinks to 200K under terms that no longer fit', () => {
    const chart = layoutWaterfall(
      { ...preset('deep'), capacity: 200_000, margin: 30_000 },
      null,
      null,
    );

    expect(chart.axis.hasNegative).toBe(true);
    expect(chart.columns[6].over).toBe(true);
  });

  it('treats usable of exactly zero as over, with no bar height to speak of', () => {
    const chart = layoutWaterfall({ ...preset('lean'), history: 850_000 }, null, null);

    expect(chart.columns[6].over).toBe(true);
    expect(chart.axis.hasNegative).toBe(false);
  });

  it('draws the pinned scenario as ghost bars on the same scale', () => {
    const chart = layoutWaterfall(preset('tool-search'), preset('mcp-heavy'), null);

    expect(chart.ghosts).toHaveLength(7);
    expect(chart.ghosts?.[6].height).toBeLessThan(chart.columns[6].rect.height);
    expect(chart.ghosts?.[3].height).toBeGreaterThan(chart.columns[3].rect.height);
  });

  it('puts the larger window on the axis when the pin is bigger than the current scenario', () => {
    const chart = layoutWaterfall(preset('small-window'), preset('lean'), null);

    expect(chart.axis.max).toBe(1_000_000);
  });

  it('stacks the evidence that fits inside the usable bar', () => {
    const chart = layoutWaterfall(preset('deep'), null, 100_000);

    expect(chart.evidenceOverflow).toBeNull();
    expect(chart.evidenceFit).not.toBeNull();
    expect(chart.evidenceFit!.height / chart.columns[6].rect.height).toBeCloseTo(100 / 173, 2);
  });

  it('draws evidence beyond usable past zero, and extends the axis to hold it', () => {
    const chart = layoutWaterfall(preset('deep'), null, 200_000);

    expect(chart.evidenceFit!.height).toBeCloseTo(chart.columns[6].rect.height, 5);
    expect(chart.evidenceOverflow).not.toBeNull();
    expect(chart.evidenceOverflow!.y).toBeCloseTo(chart.axis.zeroY, 5);
    expect(chart.axis.hasNegative).toBe(true);
    expect(chart.evidenceOverflow!.y + chart.evidenceOverflow!.height).toBeLessThanOrEqual(
      chart.axis.y(chart.axis.min) + 0.001,
    );
  });

  it('draws all the evidence as overflow when nothing is usable', () => {
    const chart = layoutWaterfall({ ...preset('lean'), history: 900_000 }, null, 100_000);

    expect(chart.evidenceFit).toBeNull();
    expect(chart.evidenceOverflow).not.toBeNull();
    expect(chart.evidenceOverflow!.y).toBeCloseTo(chart.axis.y(-50_000), 5);
    expect(chart.axis.min).toBeLessThanOrEqual(-150_000);
  });
});

describe('splitEvidence', () => {
  it('splits at the usable budget', () => {
    expect(splitEvidence(100, 173)).toEqual({ fitted: 100, overflow: 0 });
    expect(splitEvidence(200, 173)).toEqual({ fitted: 173, overflow: 27 });
    expect(splitEvidence(100, -50)).toEqual({ fitted: 0, overflow: 100 });
  });
});

describe('describeColumn', () => {
  it('says a draw’s term, value, share of the window, and meaning', () => {
    expect(describeColumn('tools', preset('mcp-heavy'))).toEqual({
      title: 'Exposed tool definitions',
      value: '180K',
      share: '18.0% of the window',
      description: 'Tool schemas loaded into the prefix.',
    });
  });

  it('describes the capacity and usable columns', () => {
    expect(describeColumn('capacity', preset('lean'))).toMatchObject({
      value: '1M',
      share: '100.0% of the window',
    });
    expect(describeColumn('usable', preset('lean'))).toMatchObject({
      title: 'Usable evidence budget',
      value: '810K',
      share: '81.0% of the window',
    });
  });
});
