import { formatCost } from '$lib/experiments/format';

import { analyticRows } from './analytic';
import { crossoverIteration } from './cost';
import { claimChance, findMarker, governorIds } from './loop-config';
import type { Config } from './loop-config';
import {
  formatCount,
  formatProbability,
  formatShare,
  governorLabels,
  outcomeStyles,
  stopReasonLabels,
} from './labels';
import { outcomeIds } from './simulate';
import type { StopReason, Tally } from './simulate';
import { costStatistics } from './statistics';

const markerText = (config: Config): string => findMarker(config.marker).name.replaceAll('`', '');

const governorText = (config: Config): string => {
  const on = [...governorIds, 'stopFile' as const].filter((id) => config.governors[id]);
  if (on.length === 0) return 'none';

  return on
    .map((id) => {
      if (id === 'maxIterations') return `maximum ${config.maxIterations} iterations`;
      if (id === 'budget') return `budget ${formatCost(config.budget)}`;
      if (id === 'stall') return `stall detector of ${config.stallM}`;

      return governorLabels[id].toLowerCase();
    })
    .join(', ');
};

/** A Markdown report of the configuration, the outcome distribution, and the costs. */
export const buildSummary = (config: Config, tally: Tally, link: string | null = null): string => {
  const statistics = costStatistics(tally.costs.subarray(0, tally.runs));
  const lines = [
    '# Loop Governor simulation',
    '',
    `${formatCount(tally.runs)} simulated runs, seed ${config.seed}.`,
    '',
    '## Configuration',
    '',
    config.impossible
      ? `- Task: impossible (p = 0); cheats in ${formatShare(config.honestWayOut ? config.cheatWith : config.cheatWithout)} of runs (cited, ImpossibleBench)`
      : `- Progress per iteration: p = ${formatProbability(config.p)}, ${config.k} needed`,
    `- Marker: ${markerText(config)}, q = ${formatProbability(claimChance(config))} (illustrative)`,
    `- Dual condition: ${config.dual ? 'on' : 'off'}`,
    `- Measurement throws: e = ${formatProbability(config.e)}, fails ${config.failureMode}`,
    config.context === 'fresh'
      ? `- Context: fresh, ${formatCost(config.c0)} + ${formatCost(config.r)} re-read per iteration`
      : `- Context: accumulating, ${formatCost(config.c0)} + ${formatCost(config.g)} × i at iteration i`,
    `- Governors: ${governorText(config)}`,
    `- Honest way out: ${config.honestWayOut ? 'on' : 'off'}`,
    '',
    '## Outcomes',
    '',
    '| Outcome | Runs | Share |',
    '| --- | ---: | ---: |',
    ...outcomeIds.map(
      (id) =>
        `| ${outcomeStyles[id].label} | ${formatCount(tally.outcomes[id])} | ${formatShare(tally.outcomes[id] / Math.max(1, tally.runs))} |`,
    ),
  ];

  const stops = (Object.entries(tally.stoppedBy) as [StopReason, number][]).filter(
    ([, count]) => count > 0,
  );
  if (stops.length > 0) {
    lines.push(
      '',
      `Stopped by: ${stops.map(([id, count]) => `${stopReasonLabels[id].toLowerCase()} ${formatCount(count)}`).join(', ')}.`,
    );
  }
  if (config.dual) {
    lines.push(
      '',
      `The dual condition caught ${formatCount(tally.prematureClaims)} premature claims in ${formatCount(tally.runsWithClaims)} runs.`,
    );
  }

  lines.push(
    '',
    '## Cost per run',
    '',
    `- Median: ${formatCost(statistics.median)}`,
    `- 95th percentile: ${formatCost(statistics.p95)}`,
    `- Maximum: ${formatCost(statistics.maximum)}`,
  );

  const crossover = crossoverIteration(config.r, config.g);
  if (crossover !== null) {
    lines.push(`- Fresh context is cheaper in total from iteration ${crossover} on.`);
  }

  const rows = analyticRows(config, tally);
  if (rows.length > 0) {
    lines.push('', '## Exact against simulated', '');
    for (const row of rows) {
      const show = (value: number): string =>
        row.kind === 'share' ? formatShare(value) : value.toFixed(3);
      lines.push(`- ${row.label}: ${show(row.exact)} exact, ${show(row.simulated)} simulated`);
    }
  }

  lines.push('', 'The marker q values are illustrative, not measured.');
  if (link) lines.push('', link);

  return `${lines.join('\n')}\n`;
};
