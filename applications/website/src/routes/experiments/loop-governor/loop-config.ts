/**
 * Everything a person can set about the loop, with the specification's defaults.
 * The simulation, the analytic answers, the share link, and the page all read
 * this one shape.
 */

export type MarkerId =
  'touch-done' | 'promise-string' | 'passes-field' | 'editable-tests' | 'locked-tests' | 'external';

export type Marker = {
  id: MarkerId;
  name: string;
  /** The default chance per iteration that the agent claims done before it is. */
  defaultQ: number;
  why: string;
};

/** The marker ladder, weakest first. The q values are illustrative, not measured. */
export const markers: readonly Marker[] = [
  {
    id: 'touch-done',
    name: '`touch done`',
    defaultQ: 0.25,
    why: 'The agent writes its own approval.',
  },
  {
    id: 'promise-string',
    name: 'A promise string in output',
    defaultQ: 0.15,
    why: 'The model controls the verdict, and a mere mention can match.',
  },
  {
    id: 'passes-field',
    name: 'A `"passes": true` field in a JSON file',
    defaultQ: 0.1,
    why: 'Still agent-writable.',
  },
  {
    id: 'editable-tests',
    name: 'A test suite’s exit code (agent can edit tests)',
    defaultQ: 0.05,
    why: 'The agent can edit its way to a pass.',
  },
  {
    id: 'locked-tests',
    name: 'Files on disk plus tests the agent can’t edit',
    defaultQ: 0.01,
    why: 'Out of the agent’s reach.',
  },
  {
    id: 'external',
    name: 'A marker written by CI, a hook, or a human',
    defaultQ: 0,
    why: 'An external writer.',
  },
];

export const markerIds = markers.map((marker) => marker.id);

export const findMarker = (id: MarkerId): Marker =>
  markers.find((marker) => marker.id === id) ?? markers[1];

export type Ladder = Record<MarkerId, number>;

export const defaultLadder = (): Ladder =>
  Object.fromEntries(markers.map((marker) => [marker.id, marker.defaultQ])) as Ladder;

export type GovernorId = 'maxIterations' | 'budget' | 'stall' | 'repeatedFailure';

/** The order governors are checked in. When two fire on the same iteration, the first wins. */
export const governorIds: readonly GovernorId[] = [
  'maxIterations',
  'budget',
  'stall',
  'repeatedFailure',
];

export type Governors = Record<GovernorId | 'stopFile', boolean>;

export type Config = {
  /** Chance of real progress per iteration. */
  p: number;
  /** Progress iterations needed to finish. */
  k: number;
  marker: MarkerId;
  /** The editable q for each rung of the ladder. */
  ladder: Ladder;
  /** The marker and a deterministic check must agree. */
  dual: boolean;
  /** Chance the measurement throws. */
  e: number;
  failureMode: 'open' | 'closed';
  context: 'fresh' | 'accumulating';
  /** Dollars per iteration before context. */
  c0: number;
  /** Dollars to re-read state from disk in a fresh context. */
  r: number;
  /** Dollars of growth per iteration in an accumulating context. */
  g: number;
  governors: Governors;
  maxIterations: number;
  budget: number;
  stallM: number;
  /**
   * Chance that a failed iteration after another failed iteration fails the same
   * way. The specification doesn't say what makes two simulated failures the
   * same, so this is an illustrative assumption.
   */
  repeatChance: number;
  /** The task can't be done. Forces `p` to 0 and uses the per-run cheat rates. */
  impossible: boolean;
  /** The agent has a `BLOCKED` exit. */
  honestWayOut: boolean;
  /** Per-run chance an agent on an impossible task cheats, without and with a `BLOCKED` exit. */
  cheatWithout: number;
  cheatWith: number;
  runs: number;
  seed: number;
};

/** Every run ends here at the latest, labeled runaway. */
export const HORIZON = 2_000;

export const MAXIMUM_RUNS = 10_000;

export const defaultConfig = (): Config => ({
  p: 0.35,
  k: 1,
  marker: 'promise-string',
  ladder: defaultLadder(),
  dual: false,
  e: 0,
  failureMode: 'open',
  context: 'fresh',
  c0: 0.3,
  r: 0.1,
  g: 0.08,
  governors: {
    maxIterations: false,
    budget: false,
    stall: false,
    repeatedFailure: false,
    stopFile: false,
  },
  maxIterations: 10,
  budget: 5,
  stallM: 3,
  repeatChance: 0.5,
  impossible: false,
  honestWayOut: false,
  cheatWithout: 0.54,
  cheatWith: 0.09,
  runs: 1_000,
  seed: 42,
});

/** The premature-claim chance per iteration for the selected marker. */
export const claimChance = (config: Config): number => config.ladder[config.marker];

/** The progress chance the simulation uses: an impossible task never progresses. */
export const progressChance = (config: Config): number => (config.impossible ? 0 : config.p);

/** Whether any governor that can fire on its own is on. The stop file needs a person. */
export const anyAutomaticGovernor = (config: Config): boolean =>
  governorIds.some((id) => config.governors[id]);

export type Range = { min: number; max: number; step: number };

export const ranges = {
  p: { min: 0, max: 1, step: 0.01 },
  k: { min: 1, max: 50, step: 1 },
  q: { min: 0, max: 1, step: 0.01 },
  e: { min: 0, max: 1, step: 0.01 },
  c0: { min: 0, max: 100, step: 0.01 },
  r: { min: 0, max: 100, step: 0.01 },
  g: { min: 0, max: 100, step: 0.01 },
  maxIterations: { min: 1, max: HORIZON, step: 1 },
  budget: { min: 0.01, max: 1_000_000, step: 0.01 },
  stallM: { min: 1, max: 100, step: 1 },
  repeatChance: { min: 0, max: 1, step: 0.01 },
  cheat: { min: 0, max: 1, step: 0.01 },
  runs: { min: 1, max: MAXIMUM_RUNS, step: 1 },
  seed: { min: 0, max: 4_294_967_295, step: 1 },
} as const satisfies Record<string, Range>;

/** Holds a value inside a range, rounding integer ranges to whole numbers. */
export const clampTo = (range: Range, value: number): number => {
  if (!Number.isFinite(value)) return range.min;

  const held = Math.min(range.max, Math.max(range.min, value));

  return Number.isInteger(range.step) ? Math.round(held) : held;
};

/** Whether two configurations would produce the same runs. */
export const sameConfig = (first: Config, second: Config): boolean =>
  JSON.stringify(first) === JSON.stringify(second);

export const cloneConfig = (config: Config): Config => ({
  ...config,
  ladder: { ...config.ladder },
  governors: { ...config.governors },
});
