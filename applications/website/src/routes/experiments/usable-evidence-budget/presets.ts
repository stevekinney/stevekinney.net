import type { Scenario } from './budget';

export type Preset = {
  id: string;
  name: string;
  scenario: Scenario;
  /** What to notice about this scenario. */
  notice: string;
};

export const customNotice = 'Custom scenario. Pick a preset above to get back to a worked example.';

export const presets: readonly Preset[] = [
  {
    id: 'lean',
    name: 'Lean CLI session',
    scenario: {
      capacity: 1_000_000,
      instructions: 18_000,
      history: 40_000,
      tools: 0,
      generation: 32_000,
      margin: 100_000,
    },
    notice:
      'About the best case on a 1M model. The largest draw is the margin, which is a choice rather than a cost.',
  },
  {
    id: 'mcp-heavy',
    name: 'MCP-heavy, tool search off',
    scenario: {
      capacity: 1_000_000,
      instructions: 25_000,
      history: 60_000,
      tools: 180_000,
      generation: 32_000,
      margin: 100_000,
    },
    notice:
      'Tool schemas alone take 180K, which is more than instructions and history combined. All of it is spent before the model sees any evidence.',
  },
  {
    id: 'tool-search',
    name: '…the same, with tool search on',
    scenario: {
      capacity: 1_000_000,
      instructions: 25_000,
      history: 60_000,
      tools: 8_000,
      generation: 32_000,
      margin: 100_000,
    },
    notice:
      'Returns 172K tokens, or 17% of the window, for a configuration change rather than a discipline change. This is usually the largest single win available.',
  },
  {
    id: 'deep',
    name: 'Deep into a long session',
    scenario: {
      capacity: 1_000_000,
      instructions: 25_000,
      history: 600_000,
      tools: 20_000,
      generation: 32_000,
      margin: 150_000,
    },
    notice: 'History dominates everything, which is the shape that makes compacting worth it.',
  },
  {
    id: 'small-window',
    name: 'A 200K window',
    scenario: {
      capacity: 200_000,
      instructions: 20_000,
      history: 80_000,
      tools: 40_000,
      generation: 16_000,
      margin: 20_000,
    },
    notice: 'Fixed overheads that look trivial against 1M are decisive at 200K.',
  },
];

export const findPreset = (id: string | null | undefined): Preset | undefined =>
  presets.find((preset) => preset.id === id);

/** The preset whose numbers match a scenario exactly, if there is one. */
export const presetMatching = (scenario: Scenario): Preset | undefined =>
  presets.find(
    (preset) =>
      preset.scenario.capacity === scenario.capacity &&
      preset.scenario.instructions === scenario.instructions &&
      preset.scenario.history === scenario.history &&
      preset.scenario.tools === scenario.tools &&
      preset.scenario.generation === scenario.generation &&
      preset.scenario.margin === scenario.margin,
  );
