import {
  biggestTerm,
  findTerm,
  formatPercent,
  formatTokens,
  isOver,
  percentOf,
  terms,
  usable,
} from './budget';
import type { Scenario } from './budget';

export type SummaryEvidence = {
  /** Estimated tokens in the included files. */
  tokens: number;
  fileCount: number;
  charactersPerToken: number;
};

const MINUS = '−';

/**
 * A Markdown summary with the identity filled in with numbers. It holds the
 * scenario's figures and, if there are files, their count and total, but never
 * a path or a pasted readout.
 */
export const buildSummary = (scenario: Scenario, evidence: SummaryEvidence | null): string => {
  const left = usable(scenario);
  const biggest = biggestTerm(scenario);
  const lines = [
    '## Usable evidence budget',
    '',
    'usable evidence budget = context capacity',
    ...terms.map(
      (term) => `  ${MINUS} ${term.name.toLowerCase()} (${formatTokens(scenario[term.key])})`,
    ),
    `  = ${formatTokens(left)}`,
    '',
    `With ${formatTokens(scenario.capacity)} of context capacity, ${formatTokens(
      scenario.capacity - left,
    )} is claimed before any evidence goes in.`,
    '',
    isOver(scenario)
      ? `- Usable: ${formatTokens(left)}. The claims exceed the window by ${formatTokens(-left)}.`
      : `- Usable: ${formatTokens(left)} (${formatPercent(percentOf(left, scenario.capacity))} of the window)`,
  ];

  if (biggest) {
    lines.push(
      `- Largest single draw: ${findTerm(biggest).name.toLowerCase()} (${formatTokens(
        scenario[biggest],
      )}, ${formatPercent(percentOf(scenario[biggest], scenario.capacity))} of the window)`,
    );
  }

  if (evidence && evidence.fileCount > 0) {
    const verdict =
      evidence.tokens <= left
        ? `fits with ${formatTokens(left - evidence.tokens)} to spare`
        : `over by ${formatTokens(evidence.tokens - left)}`;

    lines.push(
      `- Evidence: about ${formatTokens(evidence.tokens)} across ${evidence.fileCount} ${
        evidence.fileCount === 1 ? 'file' : 'files'
      } at ${evidence.charactersPerToken} characters per token, ${verdict}`,
    );
  }

  lines.push(
    '',
    '_This is planning arithmetic, not a measurement. Token counts are estimates._',
    '',
  );

  return lines.join('\n');
};
