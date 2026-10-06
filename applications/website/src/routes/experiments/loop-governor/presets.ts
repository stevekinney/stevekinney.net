import { cloneConfig, defaultConfig, sameConfig } from './loop-config';
import type { Config } from './loop-config';

export type Preset = {
  id: string;
  name: string;
  /** Builds the configuration from the defaults, keeping the run count and seed. */
  apply: (base: Config) => Config;
  /** What to notice. */
  notice: string;
};

const fromDefaults = (base: Config, patch: Partial<Config>, governors = {}): Config => {
  const config = { ...defaultConfig(), ...patch, runs: base.runs, seed: base.seed };

  return cloneConfig({ ...config, governors: { ...config.governors, ...governors } });
};

export const presets: readonly Preset[] = [
  {
    id: 'promise-string',
    name: 'Promise string, no governors',
    apply: (base) => fromDefaults(base, {}),
    notice:
      'A 15% chance of a premature claim sounds small, so most people guess low. It’s about 22%: every iteration that doesn’t finish is another chance to claim done, and a promise string believes the claim.',
  },
  {
    id: 'compiler-missing',
    name: 'Count the type errors, compiler missing',
    apply: (base) => fromDefaults(base, { marker: 'external', e: 0.2, failureMode: 'open' }),
    notice:
      'A missing compiler makes “count the type errors” return zero, which looks just like done. A fifth of runs end falsely done on the very first iteration. Switch the measurement to fail closed and the same runs end broken instead, which you can see and fix.',
  },
  {
    id: 'impossible',
    name: 'Impossible task',
    apply: (base) =>
      fromDefaults(base, { impossible: true, p: 0, maxIterations: 10 }, { maxIterations: true }),
    notice:
      'No amount of work finishes this task, so every “done” is a lie. Turn on the honest way out and watch most of those lies become BLOCKED: ImpossibleBench saw cheating fall from 54% to 9%.',
  },
  {
    id: 'overnight',
    name: 'Overnight in-session loop',
    apply: (base) =>
      fromDefaults(
        base,
        { context: 'accumulating', p: 0.03, marker: 'locked-tests', maxIterations: 32 },
        { maxIterations: true },
      ),
    notice:
      'A schedule is not a budget. Thirty-two half-hourly wakeups in one growing session cost far more than 32 fresh ones, because every turn re-reads everything before it, and nothing here caps the dollars.',
  },
  {
    id: 'well-governed',
    name: 'Well-governed external loop',
    apply: (base) =>
      fromDefaults(
        base,
        { dual: true, context: 'fresh' },
        { stall: true, budget: true, stopFile: true },
      ),
    notice:
      'Fresh context, a dual condition, a stall detector, a budget, and a stop file. False done drops to zero. The premature claims still happen, and now they’re a number you can track instead of a surprise.',
  },
];

export const findPreset = (id: string | null | undefined): Preset | undefined =>
  presets.find((preset) => preset.id === id);

/** The preset whose configuration matches exactly, ignoring the run count and seed. */
export const presetMatching = (config: Config): Preset | undefined =>
  presets.find((preset) => sameConfig(preset.apply(config), config));

export const customNotice =
  'Your own configuration. Pick a preset to get back to a worked example.';
