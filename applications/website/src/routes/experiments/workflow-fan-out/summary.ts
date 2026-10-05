import { formatCompactTokenCount, formatCost, formatTokenCount } from '$lib/experiments/format';

import type { WorkflowConfig } from './config';
import { describeFailure, formatMinutes } from './results';
import type { WorkflowRun } from './run';

export const INHERIT_WARNING = 'Every agent runs on your session model.';

/** The comparison of the two makespans, in one sentence. */
export const compareMakespans = (pipeline: number, parallel: number, stages: number): string => {
  if (stages === 1) return 'With one stage there’s no barrier, so both strategies are identical.';
  if (pipeline === parallel) return `Both strategies take ${formatMinutes(pipeline)}.`;

  const [winner, loser] =
    pipeline < parallel ? ['pipeline()', 'parallel()'] : ['parallel()', 'pipeline()'];
  const gap = Math.round(Math.abs(pipeline - parallel) * 10) / 10;

  return `${winner} finishes ${formatMinutes(gap)} sooner than ${loser}.`;
};

/** A Markdown summary of the run: makespans, agents, cost, and every warning. */
export const summaryToMarkdown = (config: WorkflowConfig, run: WorkflowRun): string => {
  const { estimate } = run;
  const lines = [
    '## Workflow fan-out',
    '',
    `- Items: ${formatTokenCount(config.items)}, stages: ${config.stages.length}, concurrency: ${config.concurrency}, seed: ${config.seed}`,
  ];

  if (run.runs) {
    const { pipeline, parallel } = run.runs;
    lines.push(
      `- pipeline() makespan: ${formatMinutes(pipeline.schedule.makespan)}`,
      `- parallel() makespan: ${formatMinutes(parallel.schedule.makespan)}`,
      `- ${compareMakespans(pipeline.schedule.makespan, parallel.schedule.makespan, config.stages.length)}`,
    );
    const failure = pipeline.schedule.failure;
    if (failure) {
      lines.push(`- ${describeFailure(failure, config.stages[failure.stage].name)}`);
    } else if (pipeline.results) {
      lines.push(`- Results: ${pipeline.results.headline}`);
    }
  }

  lines.push(
    `- Agents scheduled: ${formatTokenCount(estimate.agents)}`,
    `- Projected tokens: ${formatCompactTokenCount(estimate.tokens)}`,
    `- Estimated cost: ${formatCost(estimate.cost)} (${config.outputPercent}% of tokens priced as output, the rest as uncached input)`,
  );
  for (const row of estimate.rows) {
    lines.push(
      `  - ${row.label}: ${formatTokenCount(row.agents)} on ${row.model.name}, ${formatCost(row.cost)}`,
    );
  }

  const warnings = [
    ...run.refusals,
    ...run.warnings,
    ...(run.inherits ? [INHERIT_WARNING] : []),
    ...(run.callout ? [run.callout] : []),
  ];
  if (warnings.length > 0) {
    lines.push('', '### Warnings', '', ...warnings.map((warning) => `- ${warning}`));
  }

  return `${lines.join('\n')}\n`;
};
