import { formatCompactTokenCount } from '$lib/experiments/format';

/** The five claims against the window, in the order the bars draw them. */
export const termKeys = ['instructions', 'tools', 'history', 'generation', 'margin'] as const;

export type TermKey = (typeof termKeys)[number];

/** Every number is a token count. */
export type Scenario = Record<TermKey, number> & { capacity: number };

export type SegmentKey = TermKey | 'free';

export type SegmentDefinition = {
  key: SegmentKey;
  name: string;
  description: string;
  /** Tailwind classes for the segment's fill and its legend swatch. */
  fill: string;
};

export const segmentDefinitions: readonly SegmentDefinition[] = [
  {
    key: 'instructions',
    name: 'Instructions',
    description: 'System prompt, project instruction files, memory, and the skill listing.',
    fill: 'bg-sky-600 dark:bg-sky-400',
  },
  {
    key: 'tools',
    name: 'Tools and MCP',
    description: 'Tool schemas loaded into the prefix, including every MCP server’s.',
    fill: 'bg-amber-500 dark:bg-amber-400',
  },
  {
    key: 'history',
    name: 'History',
    description: 'Prompts, replies, file reads, and tool results.',
    fill: 'bg-fuchsia-600 dark:bg-fuchsia-400',
  },
  {
    key: 'generation',
    name: 'Reserved output',
    description: 'Room held back for the reply itself.',
    fill: 'bg-slate-500 dark:bg-slate-400',
  },
  {
    key: 'margin',
    name: 'Compaction margin',
    description: 'Slack before automatic compaction fires.',
    fill: 'bg-slate-300 dark:bg-slate-600',
  },
  {
    key: 'free',
    name: 'Free for your work',
    description: 'What is left for the files and output you are actually working on.',
    fill: 'bg-emerald-500 dark:bg-emerald-400',
  },
];

/** What is claimed against the window before any of your work goes in. */
export const drawn = (scenario: Scenario): number =>
  termKeys.reduce((total, key) => total + scenario[key], 0);

/** What is left. It goes negative when the claims exceed the window. */
export const usable = (scenario: Scenario): number => scenario.capacity - drawn(scenario);

/** A share of the window, from 0 to 100 for anything that fits. */
export const percentOf = (amount: number, capacity: number): number =>
  capacity > 0 ? (amount / capacity) * 100 : 0;

export type Segment = SegmentDefinition & { tokens: number; percent: number };

/**
 * The bar's segments, left to right. Widths are shares of whatever is larger,
 * the window or the claims, so an over-committed scenario still fits the bar
 * and simply has no free segment.
 */
export const segments = (scenario: Scenario): Segment[] => {
  const free = Math.max(usable(scenario), 0);
  const whole = Math.max(scenario.capacity, drawn(scenario));

  return segmentDefinitions
    .map((definition) => {
      const tokens = definition.key === 'free' ? free : scenario[definition.key];

      return { ...definition, tokens, percent: percentOf(tokens, whole) };
    })
    .filter((segment) => segment.tokens > 0);
};

const MINUS = '−';

/** A token count in the short form the page uses, such as `810K`, `1.2M`, or `−50K`. */
export const formatTokens = (count: number): string => {
  const rounded = Math.round(count);
  if (rounded === 0) return '0';

  return `${rounded < 0 ? MINUS : ''}${formatCompactTokenCount(Math.abs(rounded))}`;
};

/** A percentage to the given number of decimals, without a negative zero. */
export const formatPercent = (percent: number, decimals = 1): string => {
  const text = percent.toFixed(decimals);

  return `${Number(text) === 0 ? (0).toFixed(decimals) : text.replace('-', MINUS)}%`;
};
