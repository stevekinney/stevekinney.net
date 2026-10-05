/** Calendar days in UTC, and failures per day stacked by category. */
import type { Cluster } from './clusters';

/** The UTC calendar day of an ISO 8601 time, such as `2026-10-04`, or `null`. */
export const dayOf = (timestamp: string | null): string | null => {
  if (!timestamp) return null;

  const time = Date.parse(timestamp);

  return Number.isNaN(time) ? null : new Date(time).toISOString().slice(0, 10);
};

const DAY_MILLISECONDS = 86_400_000;

/** Past this many days, the timeline only shows days that had failures. */
export const MAXIMUM_FILLED_DAYS = 1_100;

/** Every day from `first` to `last`, inclusive, or just the two when the range is too long. */
export const daysBetween = (first: string, last: string): string[] => {
  const start = Date.parse(`${first}T00:00:00Z`);
  const end = Date.parse(`${last}T00:00:00Z`);
  const count = Math.round((end - start) / DAY_MILLISECONDS) + 1;
  if (!(count > 0) || count > MAXIMUM_FILLED_DAYS) return [...new Set([first, last])];

  return Array.from({ length: count }, (_, index) =>
    new Date(start + index * DAY_MILLISECONDS).toISOString().slice(0, 10),
  );
};

export type DayBucket = {
  day: string;
  /** Failures in each category that day. */
  counts: Record<string, number>;
  total: number;
};

/**
 * Failures per day, stacked by category. Days in between with no failures are
 * filled in as zero, so a fix shows up as a cliff instead of a gap.
 */
export const failuresByDay = (clusters: readonly Cluster[]): DayBucket[] => {
  const byDay = new Map<string, Record<string, number>>();

  for (const cluster of clusters) {
    for (const error of cluster.errors) {
      const day = dayOf(error.timestamp);
      if (!day) continue;

      const counts = byDay.get(day) ?? {};
      counts[cluster.category] = (counts[cluster.category] ?? 0) + 1;
      byDay.set(day, counts);
    }
  }

  const days = [...byDay.keys()].sort();
  if (days.length === 0) return [];

  const filled = daysBetween(days[0], days.at(-1) ?? days[0]);
  const all = filled.length >= days.length ? filled : days;

  return all.map((day) => {
    const counts = byDay.get(day) ?? {};

    return { day, counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) };
  });
};
