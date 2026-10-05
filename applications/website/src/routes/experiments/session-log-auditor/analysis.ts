/**
 * One pure function from the loaded records and the person's settings to
 * everything the page shows. The page keeps one state object and renders
 * this one result.
 */
import type { AuditData, AuditSession } from './audit-data';
import { clusterErrors, matchesSearch } from './clusters';
import type { Cluster } from './clusters';
import { summarizeCompactions } from './compactions';
import type { CompactionSummary } from './compactions';
import { controlRow, returnAfterZero } from './control-rows';
import type { ControlRow, FixMark } from './control-rows';
import { summarizeCost } from './cost';
import type { CostSummary } from './cost';
import type { PriceRow } from './pricing';
import { categoriesOf, isFloorCategory } from './rules';
import type { Rule } from './rules';
import { dayOf, failuresByDay } from './timeline';
import type { DayBucket } from './timeline';

export type Filters = {
  /** `YYYY-MM-DD`, inclusive, or empty. */
  from: string;
  to: string;
  cwd: string;
  branch: string;
  model: string;
  tool: string;
  category: string;
  search: string;
};

export const emptyFilters: Filters = {
  from: '',
  to: '',
  cwd: '',
  branch: '',
  model: '',
  tool: '',
  category: '',
  search: '',
};

export type Overview = {
  sessions: number;
  /** Responses after deduplicating by message ID, subagent responses included. */
  turns: number;
  subagentTurns: number;
  toolCalls: number;
  failures: number;
  /** Failures over tool calls, or `null` with no tool calls. */
  failureShare: number | null;
  floorFailures: number;
  /** Floor failures over failures, or `null` with no failures. */
  floorShare: number | null;
  /** Failures in `floor or task (ask)`, which could be either. */
  askFailures: number;
  cost: number;
  unpricedTurns: number;
  cacheHitRatio: number | null;
  compactions: CompactionSummary;
};

export type VersionRow = { version: string; sessions: number };

export type FilterOptions = {
  cwds: string[];
  branches: string[];
  models: string[];
  tools: string[];
  firstDay: string | null;
  lastDay: string | null;
};

export type Analysis = {
  overview: Overview;
  clusters: Cluster[];
  categories: string[];
  timeline: DayBucket[];
  controlRows: ControlRow[];
  /** Clusters that came back after going quiet, keyed by cluster key, with the day they returned. */
  returns: Record<string, string>;
  cost: CostSummary;
  compactions: AuditData['compactions'];
  versions: VersionRow[];
  options: FilterOptions;
  /** Every day any loaded session did something, oldest first. */
  activeDays: string[];
};

const sorted = (values: Iterable<string | null>): string[] =>
  [...new Set([...values].filter((value): value is string => Boolean(value)))].sort();

const inRange = (timestamp: string | null, filters: Filters): boolean => {
  if (!filters.from && !filters.to) return true;

  const day = dayOf(timestamp);
  if (!day) return false;

  return (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to);
};

export const filterOptions = (data: AuditData): FilterOptions => {
  const days = sorted([
    ...data.responses.map((response) => dayOf(response.timestamp)),
    ...data.errors.map((error) => dayOf(error.timestamp)),
  ]);

  return {
    cwds: sorted(data.sessions.map((session) => session.cwd)),
    branches: sorted(data.sessions.map((session) => session.gitBranch)),
    models: sorted(data.responses.map((response) => response.model)),
    tools: sorted([...data.toolCalls.map((call) => call.name), ...data.errors.map((e) => e.tool)]),
    firstDay: days[0] ?? null,
    lastDay: days.at(-1) ?? null,
  };
};

/** The records that pass every filter except category and search, which apply to clusters. */
export const filterData = (data: AuditData, filters: Filters): AuditData => {
  const keepSession = (session: AuditSession): boolean =>
    (!filters.cwd || session.cwd === filters.cwd) &&
    (!filters.branch || session.gitBranch === filters.branch) &&
    (!filters.model || session.models.includes(filters.model));
  const sessionIds = new Set(data.sessions.filter(keepSession).map((session) => session.id));
  const keep = (record: { sessionId: string; timestamp: string | null }): boolean =>
    sessionIds.has(record.sessionId) && inRange(record.timestamp, filters);

  const responses = data.responses.filter(
    (response) => keep(response) && (!filters.model || response.model === filters.model),
  );
  const toolCalls = data.toolCalls.filter(
    (call) => keep(call) && (!filters.tool || call.name === filters.tool),
  );
  const errors = data.errors.filter(
    (error) => keep(error) && (!filters.tool || error.tool === filters.tool),
  );
  const compactions = data.compactions.filter(keep);

  const active = new Set(
    [...responses, ...toolCalls, ...errors, ...compactions].map((record) => record.sessionId),
  );

  return {
    ...data,
    sessions: data.sessions.filter((session) => active.has(session.id)),
    responses,
    toolCalls,
    errors,
    compactions,
  };
};

