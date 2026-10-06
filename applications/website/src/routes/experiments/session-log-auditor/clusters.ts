/**
 * Groups failed tool calls by tool and signature. Sessions are carried as a
 * set of IDs and counted in code, so one session retrying 200 times counts as
 * one session, not 200.
 */
import type { AuditError } from './audit-data';
import { classify } from './rules';
import type { Rule } from './rules';

export type Example = {
  /** An exact substring of line `line` of `file`. */
  quote: string;
  file: string;
  line: number;
  sessionId: string;
  timestamp: string | null;
};

export type Cluster = {
  /** The tool and signature together, unique among the clusters. */
  key: string;
  tool: string;
  signature: string;
  category: string;
  ruleId: string | null;
  /** Every session the cluster appears in, sorted. */
  sessionIds: string[];
  sessions: number;
  occurrences: number;
  firstSeen: string | null;
  lastSeen: string | null;
  exitCodes: number[];
  /** A shell command from the first failure, if it ran one. */
  command: string | null;
  examples: Example[];
  /** Failures that couldn't be quoted verbatim, so they have no example. */
  unquotable: number;
  /** The failures in the order they happened. */
  errors: AuditError[];
};

export const MAXIMUM_EXAMPLES = 5;

export const clusterKey = (tool: string, signature: string): string =>
  JSON.stringify([tool, signature]);

/** Ranks by sessions affected, then by occurrences, then alphabetically. */
export const compareClusters = (first: Cluster, second: Cluster): number =>
  second.sessions - first.sessions ||
  second.occurrences - first.occurrences ||
  first.signature.localeCompare(second.signature) ||
  first.tool.localeCompare(second.tool);

const byTime = (first: AuditError, second: AuditError): number => {
  if (first.timestamp && second.timestamp && first.timestamp !== second.timestamp) {
    return first.timestamp < second.timestamp ? -1 : 1;
  }

  return first.id.localeCompare(second.id, undefined, { numeric: true });
};

/** Up to five quoted examples, one per session first, then the next quotable ones. */
const pickExamples = (errors: readonly AuditError[]): Example[] => {
  const quotable = errors.filter((error) => error.quote !== null);
  const seenSessions = new Set<string>();
  const picked: AuditError[] = [];

  for (const error of quotable) {
    if (picked.length === MAXIMUM_EXAMPLES) break;
    if (seenSessions.has(error.sessionId)) continue;
    seenSessions.add(error.sessionId);
    picked.push(error);
  }
  for (const error of quotable) {
    if (picked.length === MAXIMUM_EXAMPLES) break;
    if (!picked.includes(error)) picked.push(error);
  }

  return picked.sort(byTime).map((error) => ({
    quote: error.quote ?? '',
    file: error.file,
    line: error.line,
    sessionId: error.sessionId,
    timestamp: error.timestamp,
  }));
};

/** Clusters failures by `(tool, signature)`, classifies each cluster, and ranks them. */
export const clusterErrors = (errors: readonly AuditError[], rules: readonly Rule[]): Cluster[] => {
  const groups = new Map<string, AuditError[]>();

  for (const error of errors) {
    const key = clusterKey(error.tool, error.signature);
    const group = groups.get(key);
    if (group) group.push(error);
    else groups.set(key, [error]);
  }

  return [...groups.entries()]
    .map(([key, group]): Cluster => {
      const sorted = [...group].sort(byTime);
      const { tool, signature } = sorted[0];
      const sessionIds = [...new Set(sorted.map((error) => error.sessionId))].sort();
      const times = sorted.flatMap((error) => (error.timestamp ? [error.timestamp] : []));
      const { category, ruleId } = classify([signature, sorted[0].message], rules);

      return {
        key,
        tool,
        signature,
        category,
        ruleId,
        sessionIds,
        sessions: sessionIds.length,
        occurrences: sorted.length,
        firstSeen: times.length > 0 ? times.reduce((a, b) => (b < a ? b : a)) : null,
        lastSeen: times.length > 0 ? times.reduce((a, b) => (b > a ? b : a)) : null,
        exitCodes: [
          ...new Set(sorted.flatMap((error) => (error.exitCode === null ? [] : [error.exitCode]))),
        ].sort((a, b) => a - b),
        command: sorted.find((error) => error.command)?.command ?? null,
        examples: pickExamples(sorted),
        unquotable: sorted.filter((error) => error.quote === null).length,
        errors: sorted,
      };
    })
    .sort(compareClusters);
};
