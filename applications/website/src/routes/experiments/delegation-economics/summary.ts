import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';

import type { Verdict } from './checklist';
import {
  bestWorkersText,
  costText,
  formatMultiplier,
  formatPercent,
  tokensText,
  wallClockText,
} from './display';
import type { Evaluation } from './economics';
import { teamMultiplierFor } from './economics';
import { modelLabel } from './pricing';
import type { WorkerModel } from './pricing';
import { modeLabel, toInputs } from './scenario';
import type { Scenario } from './scenario';

/** A Markdown block with the inputs, the three results, and the verdict. */
export const summaryToMarkdown = (
  scenario: Scenario,
  model: WorkerModel,
  evaluation: Evaluation,
  verdict: Verdict,
): string => {
  const team = scenario.mode !== 'subagents';
  const lines = [
    '# Should I fan out?',
    '',
    '## Inputs',
    '',
    `- Mode: ${modeLabel(scenario.mode)}`,
    `- Solo duration: ${scenario.soloMinutes} minutes`,
    `- Serial fraction: ${formatPercent(scenario.serialFraction)}`,
    `- Workers: ${scenario.workers}`,
    `- Integration per worker: ${scenario.integrationMinutes} minutes`,
    `- Spawn overhead per worker: ${formatTokens(scenario.spawnTokens)} tokens`,
    `- Shared context every worker reads: ${formatTokens(scenario.sharedTokens)} tokens`,
    `- Unique work input: ${formatTokens(scenario.uniqueTokens)} tokens`,
    `- Output per worker: ${formatTokens(scenario.outputTokens)} tokens`,
    `- Report per worker: ${formatTokens(scenario.reportTokens)} tokens`,
    `- Worker model: ${modelLabel(model)}`,
    `- Shared cached prefix: ${scenario.sharedPrefix ? 'on' : 'off'}`,
  ];

  if (team) {
    lines.push(
      `- Team multiplier: ${formatMultiplier(teamMultiplierFor(toInputs(scenario, model)))} the tokens of one session`,
    );
  }

  lines.push(
    '',
    '## Results',
    '',
    `- Wall-clock: ${wallClockText(evaluation)}${team ? ', assumed similar to subagents' : ''}`,
    `- Tokens: ${tokensText(evaluation)}`,
    `- Cost: ${costText(evaluation)}`,
    `- ${bestWorkersText(evaluation)}`,
    `- Amdahl’s bound at ${evaluation.workers} workers: ${formatMultiplier(evaluation.idealSpeedup)}. ${
      evaluation.ceiling === null
        ? 'With no serial work there’s no ceiling.'
        : `Never faster than ${formatMultiplier(evaluation.ceiling)}.`
    }`,
    '',
    '## Verdict',
    '',
    ...(verdict.reasons.length > 0
      ? verdict.reasons.map((reason) => `- ${reason}`)
      : [verdict.headline]),
    '',
  );

  return lines.join('\n');
};
