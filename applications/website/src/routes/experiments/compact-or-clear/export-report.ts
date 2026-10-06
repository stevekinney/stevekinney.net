import { formatCompactTokenCount as formatTokens, formatCost } from '$lib/experiments/format';

import { formatPercent } from './field-parsing';
import { modelLabel } from './pricing';
import type { ModelPrice } from './pricing';
import type { Projection } from './projection';
import { ttlLabel } from './scenario';
import type { Scenario } from './scenario';

/** Every turn from 0 to T for every strategy, in dollars, as CSV. */
export const projectionToCsv = (projection: Projection): string => {
  const columns = [
    ['Turn', null],
    ['Keep going', projection.keep],
    ['Compact now', projection.compact],
    ['Clear now', projection.clear],
    ...(projection.later ? ([['Compact later', projection.later]] as const) : []),
  ] as const;

  const header = columns.map(([name]) => name).join(',');
  const rows = projection.keep.map((_, turn) =>
    columns.map(([, series]) => (series ? series[turn].toFixed(6) : String(turn))).join(','),
  );

  return `${[header, ...rows].join('\n')}\n`;
};

const payback = (turn: number | null, turns: number): string =>
  turn === null ? `not within ${turns} turns` : turn === 0 ? 'immediately' : `after ${turn} turns`;

/** A Markdown block with the scenario, the up-front costs, the paybacks, and the cost after T turns. */
export const summaryToMarkdown = (
  scenario: Scenario,
  model: ModelPrice,
  projection: Projection,
): string => {
  const { parts, summaryTokens } = projection;
  const last = scenario.turns;
  const lines = [
    '# Compact or clear',
    '',
    '## Scenario',
    '',
    `- Model: ${modelLabel(model)}`,
    `- Cache: ${ttlLabel(scenario.ttl)} TTL, ${scenario.warm ? 'warm' : 'cold'} when you compact`,
    `- Context now: ${formatTokens(scenario.contextNow)} tokens`,
    `- Summary size: ${formatTokens(summaryTokens)} tokens (${formatPercent(scenario.summaryPercent)})`,
    `- Re-read after clear: ${formatTokens(scenario.reread)} tokens`,
    `- Baseline prefix: ${formatTokens(scenario.baseline)} tokens`,
    `- Each turn adds: ${formatTokens(scenario.inputPerTurn)} input and ${formatTokens(scenario.outputPerTurn)} output tokens`,
    `- Turns ahead: ${last}`,
    '',
    '## Up front',
    '',
    '- Keep going: $0.00',
    `- Compact now: ${formatCost(parts.total)} (read history ${formatCost(parts.summarize)}, generate the summary ${formatCost(parts.generate)}, rebuild the cache ${formatCost(parts.rebuild)})`,
    `- Clear now: ${formatCost(projection.clearOneTime)}`,
  ];

  if (projection.later) {
    lines.push(
      `- Compact later, after ${scenario.laterAfter} turns: ${formatCost(projection.later[scenario.laterAfter] - projection.keep[scenario.laterAfter])} when it happens`,
    );
  }

  lines.push(
    '',
    '## Pays for itself',
    '',
    `- Compacting: ${payback(projection.compactCrossover, last)}`,
    `- Clearing: ${payback(projection.clearCrossover, last)}`,
  );

  if (projection.later) {
    lines.push(`- Compacting later: ${payback(projection.laterCrossover, last)}`);
  }

  lines.push(
    '',
    `## Total after ${last} turns`,
    '',
    `- Keep going: ${formatCost(projection.keep[last])}`,
    `- Compact now: ${formatCost(projection.compact[last])}`,
    `- Clear now: ${formatCost(projection.clear[last])}`,
  );

  if (projection.later) lines.push(`- Compact later: ${formatCost(projection.later[last])}`);

  lines.push(
    '',
    'Turn size is held constant and auto-compaction isn’t modelled. See the Compact or Clear page for the assumptions.',
    '',
  );

  return lines.join('\n');
};
