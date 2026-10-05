import { defaultConfig, defaultStage } from './config';
import type { WorkflowConfig } from './config';

export type Preset = {
  id: string;
  label: string;
  /** What to look for once it's loaded. */
  notice: string;
  config: () => WorkflowConfig;
};

/**
 * Four items and two stages. The slow item comes first in stage 1 and last in
 * stage 2, so each stage's slowest agent belongs to a different item.
 */
export const slowFirstSlowLastGrid: number[][] = [
  [1, 10],
  [1, 1],
  [1, 1],
  [10, 1],
];

const manualPreset = (concurrency: number): WorkflowConfig => ({
  ...defaultConfig(),
  items: 4,
  stages: [
    { ...defaultStage(0), name: 'Find', meanMinutes: 1 },
    { ...defaultStage(1), name: 'Fix', meanMinutes: 1 },
  ],
  durationMode: 'manual',
  manual: slowFirstSlowLastGrid.map((row) => [...row]),
  concurrency,
});

/**
 * The seed for "Silent drops": with a 6% chance per agent, it leaves exactly
 * 3 of the 50 items null, which is 6% of the items. Other seeds give more or
 * fewer, since each item has two agents that can fail. The unit tests pin it.
 */
export const SILENT_DROPS_SEED = 5;

export const presets: Preset[] = [
  {
    id: 'slow-first-slow-last',
    label: 'Slow first, slow last',
    notice:
      'Both strategies do 26 minutes of work, so a tie looks likely. But pipeline() finishes in 11 minutes and parallel() in 20: each parallel() stage waits for its own slowest item, and here those are different items.',
    config: () => manualPreset(16),
  },
  {
    id: 'barrier-needed',
    label: 'A barrier that’s needed',
    notice:
      'Stage 2 deduplicates across every finding from stage 1, so it can’t start until all of them exist. pipeline() would finish sooner, and be wrong. This is the case parallel() is for.',
    config: () => ({
      ...defaultConfig(),
      items: 12,
      stages: [
        { ...defaultStage(0), name: 'Find', meanMinutes: 5, variability: 0.8 },
        { ...defaultStage(1), name: 'Dedupe', meanMinutes: 2, variability: 0.3 },
      ],
    }),
  },
  {
    id: 'big-fan-out',
    label: 'Big fan-out on Opus',
    notice:
      'Fifty items, two stages, and a scout: 101 agents, every one inheriting your Opus session. Set stage 1 to Haiku 4.5 to see what choosing a model per stage saves.',
    config: () => ({ ...defaultConfig(), items: 50 }),
  },
  {
    id: 'silent-drops',
    label: 'Silent drops',
    notice:
      'Each agent has a 6% chance of coming back null. With .filter(Boolean), the run says it completed, and the count is all that hints at the items it dropped.',
    config: () => ({
      ...defaultConfig(),
      items: 50,
      failureProbability: 0.06,
      handling: 'filter',
      seed: SILENT_DROPS_SEED,
    }),
  },
  {
    id: 'concurrency-1',
    label: 'Concurrency 1',
    notice:
      'With one agent at a time, nothing overlaps, so both strategies take the sum of every duration: 13 + 13 = 26 minutes.',
    config: () => manualPreset(1),
  },
];

export const findPreset = (id: string): Preset | undefined =>
  presets.find((preset) => preset.id === id);
