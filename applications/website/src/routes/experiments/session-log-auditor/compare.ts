/** Compares two periods: which clusters appeared, disappeared, or changed by more than a threshold. */
import type { Cluster } from './clusters';
import { dayOf } from './timeline';

export type Period = { from: string; to: string };

export type PeriodChange = {
  key: string;
  tool: string;
  signature: string;
  category: string;
  /** Sessions affected in period A and in period B. */
  sessionsA: number;
  sessionsB: number;
};

export type Comparison = {
  appeared: PeriodChange[];
  disappeared: PeriodChange[];
  changed: PeriodChange[];
};

const sessionsIn = (cluster: Cluster, period: Period): number => {
  const sessions = new Set<string>();

  for (const error of cluster.errors) {
    const day = dayOf(error.timestamp);
    if (day && day >= period.from && day <= period.to) sessions.add(error.sessionId);
  }

  return sessions.size;
};

/**
 * Sorts each cluster by how its sessions affected moved from A to B. A cluster
 * in both periods counts as changed when the count moved by more than
 * `threshold`, as a share of A: 0.5 means up or down by more than half.
 */
export const comparePeriods = (
  clusters: readonly Cluster[],
  periodA: Period,
  periodB: Period,
  threshold: number,
): Comparison => {
  const comparison: Comparison = { appeared: [], disappeared: [], changed: [] };

  for (const cluster of clusters) {
    const sessionsA = sessionsIn(cluster, periodA);
    const sessionsB = sessionsIn(cluster, periodB);
    const change = {
      key: cluster.key,
      tool: cluster.tool,
      signature: cluster.signature,
      category: cluster.category,
      sessionsA,
      sessionsB,
    };

    if (sessionsA === 0 && sessionsB > 0) comparison.appeared.push(change);
    else if (sessionsA > 0 && sessionsB === 0) comparison.disappeared.push(change);
    else if (sessionsA > 0 && Math.abs(sessionsB - sessionsA) / sessionsA > threshold) {
      comparison.changed.push(change);
    }
  }

  const bySize = (first: PeriodChange, second: PeriodChange): number =>
    Math.abs(second.sessionsB - second.sessionsA) - Math.abs(first.sessionsB - first.sessionsA) ||
    first.signature.localeCompare(second.signature);

  comparison.appeared.sort(bySize);
  comparison.disappeared.sort(bySize);
  comparison.changed.sort(bySize);

  return comparison;
};

/** Splits `first`–`last` into two halves, for a default comparison. */
export const halves = (first: string, last: string): { a: Period; b: Period } => {
  const start = Date.parse(`${first}T00:00:00Z`);
  const end = Date.parse(`${last}T00:00:00Z`);
  const middle = start + Math.floor((end - start) / 86_400_000 / 2) * 86_400_000;
  const middleDay = new Date(middle).toISOString().slice(0, 10);
  const nextDay = new Date(middle + 86_400_000).toISOString().slice(0, 10);

  return {
    a: { from: first, to: middleDay },
    b: { from: nextDay > last ? last : nextDay, to: last },
  };
};
