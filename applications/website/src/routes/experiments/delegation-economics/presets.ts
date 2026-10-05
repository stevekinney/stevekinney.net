import { defaultScenario } from './scenario';
import type { Scenario } from './scenario';

export type PresetId = 'four-reviewers' | 'serial' | 'ten-files' | 'incident-team';

export type Preset = {
  id: PresetId;
  name: string;
  /** What the preset sets up, in a sentence. */
  setup: string;
  /** The change from the defaults. Everything else, except the model, goes back to its default. */
  patch: Partial<Scenario>;
  /** A cited result shown as reported, rather than computed. */
  anecdote?: { text: string; source: string; href: string };
};

/** The first two are the ones where the plausible answer is wrong. */
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
    id: 'serial',
    name: 'Fan out the serial thing',
    setup: 'Eight workers on a job that’s 80% serial.',
    patch: { serialFraction: 0.8, workers: 8 },
  },
  {
    id: 'ten-files',
    name: 'Ten independent files',
    setup:
      'Five workers split 400K of independent work and share only 5K of context. A genuinely good fit.',
    patch: { serialFraction: 0.1, sharedTokens: 5_000, uniqueTokens: 400_000, workers: 5 },
  },
  {
    id: 'incident-team',
    name: 'Incident triage team',
    setup: 'A three-teammate agent team triaging an incident.',
    patch: { mode: 'team', workers: 3 },
    anecdote: {
      text: 'One field report on incident triage: about 10 minutes instead of 30–45 working solo, at roughly $8–10 instead of $2–3.',
      source: 'Using Claude Code agent teams for incident investigation, on magarcia.io',
      href: 'https://magarcia.io/using-claude-code-agent-teams-for-incident-investigation/',
    },
  },
];

export const findPreset = (id: string): Preset | undefined =>
  presets.find((preset) => preset.id === id);

/** The defaults with the preset's changes, keeping the selected model and the team multipliers. */
export const applyPreset = (preset: Preset, current: Scenario): Scenario => ({
  ...defaultScenario(current.modelId),
  teamMultiplier: current.teamMultiplier,
  planMultiplier: current.planMultiplier,
  ...preset.patch,
});
