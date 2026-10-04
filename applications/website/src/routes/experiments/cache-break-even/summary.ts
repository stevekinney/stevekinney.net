import type { ChangeEvaluation } from './calculate';
import { formatDollars, formatRatio, formatSignedDollars, formatTokens, ttlLabel } from './display';
import { describeVerdict, segmentsToMarkdown } from './verdict';

/** The short Markdown block "Copy summary" puts on the clipboard. */
export const buildSummary = (evaluation: ChangeEvaluation, customPrices: boolean): string => {
  const { from, fromEffort, to, toEffort } = evaluation;
  const standing =
    Math.abs(evaluation.net) < 1e-9 ? 'break even' : evaluation.net > 0 ? 'ahead' : 'behind';

  const lines = [
    '### Cache Break-Even',
    '',
    `- From: ${from.name} at ${fromEffort.label} effort`,
    `- To: ${to.name} at ${toEffort.label} effort`,
    `- Cache TTL: ${ttlLabel(evaluation.ttl)}`,
    `- Tokens already in context (N): ${formatTokens(evaluation.contextTokens)}`,
    `- Remaining output work (R): ${formatTokens(evaluation.remainingOutput)}`,
    `- Output volume ratio: ${formatRatio(evaluation.ratio)}${evaluation.overridden ? ' (override)' : ''}`,
    `- Cost to make the change: ${formatDollars(evaluation.cost)}`,
    `- Value of remaining work: ${formatSignedDollars(evaluation.value)}`,
    `- Net: ${formatSignedDollars(evaluation.net)} (${standing})`,
  ];

  if (customPrices) lines.push('- Prices: custom, not the defaults');

  lines.push('', segmentsToMarkdown(describeVerdict(evaluation)));

  return `${lines.join('\n')}\n`;
};
