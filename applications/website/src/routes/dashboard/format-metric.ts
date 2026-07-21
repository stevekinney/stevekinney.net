const COMPACT_NOTATION_THRESHOLD = 10_000;

/**
 * Formats a dashboard metric for display: compact notation (e.g. `12.3K`)
 * once a value reaches five digits, plain grouped digits (e.g. `1,234`)
 * below that.
 */
export function formatMetric(value: number): string {
  const notation = value >= COMPACT_NOTATION_THRESHOLD ? 'compact' : 'standard';

  return new Intl.NumberFormat('en-US', { notation, maximumFractionDigits: 1 }).format(value);
}
