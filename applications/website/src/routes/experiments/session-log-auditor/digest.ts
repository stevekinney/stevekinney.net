/**
 * Scripts parse, models read digests. This builds a compact Markdown and JSON
 * digest of the clusters, counts, and examples to hand to a model, plus the
 * Markdown summary behind the Copy summary button and the CSV table exports.
 * Every number in them is counted here, in code.
 */
import { formatCost } from '$lib/experiments/format';

import type { Overview } from './analysis';
import type { Cluster } from './clusters';
import { formatPercent } from './compactions';
import { mergeFindings, redact } from './redact';
import type { RedactionFinding } from './redact';

export const DIGEST_CLUSTERS = 25;
export const SUMMARY_CLUSTERS = 10;

export type DigestInput = {
  overview: Overview;
  clusters: readonly Cluster[];
  /** A sentence describing the filters in effect, or `null` for none. */
  scope: string | null;
  redaction: boolean;
};

export type Digest = {
  markdown: string;
  json: string;
  /** What redaction masked, across both formats' shared text. Empty when redaction is off. */
  findings: RedactionFinding[];
};

type DigestCluster = {
  rank: number;
  tool: string;
  signature: string;
  category: string;
  sessions: number;
  occurrences: number;
  firstSeen: string | null;
  lastSeen: string | null;
  exitCodes: number[];
  examples: { quote: string; file: string; line: number }[];
};

const day = (timestamp: string | null): string => timestamp?.slice(0, 10) ?? 'unknown';

/** Backticks inside a code span would end it early, so the span uses a longer fence. */
const code = (text: string): string => {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longest + 1);

  return `${fence}${longest > 0 ? ' ' : ''}${text}${longest > 0 ? ' ' : ''}${fence}`;
};

/** A table cell can't hold a pipe or a line break. */
const cell = (text: string): string => text.replace(/\|/g, '\\|').replace(/\s+/g, ' ');

export const buildDigest = ({ overview, clusters, scope, redaction }: DigestInput): Digest => {
  const findings: RedactionFinding[][] = [];
  const clean = (text: string): string => {
    if (!redaction) return text;

    const result = redact(text);
    findings.push(result.findings);

    return result.text;
  };

  const top: DigestCluster[] = clusters.slice(0, DIGEST_CLUSTERS).map((cluster, index) => ({
    rank: index + 1,
    tool: cluster.tool,
    signature: clean(cluster.signature),
    category: cluster.category,
    sessions: cluster.sessions,
    occurrences: cluster.occurrences,
    firstSeen: cluster.firstSeen,
    lastSeen: cluster.lastSeen,
    exitCodes: cluster.exitCodes,
    examples: cluster.examples.map((example) => ({
      quote: clean(example.quote),
      file: clean(example.file),
      line: example.line,
    })),
  }));

  const counts = {
    sessions: overview.sessions,
    turns: overview.turns,
    toolCalls: overview.toolCalls,
    failedToolCalls: overview.failures,
    floorFailures: overview.floorFailures,
    floorOrTaskFailures: overview.askFailures,
    clusters: clusters.length,
    clustersInDigest: top.length,
    compactions: overview.compactions,
  };

  const json = `${JSON.stringify(
    {
      digest: 'session-log-auditor',
      note: 'Every count here was computed by code from the transcripts. Quotes are verbatim substrings of the line named.',
      scope,
      redacted: redaction,
      counts,
      clusters: top,
    },
    null,
    2,
  )}\n`;

  const lines = [
    '# Session log digest',
    '',
    'Every count below was computed by code. Every quote is a verbatim substring of the file and line named.',
    ...(scope ? ['', `Scope: ${scope}`] : []),
    ...(redaction ? ['', 'Home directories and secret-shaped strings are masked.'] : []),
    '',
    '## Counts',
    '',
    `- Sessions: ${counts.sessions}`,
    `- Assistant turns: ${counts.turns}`,
    `- Tool calls: ${counts.toolCalls}`,
    `- Failed tool calls: ${counts.failedToolCalls}`,
    `- Floor failures: ${counts.floorFailures} (${formatPercent(overview.floorShare)} of failures)`,
    `- Floor or task, unclear: ${counts.floorOrTaskFailures}`,
    `- Compactions: ${overview.compactions.manual} manual, ${overview.compactions.auto} auto`,
    `- Clusters: ${counts.clusters} (top ${counts.clustersInDigest} below, ranked by sessions affected)`,
    '',
    '## Clusters',
  ];

  for (const cluster of top) {
    lines.push(
      '',
      `### ${cluster.rank}. ${code(cluster.signature)}`,
      '',
      `- Tool: ${cluster.tool}`,
      `- Category: ${cluster.category}`,
      `- Sessions affected: ${cluster.sessions}`,
      `- Occurrences: ${cluster.occurrences}`,
      `- First seen: ${day(cluster.firstSeen)}; last seen: ${day(cluster.lastSeen)}`,
      ...(cluster.exitCodes.length > 0 ? [`- Exit codes: ${cluster.exitCodes.join(', ')}`] : []),
    );
    if (cluster.examples.length > 0) {
      lines.push('- Examples:');
      for (const example of cluster.examples) {
        lines.push(`  - ${code(example.quote)} (${example.file}:${example.line})`);
      }
    }
  }

  return { markdown: `${lines.join('\n')}\n`, json, findings: mergeFindings(findings) };
};

/** The overview and top clusters as Markdown, for the Copy summary button. */
export const buildSummary = (
  overview: Overview,
  clusters: readonly Cluster[],
  scope: string | null,
): string => {
  const lines = [
    '## Session log audit',
    '',
    ...(scope ? [`Scope: ${scope}`, ''] : []),
    `- Sessions: ${overview.sessions}`,
    `- Assistant turns (after dedupe): ${overview.turns}`,
    `- Failed tool calls: ${overview.failures} of ${overview.toolCalls} (${formatPercent(overview.failureShare)})`,
    `- Share that is floor: ${formatPercent(overview.floorShare)}`,
    `- Estimated cost: ${formatCost(overview.cost)}${overview.unpricedTurns > 0 ? ` (${overview.unpricedTurns} unpriced turns)` : ''}`,
    `- Cache hit ratio: ${formatPercent(overview.cacheHitRatio)}`,
    `- Compactions: ${overview.compactions.manual} manual, ${overview.compactions.auto} auto`,
    '',
    '| Signature | Tool | Category | Sessions | Occurrences |',
    '| --- | --- | --- | ---: | ---: |',
    ...clusters
      .slice(0, SUMMARY_CLUSTERS)
      .map(
        (cluster) =>
          `| ${cell(redact(cluster.signature).text)} | ${cell(cluster.tool)} | ${cell(cluster.category)} | ${cluster.sessions} | ${cluster.occurrences} |`,
      ),
  ];

  return `${lines.join('\n')}\n`;
};

/** A spreadsheet would run a cell that starts with one of these as a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

const csvCell = (value: string | number | null): string => {
  if (value === null) return '';

  const text = String(value);
  const safe = typeof value === 'string' && FORMULA_START.test(text) ? `'${text}` : text;

  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const toCsv = (
  headers: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
): string => [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
