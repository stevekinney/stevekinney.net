import { endpointLabels } from './analysis';
import type { Analysis } from './analysis';
import {
  differenceDecimals,
  formatInterval,
  formatNumber,
  formatP,
  formatPercent,
  intervalDecimals,
} from './display';
import { describeVerdict, endpointScale, endpointUnit } from './verdict';

/** The Markdown block “Copy summary” puts on the clipboard: verdict, interval, endpoint, and n. */
export const buildSummary = (analysis: Analysis, source: string): string => {
  const [labelA = 'A', labelB = 'B'] = analysis.labels;
  const lines = ['### Is the Difference Real?', '', `- Data: ${source}`];
  const verdict = describeVerdict(analysis);

  if (!verdict) {
    lines.push(
      '- Endpoint: none. The data has no outcome column, only activity such as lines of code or acceptance rate.',
      '',
      '**No verdict.** This isn’t an outcome.',
    );

    return `${lines.join('\n')}\n`;
  }

  lines.push(
    `- Endpoint: ${endpointLabels[analysis.endpoint]} (${analysis.labels.length === 2 ? `${labelA} − ${labelB}` : labelA})`,
  );

  const { comparison } = analysis;
  if (comparison?.kind === 'mean') {
    const { test } = comparison;
    const decimals = intervalDecimals(test.lower, test.upper);

    lines.push(
      comparison.design === 'paired'
        ? `- Design: paired, n = ${comparison.valuesA.length} tasks run under both`
        : `- Design: unpaired, n = ${comparison.valuesA.length} (${labelA}) and ${comparison.valuesB.length} (${labelB})`,
      `- Means: ${labelA} ${formatNumber(test.meanA, 1)}, ${labelB} ${formatNumber(test.meanB, 1)}`,
      `- Difference: ${formatNumber(test.difference, differenceDecimals(test.lower, test.upper))} ${endpointUnit(analysis.endpoint)}${comparison.percent === null ? '' : ` (${formatPercent(comparison.percent)} of ${labelA})`}`,
      test.degenerate
        ? '- 95% interval: degenerate, a single point'
        : `- 95% interval: ${formatInterval(test.lower, test.upper, decimals)}, p ≈ ${formatP(test.p)}`,
    );
  } else if (comparison?.kind === 'rate') {
    const scale = endpointScale(analysis.endpoint);

    lines.push(
      `- n: ${comparison.a.total} (${labelA}) and ${comparison.b.total} (${labelB})`,
      `- Rates: ${labelA} ${formatPercent(comparison.a.rate * 100)}, ${labelB} ${formatPercent(comparison.b.rate * 100)}`,
      `- 95% interval for the gap: ${formatInterval(comparison.lower * scale, comparison.upper * scale, 1)} percentage points`,
    );
  }

  lines.push('', `**${verdict.headline}** ${verdict.body}`);
  if (verdict.detail) lines.push('', verdict.detail);

  return `${lines.join('\n')}\n`;
};
