/**
 * Control rows: a problem you fixed should stay at zero. A cluster marked
 * fixed on a date is compared before and after it, and comes back flagged as a
 * regression when it shows up again. Any cluster that goes quiet for a stretch
 * of active days and then returns is flagged the same way.
 */
import { clusterKey } from './clusters';
import type { Cluster } from './clusters';
import { dayOf } from './timeline';

export type FixMark = {
  /** The cluster's key. */
  key: string;
  tool: string;
  signature: string;
  /** The day it was fixed, as `YYYY-MM-DD`. Failures after this day count as after the fix. */
  date: string;
};

export type ControlRow = {
  mark: FixMark;
  /** Whether the loaded sessions have this cluster at all. */
  seen: boolean;
  /** Sessions affected on or before the fix day. */
  sessionsBefore: number;
  /** Sessions affected after the fix day. */
  sessionsAfter: number;
  occurrencesAfter: number;
  /** The first day it came back, or `null`. */
  firstReturn: string | null;
  regression: boolean;
  /** `holding at 0`, or `Regression`. */
  status: string;
  /** Sessions affected per day, for the before-and-after chart. */
  series: { day: string; sessions: number; after: boolean }[];
};

export const HOLDING = 'holding at 0';
export const REGRESSION = 'Regression';

export const isCalendarDate = (text: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;

  const time = Date.parse(`${text}T00:00:00Z`);

  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === text;
};

/** Sessions affected per day, oldest first. */
export const sessionsPerDay = (cluster: Cluster): { day: string; sessions: number }[] => {
  const byDay = new Map<string, Set<string>>();

  for (const error of cluster.errors) {
    const day = dayOf(error.timestamp);
    if (!day) continue;

    const sessions = byDay.get(day) ?? new Set();
    sessions.add(error.sessionId);
    byDay.set(day, sessions);
  }

  return [...byDay.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([day, sessions]) => ({ day, sessions: sessions.size }));
};

export const controlRow = (mark: FixMark, cluster: Cluster | undefined): ControlRow => {
  const before = new Set<string>();
  const after = new Set<string>();
  let occurrencesAfter = 0;
  let firstReturn: string | null = null;

  for (const error of cluster?.errors ?? []) {
    const day = dayOf(error.timestamp);
    if (!day) continue;

    if (day > mark.date) {
      after.add(error.sessionId);
      occurrencesAfter += 1;
      if (firstReturn === null || day < firstReturn) firstReturn = day;
    } else {
      before.add(error.sessionId);
    }
  }

  const regression = occurrencesAfter > 0;

  return {
    mark,
    seen: cluster !== undefined,
    sessionsBefore: before.size,
    sessionsAfter: after.size,
    occurrencesAfter,
    firstReturn,
    regression,
    status: regression ? REGRESSION : HOLDING,
    series: cluster
      ? sessionsPerDay(cluster).map((point) => ({ ...point, after: point.day > mark.date }))
      : [],
  };
};

/** How many active days a cluster has to be absent before its return counts as a regression. */
export const QUIET_DAYS = 7;

/**
 * The day a cluster came back after reaching zero, or `null`. Zero means at
 * least `quietDays` consecutive active days (days any session ran) without
 * it. A day with no sessions at all says nothing, so it doesn't count.
 */
export const returnAfterZero = (
  cluster: Cluster,
  activeDays: readonly string[],
  quietDays = QUIET_DAYS,
): string | null => {
  const failureDays = new Set(
    cluster.errors.flatMap((error) => {
      const day = dayOf(error.timestamp);

      return day ? [day] : [];
    }),
  );
  let seen = false;
  let quiet = 0;

  for (const day of activeDays) {
    if (failureDays.has(day)) {
      if (seen && quiet >= quietDays) return day;
      seen = true;
      quiet = 0;
    } else if (seen) {
      quiet += 1;
    }
  }

  return null;
};

const STORAGE_VERSION = 1;
const MAXIMUM_MARKS = 500;

export const serializeMarks = (marks: readonly FixMark[]): string =>
  `${JSON.stringify({ version: STORAGE_VERSION, marks }, null, 2)}\n`;

export type ParsedMarks = { marks: FixMark[] } | { error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads fix marks from exported JSON: `{ "marks": [...] }` or the bare array. */
export const parseMarks = (text: string): ParsedMarks => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { error: 'That file isn’t valid JSON.' };
  }

  const entries = Array.isArray(value) ? value : isRecord(value) ? value.marks : null;
  if (!Array.isArray(entries)) return { error: 'Expected a "marks" list.' };
  if (entries.length > MAXIMUM_MARKS) return { error: `Up to ${MAXIMUM_MARKS} marks fit.` };

  const marks: FixMark[] = [];
  for (const [index, entry] of entries.entries()) {
    if (
      !isRecord(entry) ||
      typeof entry.tool !== 'string' ||
      typeof entry.signature !== 'string' ||
      typeof entry.date !== 'string' ||
      !isCalendarDate(entry.date)
    ) {
      return { error: `Mark ${index + 1} needs a tool, a signature, and a YYYY-MM-DD date.` };
    }

    marks.push({
      key: clusterKey(entry.tool, entry.signature),
      tool: entry.tool,
      signature: entry.signature,
      date: entry.date,
    });
  }

  return { marks };
};

/** Adds or replaces the mark for one cluster. */
export const upsertMark = (marks: readonly FixMark[], mark: FixMark): FixMark[] => [
  ...marks.filter((existing) => existing.key !== mark.key),
  mark,
];