export type AnalysisInput = {
  data: AuditData;
  rules: readonly Rule[];
  prices: readonly PriceRow[];
  filters: Filters;
  marks: readonly FixMark[];
};

export const analyze = ({ data, rules, prices, filters, marks }: AnalysisInput): Analysis => {
  const filtered = filterData(data, filters);
  const allClusters = clusterErrors(filtered.errors, rules);
  const clusters = allClusters.filter(
    (cluster) =>
      (!filters.category || cluster.category === filters.category) &&
      matchesSearch(cluster, filters.search),
  );

  const failures = clusters.reduce((sum, cluster) => sum + cluster.occurrences, 0);
  const floorFailures = clusters
    .filter((cluster) => isFloorCategory(cluster.category))
    .reduce((sum, cluster) => sum + cluster.occurrences, 0);
  const askFailures = clusters
    .filter((cluster) => cluster.category === 'floor or task (ask)')
    .reduce((sum, cluster) => sum + cluster.occurrences, 0);
  const toolCalls = filtered.toolCalls.length;
  const cost = summarizeCost(filtered.responses, filtered.sessions, prices);

  const activeDays = sorted(
    [...filtered.responses, ...filtered.toolCalls, ...filtered.errors].map((record) =>
      dayOf(record.timestamp),
    ),
  );
  const byKey = new Map(allClusters.map((cluster) => [cluster.key, cluster]));
  const returns: Record<string, string> = {};
  for (const cluster of clusters) {
    const day = returnAfterZero(cluster, activeDays);
    if (day) returns[cluster.key] = day;
  }

  const versionSessions = new Map<string, number>();
  for (const session of filtered.sessions) {
    for (const version of session.versions.length > 0 ? session.versions : ['unknown']) {
      versionSessions.set(version, (versionSessions.get(version) ?? 0) + 1);
    }
  }

  return {
    overview: {
      sessions: filtered.sessions.length,
      turns: filtered.responses.length,
      subagentTurns: filtered.responses.filter((response) => response.isSidechain).length,
      toolCalls,
      failures,
      failureShare: toolCalls > 0 ? failures / toolCalls : null,
      floorFailures,
      floorShare: failures > 0 ? floorFailures / failures : null,
      askFailures,
      cost: cost.cost,
      unpricedTurns: cost.unpricedTurns,
      cacheHitRatio: cost.cacheHitRatio,
      compactions: summarizeCompactions(filtered.compactions),
    },
    clusters,
    categories: categoriesOf(rules),
    timeline: failuresByDay(clusters),
    controlRows: marks.map((mark) => controlRow(mark, byKey.get(mark.key))),
    returns,
    cost,
    compactions: filtered.compactions,
    versions: [...versionSessions.entries()]
      .map(([version, sessions]) => ({ version, sessions }))
      .sort(
        (first, second) =>
          second.version.localeCompare(first.version, undefined, { numeric: true }) ||
          second.sessions - first.sessions,
      ),
    options: filterOptions(data),
    activeDays,
  };
};

/** The filters in effect, in words, for the digest and summary, or `null` for none. */
export const describeFilters = (filters: Filters): string | null => {
  const parts = [
    filters.from || filters.to
      ? `${filters.from || 'the start'} to ${filters.to || 'the end'}`
      : '',
    filters.cwd ? `directory ${filters.cwd}` : '',
    filters.branch ? `branch ${filters.branch}` : '',
    filters.model ? `model ${filters.model}` : '',
    filters.tool ? `tool ${filters.tool}` : '',
    filters.category ? `category ${filters.category}` : '',
    filters.search.trim() ? `matching “${filters.search.trim()}”` : '',
  ].filter(Boolean);

  return parts.length > 0 ? parts.join('; ') : null;
};
