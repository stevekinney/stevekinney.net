import { describe, expect, it } from 'vitest';

import { evaluateChange } from './calculate';
import type { ChangeInputs } from './calculate';
import { formatTokens } from './display';
import { defaultPricing, findEffort, findModel } from './pricing';
import {
  MAP_COLUMNS,
  MAP_MAX,
  MAP_MIN,
  MAP_ROWS,
  boundarySegment,
  buildMapCells,
  cellCenter,
  cellIntensity,
  describeBoundary,
  describeCell,
  logPosition,
  roundToSignificantDigits,
  valueAtLogPosition,
} from './sensitivity';

const model = (id: string) => findModel(defaultPricing, id)!;
const effort = (id: string) => findEffort(defaultPricing, id)!;

const defaults: ChangeInputs = {
  from: model('opus-5'),
  fromEffort: effort('high'),
  to: model('sonnet-5'),
  toEffort: effort('high'),
  ttl: '1h',
  contextTokens: 500_000,
  remainingOutput: 150_000,
  ratioOverride: null,
};

const evaluation = evaluateChange(defaults);

describe('the log axis', () => {
  it('maps 1K to 0 and 10M to 1', () => {
    expect(logPosition(MAP_MIN)).toBe(0);
    expect(logPosition(MAP_MAX)).toBeCloseTo(1, 12);
    expect(logPosition(100_000)).toBeCloseTo(0.5, 12);
    expect(logPosition(50_000_000)).toBe(1);
    expect(logPosition(0)).toBe(0);
  });

  it('round-trips', () => {
    expect(valueAtLogPosition(logPosition(312_000))).toBeCloseTo(312_000, 4);
  });

  it('rounds to three significant digits', () => {
    expect(roundToSignificantDigits(311_874)).toBe(312_000);
    expect(roundToSignificantDigits(1_234)).toBe(1_230);
    expect(roundToSignificantDigits(0)).toBe(0);
  });
});

describe('buildMapCells', () => {
  const cells = buildMapCells(evaluation);

  it('has a cell for every column and row', () => {
    expect(cells).toHaveLength(MAP_COLUMNS * MAP_ROWS);
  });

  it('computes each cell’s net from its center', () => {
    const { context, output } = cellCenter(10, 5);
    const cell = cells.find((candidate) => candidate.column === 10 && candidate.row === 5)!;

    expect(cell.contextTokens).toBeCloseTo(context, 6);
    expect(cell.net).toBeCloseTo(output * 15e-6 - context * 4e-6, 8);
  });

  it('puts more remaining work toward the top and more context toward the right', () => {
    const topRight = cells.find((cell) => cell.column === MAP_COLUMNS - 1 && cell.row === 0)!;
    const bottomLeft = cells.find((cell) => cell.column === 0 && cell.row === MAP_ROWS - 1)!;

    expect(topRight.remainingOutput).toBeGreaterThan(bottomLeft.remainingOutput);
    expect(topRight.contextTokens).toBeGreaterThan(bottomLeft.contextTokens);
  });
});

describe('cellIntensity', () => {
  it('is zero at zero and grows with the size of the net in either direction', () => {
    expect(cellIntensity(0)).toBe(0);
    expect(cellIntensity(0.05)).toBeGreaterThan(0);
    expect(cellIntensity(5)).toBeGreaterThan(cellIntensity(0.05));
    expect(cellIntensity(-5)).toBe(cellIntensity(5));
    expect(cellIntensity(1_000_000)).toBe(1);
  });
});

describe('the boundary', () => {
  it('states the slope in words', () => {
    expect(describeBoundary(evaluation)).toBe('Pays back whenever R ≥ 0.27 × N.');
  });

  it('says so when a change never pays back or changes nothing', () => {
    const upgrade = evaluateChange({ ...defaults, from: model('sonnet-5'), to: model('opus-5') });

    expect(describeBoundary(upgrade)).toMatch(/never pays back/);
    expect(describeBoundary(evaluateChange({ ...defaults, to: model('opus-5') }))).toMatch(
      /Nothing is changing/,
    );
  });

  it('runs the line from remaining work equals the coefficient times context', () => {
    const segment = boundarySegment(evaluation)!;

    expect(segment.from.output / segment.from.context).toBeCloseTo(4 / 15, 10);
    expect(segment.to.output / segment.to.context).toBeCloseTo(4 / 15, 10);
    expect(segment.from.output).toBeGreaterThanOrEqual(MAP_MIN - 1e-6);
    expect(segment.to.output).toBeLessThanOrEqual(MAP_MAX + 1e-6);
  });

  it('has no segment when the line is off the map or does not exist', () => {
    const upgrade = evaluateChange({ ...defaults, from: model('sonnet-5'), to: model('opus-5') });
    const offMap = evaluateChange({ ...defaults, from: { ...model('opus-5'), output: 1e9 } });

    expect(boundarySegment(upgrade)).toBeNull();
    expect(boundarySegment(offMap)).toBeNull();
  });
});

describe('describeCell', () => {
  it('names the standing in words, not only color', () => {
    expect(describeCell(312_000, 150_000, 0.25, formatTokens)).toBe(
      'N 312K · R 150K · Net +$0.25 (ahead)',
    );
    expect(describeCell(500_000, 1_000, -1.98, formatTokens)).toBe(
      'N 500K · R 1K · Net −$1.98 (behind)',
    );
  });
});
