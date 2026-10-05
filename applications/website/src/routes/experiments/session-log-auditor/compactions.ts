/** Compaction events and how far each one shrank the context. */
import type { AuditCompaction } from './audit-data';

/** What was left after compacting, as a share of what was there: `post / pre`, or `null` without a `pre`. */
export const compactionRatio = (
  compaction: Pick<AuditCompaction, 'preTokens' | 'postTokens'>,
): number | null =>
  compaction.preTokens > 0 ? compaction.postTokens / compaction.preTokens : null;

export const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export type CompactionSummary = {
  manual: number;
  auto: number;
  /** Events whose trigger was neither, or wasn't recorded. */
  other: number;
  medianRatio: number | null;
};

export const summarizeCompactions = (
  compactions: readonly AuditCompaction[],
): CompactionSummary => ({
  manual: compactions.filter((compaction) => compaction.trigger === 'manual').length,
  auto: compactions.filter((compaction) => compaction.trigger === 'auto').length,
  other: compactions.filter(
    (compaction) => compaction.trigger !== 'manual' && compaction.trigger !== 'auto',
  ).length,
  medianRatio: median(
    compactions.flatMap((compaction) => {
      const ratio = compactionRatio(compaction);

      return ratio === null ? [] : [ratio];
    }),
  ),
});

/** A share as a percentage with one decimal, such as `4.1%` or `90.1%`. */
export const formatPercent = (ratio: number | null): string =>
  ratio === null || !Number.isFinite(ratio) ? '—' : `${(ratio * 100).toFixed(1)}%`;
