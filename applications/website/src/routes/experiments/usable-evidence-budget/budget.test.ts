import { describe, expect, it } from 'vitest';

import {
  biggestTerm,
  compareScenarios,
  drawn,
  formatChange,
  formatDraw,
  formatPercent,
  formatTokens,
  isOver,
  percentOf,
  usable,
  usableChange,
} from './budget';
import type { Scenario } from './budget';
import { findPreset, presetMatching, presets } from './presets';

const scenarioOf = (id: string): Scenario => {
  const preset = findPreset(id);
  if (!preset) throw new Error(`No preset named ${id}`);

  return { ...preset.scenario };
};

describe('the formulas', () => {
  it('subtracts the five draws from the capacity', () => {
    const scenario = scenarioOf('lean');

    expect(drawn(scenario)).toBe(190_000);
    expect(usable(scenario)).toBe(810_000);
    expect(percentOf(usable(scenario), scenario.capacity)).toBe(81);
  });

  it('goes negative when the claims exceed the window', () => {
    const scenario = { ...scenarioOf('lean'), history: 900_000 };

    expect(usable(scenario)).toBe(-50_000);
    expect(isOver(scenario)).toBe(true);
  });

  it('counts exactly zero as over-committed', () => {
    const scenario = { ...scenarioOf('lean'), history: 850_000 };

    expect(usable(scenario)).toBe(0);
    expect(isOver(scenario)).toBe(true);
  });

  it('is over-committed when one term exceeds the capacity on its own', () => {
    const scenario = { ...scenarioOf('small-window'), history: 900_000 };

    expect(usable(scenario)).toBe(-796_000);
    expect(isOver(scenario)).toBe(true);
  });

  it('treats a window of zero as having no percentages to show', () => {
    expect(percentOf(100, 0)).toBe(0);
  });

  it('names the largest term, and the earliest one in a tie', () => {
    expect(biggestTerm(scenarioOf('lean'))).toBe('margin');
    expect(biggestTerm(scenarioOf('deep'))).toBe('history');
    expect(biggestTerm({ ...scenarioOf('lean'), instructions: 100_000 })).toBe('instructions');
    expect(
      biggestTerm({
        capacity: 1_000_000,
        instructions: 0,
        history: 0,
        tools: 0,
        generation: 0,
        margin: 0,
      }),
    ).toBeNull();
  });
});

describe('the presets', () => {
  it.each([
    ['lean', 810_000, 81],
    ['mcp-heavy', 603_000, 60.3],
    ['tool-search', 775_000, 77.5],
    ['deep', 173_000, 17.3],
    ['small-window', 24_000, 12],
  ])('%s leaves %d usable (%d%%)', (id, expected, percent) => {
    const scenario = scenarioOf(id);

    expect(usable(scenario)).toBe(expected);
    expect(percentOf(usable(scenario), scenario.capacity)).toBeCloseTo(percent, 5);
  });

  it('gives every preset a unique id and a notice', () => {
    expect(new Set(presets.map((preset) => preset.id)).size).toBe(presets.length);
    for (const preset of presets) expect(preset.notice.length).toBeGreaterThan(20);
  });

  it('keeps the notices honest about their numbers', () => {
    const [lean, heavy, search, deep] = ['lean', 'mcp-heavy', 'tool-search', 'deep'].map(
      scenarioOf,
    );

    expect(heavy.tools).toBe(180_000);
    expect(heavy.tools).toBeGreaterThan(heavy.instructions + heavy.history);
    expect(usable(search) - usable(heavy)).toBe(172_000);
    expect(percentOf(172_000, search.capacity)).toBe(17.2);
    expect(biggestTerm(lean)).toBe('margin');
    expect(biggestTerm(deep)).toBe('history');
  });

  it('finds the preset that matches a scenario exactly', () => {
    expect(presetMatching(scenarioOf('deep'))?.id).toBe('deep');
    expect(presetMatching({ ...scenarioOf('deep'), history: 601_000 })).toBeUndefined();
  });
});

describe('comparing two scenarios', () => {
  it('reports tools as the only changed term from tool search off to on', () => {
    const rows = compareScenarios(scenarioOf('mcp-heavy'), scenarioOf('tool-search'));
    const changed = rows.filter((row) => row.change !== 0).map((row) => row.key);

    expect(changed).toEqual(['tools', 'usable']);
    expect(rows.find((row) => row.key === 'tools')?.change).toBe(-172_000);
    expect(rows.find((row) => row.key === 'usable')?.change).toBe(172_000);
    expect(usableChange(scenarioOf('mcp-heavy'), scenarioOf('tool-search'))).toBe(172_000);
  });
});

describe('formatting', () => {
  it('writes token counts the short way', () => {
    expect(formatTokens(810_000)).toBe('810K');
    expect(formatTokens(1_000_000)).toBe('1M');
    expect(formatTokens(1_200_000)).toBe('1.2M');
    expect(formatTokens(985)).toBe('985');
    expect(formatTokens(0)).toBe('0');
  });

  it('uses a real minus sign for negative counts and draws', () => {
    expect(formatTokens(-50_000)).toBe('−50K');
    expect(formatDraw(18_000)).toBe('−18K');
    expect(formatDraw(0)).toBe('0');
  });

  it('signs changes', () => {
    expect(formatChange(172_000)).toBe('+172K');
    expect(formatChange(-96_000)).toBe('−96K');
    expect(formatChange(0)).toBe('0');
  });

  it('shows percentages to the requested decimals and never a negative zero', () => {
    expect(formatPercent(81)).toBe('81.0%');
    expect(formatPercent(-0.01)).toBe('0.0%');
    expect(formatPercent(-5)).toBe('\u22125.0%');
    expect(formatPercent(51.2, 0)).toBe('51%');
  });
});
