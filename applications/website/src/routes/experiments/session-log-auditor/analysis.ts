/**
 * One pure function from the loaded records to everything the page shows:
 * the clusters, how many failures come from the floor, and failures per day.
 */
import type { AuditData } from './audit-data';
import { clusterErrors } from './clusters';
import type { Cluster } from './clusters';
import { categoriesOf, defaultRules, isFloorCategory } from './rules';
import type { Rule } from './rules';
import { failuresByDay } from './timeline';
import type { DayBucket } from './timeline';

/** Who a failure belongs to, in one word, for the badge beside each cluster. */
export type Verdict = 'floor' | 'floor or task' | 'harness' | 'task';

/**
 * The floor is your environment; the harness is the tool call itself; the task
 * is everything else, unclassified included, such as a failing test or a wrong
 * guess about the code.
 */
export const verdictOf = (category: string): Verdict => {
  if (isFloorCategory(category)) return 'floor';
  if (category === 'floor or task (ask)') return 'floor or task';
  if (category === 'harness') return 'harness';

  return 'task';
};

export type Analysis = {
  sessions: number;
  failures: number;
  floorFailures: number;
  /** Floor failures over failures, or `null` with no failures. */
  floorShare: number | null;
  /** Sessions with at least one floor failure. */
  floorSessions: number;
  clusters: Cluster[];
  categories: string[];
  timeline: DayBucket[];
};

export const analyze = (data: AuditData, rules: readonly Rule[] = defaultRules): Analysis => {
  const clusters = clusterErrors(data.errors, rules);
  const floor = clusters.filter((cluster) => verdictOf(cluster.category) === 'floor');
  const failures = clusters.reduce((sum, cluster) => sum + cluster.occurrences, 0);
  const floorFailures = floor.reduce((sum, cluster) => sum + cluster.occurrences, 0);

  return {
    sessions: data.sessions.length,
    failures,
    floorFailures,
    floorShare: failures > 0 ? floorFailures / failures : null,
    floorSessions: new Set(floor.flatMap((cluster) => cluster.sessionIds)).size,
    clusters,
    categories: categoriesOf(rules),
    timeline: failuresByDay(clusters),
  };
};
