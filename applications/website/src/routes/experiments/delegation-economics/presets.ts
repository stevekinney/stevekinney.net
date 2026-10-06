import { defaultScenario } from './scenario';
import type { Scenario } from './scenario';

export type PresetId = 'four-reviewers' | 'ten-files';

export type Preset = {
  id: PresetId;
  name: string;
  /** What the preset sets up, in a sentence. */
  setup: string;
  /** The change from the defaults. Everything else, except the model, goes back to its default. */
  patch: Partial<Scenario>;
};

export const presets: readonly Preset[] = [
  {
    id: 'four-reviewers',
    name: 'Four reviewers, one monorepo',
    setup:
      'Four reviewers each read the same 200K of shared code, with only 40K of unique work between them. It looks perfect for parallelism.',
    patch: {
      serialFraction: 0.1,
      workers: 4,
      sharedTokens: 200_000,
      uniqueTokens: 40_000,
      integrationMinutes: 5,
    },
  },
  {
    id: 'ten-files',
    name: 'Ten independent files',
    setup:
      'Five workers split 400K of independent work and share only 5K of context. A genuinely good fit.',
    patch: { serialFraction: 0.1, sharedTokens: 5_000, uniqueTokens: 400_000, workers: 5 },
  },
];

export const findPreset = (id: string): Preset | undefined =>
  presets.find((preset) => preset.id === id);

/** The defaults with the preset's changes, keeping the selected model. */
export const applyPreset = (preset: Preset, current: Scenario): Scenario => ({
  ...defaultScenario(current.modelId),
  ...preset.patch,
});
