import { formatCompactTokenCount } from '$lib/experiments/format';

/** The five claims against the window, in the order the identity subtracts them. */
export const termKeys = ['instructions', 'history', 'tools', 'generation', 'margin'] as const;

export type TermKey = (typeof termKeys)[number];

/** Every number is a token count. */
export type Scenario = Record<TermKey, number> & { capacity: number };

export type TermDefinition = {
  key: TermKey;
  name: string;
  /** What the name becomes inside a sentence, such as "move tool definitions from 180K to 84K". */
  phrase: string;
  /** The top of the slider. The text box accepts more. */
  sliderMax: number;
  description: string;
};

export const capacityDescription = 'The whole window, before anything claims part of it.';
export const capacityName = 'Context capacity';
export const usableName = 'Usable evidence budget';
export const usableDescription =
  'What is left after the five claims: the room for the material you are working on.';

export const terms: readonly TermDefinition[] = [
  {
    key: 'instructions',
    name: 'Trusted instructions',
    phrase: 'trusted instructions',
    sliderMax: 200_000,
    description: 'System prompt, project instruction files, memory, and the skill listing.',
  },
  {
    key: 'history',
    name: 'Task and retained history',
    phrase: 'history',
    sliderMax: 900_000,
    description: 'Prompts, replies, file reads, and tool results.',
  },
  {
    key: 'tools',
    name: 'Exposed tool definitions',
    phrase: 'tool definitions',
    sliderMax: 400_000,
    description: 'Tool schemas loaded into the prefix.',
  },
  {
    key: 'generation',
    name: 'Reserved generation',
    phrase: 'reserved generation',
    sliderMax: 200_000,
    description: 'Room held back for the reply itself.',
  },
  {
    key: 'margin',
    name: 'Operational margin',
    phrase: 'operational margin',
    sliderMax: 400_000,
    description: 'Slack before automatic compaction fires.',
  },
];

export const findTerm = (key: TermKey): TermDefinition =>
  terms.find((term) => term.key === key) as TermDefinition;

/** The two window sizes the dropdown offers. Anything else is a custom capacity. */
export const capacityOptions = [
  { value: 1_000_000, label: '1M (current models)' },
  { value: 200_000, label: '200K (smaller models)' },
] as const;

/** Whatever the person types is capped here, so a stray extra digit can't break the chart. */
export const maximumTokenCount = 10_000_000_000;

/** What is claimed against the window before any evidence goes in. */
export const drawn = (scenario: Scenario): number =>
  termKeys.reduce((total, key) => total + scenario[key], 0);

/** What is left. It goes negative when the claims exceed the window. */
export const usable = (scenario: Scenario): number => scenario.capacity - drawn(scenario);

/** A share of the window, from 0 to 100 for anything that fits. */
export const percentOf = (amount: number, capacity: number): number =>
  capacity > 0 ? (amount / capacity) * 100 : 0;

/** The term with the largest value, or null when every term is zero. The earliest term wins a tie. */
export const biggestTerm = (scenario: Scenario): TermKey | null => {
  let biggest: TermKey | null = null;

  for (const key of termKeys) {
    if (scenario[key] > 0 && (biggest === null || scenario[key] > scenario[biggest])) {
      biggest = key;
    }
  }

  return biggest;
};

/** Nothing is left for evidence when usable is exactly zero, as well as when it is negative. */
export const isOver = (scenario: Scenario): boolean => usable(scenario) <= 0;

export const scenariosEqual = (first: Scenario, second: Scenario): boolean =>
  first.capacity === second.capacity && termKeys.every((key) => first[key] === second[key]);

const MINUS = '−';

/** A token count in the short form the page uses, such as `810K`, `1.2M`, or `−50K`. */
export const formatTokens = (count: number): string => {
  const rounded = Math.round(count);
  if (rounded === 0) return '0';

  return `${rounded < 0 ? MINUS : ''}${formatCompactTokenCount(Math.abs(rounded))}`;
};

/** A draw on the chart, such as `−18K`. A draw of nothing is just `0`. */
export const formatDraw = (count: number): string =>
  count === 0 ? '0' : `${MINUS}${formatTokens(Math.abs(count))}`;

/** A change between two scenarios, such as `+172K` or `−96K`. */
export const formatChange = (change: number): string =>
  change === 0 ? '0' : `${change > 0 ? '+' : ''}${formatTokens(change)}`;

/** A percentage to the given number of decimals, without a negative zero. */
export const formatPercent = (percent: number, decimals = 1): string => {
  const text = percent.toFixed(decimals);

  return `${Number(text) === 0 ? (0).toFixed(decimals) : text}%`;
};

export type ScenarioRow = {
  key: TermKey | 'capacity' | 'usable';
  name: string;
  pinned: number;
  current: number;
  change: number;
};

/** Every figure in the pinned scenario, in the current one, and the change between them. */
export const compareScenarios = (pinned: Scenario, current: Scenario): ScenarioRow[] => {
  const row = (
    key: ScenarioRow['key'],
    name: string,
    before: number,
    now: number,
  ): ScenarioRow => ({ key, name, pinned: before, current: now, change: now - before });

  return [
    row('capacity', capacityName, pinned.capacity, current.capacity),
    ...terms.map((term) => row(term.key, term.name, pinned[term.key], current[term.key])),
    row('usable', usableName, usable(pinned), usable(current)),
  ];
};

/** How much more (or less) room the current scenario leaves than the pinned one. */
export const usableChange = (pinned: Scenario, current: Scenario): number =>
  usable(current) - usable(pinned);
