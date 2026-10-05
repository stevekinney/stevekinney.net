import type { Analysis, Endpoint } from './analysis';
import { differenceDecimals, formatCount, formatNumber, intervalDecimals } from './display';

export type VerdictKind = 'distinguishable' | 'cant-tell' | 'not-measured';

export const verdictHeadlines: Record<VerdictKind, string> = {
  distinguishable: 'Distinguishable.',
  'cant-tell': 'Can’t tell.',
  'not-measured': 'Not measured.',
};

export type VerdictText = {
  kind: VerdictKind;
  headline: string;
  body: string;
  /** A follow-up, such as how many tasks would settle it. */
  detail: string | null;
};

/** How each endpoint reads in words. A − B > 0 is always the direction that favors B. */
const phrasing: Record<
  Endpoint,
  {
    /** The unit a difference is shown in, such as "minutes". */
    unit: string;
    /** Scales the stored difference to that unit: rates are stored from 0 to 1. */
    scale: number;
    range: (label: string, low: string, high: string, better: boolean) => string;
    /** One end of an interval. With a null label, the subject was already named. */
    point: (label: string | null, value: string, better: boolean) => string;
  }
> = {
  time: {
    unit: 'minutes',
    scale: 1,
    range: (label, low, high, better) =>
      `${label} is ${low}–${high} minutes ${better ? 'faster' : 'slower'} per task`,
    point: (label, value, better) =>
      `${label ? `${label} being ` : ''}${value} minutes ${better ? 'faster' : 'slower'}`,
  },
  review: {
    unit: 'review minutes',
    scale: 1,
    range: (label, low, high, better) =>
      `${label} needs ${low}–${high} ${better ? 'fewer' : 'more'} review minutes per task`,
    point: (label, value, better) =>
      `${label ? `${label} needing ` : ''}${value} ${better ? 'fewer' : 'more'} review minutes`,
  },
  rework: {
    unit: 'percentage points',
    scale: 100,
    range: (label, low, high, better) =>
      `${label}’s rework rate is ${low}–${high} percentage points ${better ? 'lower' : 'higher'}`,
    point: (label, value, better) =>
      `${label ? `${label}’s rework rate being ` : ''}${value} points ${better ? 'lower' : 'higher'}`,
  },
};

export const endpointUnit = (endpoint: Endpoint): string => phrasing[endpoint].unit;
export const endpointScale = (endpoint: Endpoint): number => phrasing[endpoint].scale;

const NOT_MEASURED_NOTE =
  '“We didn’t measure it” is a legitimate answer, and a more honest one than “it felt faster.”';

/** The verdict in words, or null when the data has no outcome to give one on. */
export const describeVerdict = (analysis: Analysis): VerdictText | null => {
  const { verdict, endpoint, labels } = analysis;
  if (!verdict) return null;

  if (verdict.kind === 'not-measured') {
    return {
      kind: 'not-measured',
      headline: verdictHeadlines['not-measured'],
      body: verdict.reason,
      detail: NOT_MEASURED_NOTE,
    };
  }

  const [labelA, labelB] = labels;
  const words = phrasing[endpoint];
  const lower = verdict.lower * words.scale;
  const upper = verdict.upper * words.scale;
  const decimals = intervalDecimals(lower, upper);
  const show = (value: number): string => formatNumber(Math.abs(value), decimals);

  if (verdict.kind === 'distinguishable') {
    const better = lower > 0;
    const [low, high] = better ? [lower, upper] : [-upper, -lower];

    return {
      kind: 'distinguishable',
      headline: verdictHeadlines.distinguishable,
      body: `${words.range(labelB, show(low), show(high), better)} than ${labelA}${endpoint === 'rework' ? '’s' : ''}. The 95% interval leaves out zero.`,
      detail: null,
    };
  }

  // The first end that isn't zero names the condition; the second doesn't repeat it.
  const end = (value: number, better: boolean, named: boolean): string =>
    value === 0 ? 'no difference at all' : words.point(named ? labelB : null, show(value), better);

  let detail: string | null = null;
  const { comparison } = analysis;
  if (verdict.planner && comparison?.kind === 'mean') {
    const seen = formatNumber(
      Math.abs(comparison.test.difference),
      differenceDecimals(verdict.lower, verdict.upper),
    );
    const tasks = formatCount(verdict.planner.tasks);
    detail =
      comparison.design === 'paired'
        ? `If the real difference is the ${seen} ${words.unit} you saw, about ${tasks} tasks, each run both ways, would settle it.`
        : `If the real difference is the ${seen} ${words.unit} you saw, about ${tasks} tasks per condition would settle it.`;
  } else if (comparison?.kind === 'mean' && comparison.test.difference === 0) {
    detail =
      'The two means are identical, so no number of tasks would show a gap of that size. Set the smallest difference worth finding in the planner.';
  }

  return {
    kind: 'cant-tell',
    headline: verdictHeadlines['cant-tell'],
    body: `The data is consistent with anything from ${end(lower, false, true)} to ${end(upper, true, lower === 0)}${endpoint === 'rework' ? '' : ' per task'}.`,
    detail,
  };
};
