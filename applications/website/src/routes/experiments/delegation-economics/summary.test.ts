import { describe, expect, it } from 'vitest';

import { noChecks, verdict } from './checklist';
import { evaluate } from './economics';
import type { WorkerModel } from './pricing';
import { defaultScenario, toInputs } from './scenario';
import { summaryToMarkdown } from './summary';

const sonnet: WorkerModel = {
  id: 'claude-sonnet-5-5',
  name: 'Claude Sonnet 5.5',
  input: 2,
  cachedInput: 0.2,
  output: 10,
};

describe('summaryToMarkdown', () => {
  it('lists the inputs, the three results, and the verdict', () => {
    const scenario = defaultScenario(sonnet.id);
    const evaluation = evaluate(toInputs(scenario, sonnet));
    const markdown = summaryToMarkdown(
      scenario,
      sonnet,
      evaluation,
      verdict({ ...noChecks, interface: true }, evaluation),
    );

    expect(markdown).toContain('# Should I fan out?');
    expect(markdown).toContain('- Serial fraction: 40%');
    expect(markdown).toContain('- Worker model: Claude Sonnet 5.5 ($2 / $0.2 cached / $10)');
    expect(markdown).toContain('- Wall-clock: 45 min vs 60 solo (1.33× faster)\n');
    expect(markdown).toContain('- Tokens: 608K vs 370K (1.64×)');
    expect(markdown).toContain('- Cost: $1.38 vs $0.90');
    expect(markdown).toContain('Never faster than 2.5×.');
    expect(markdown).toContain(
      '## Verdict\n\n- Don’t fan out yet: resolve the shared interface first.',
    );
  });

  it('says a team’s wall-clock is assumed', () => {
    const scenario = { ...defaultScenario(sonnet.id), mode: 'team' as const, workers: 3 };
    const evaluation = evaluate(toInputs(scenario, sonnet));
    const markdown = summaryToMarkdown(scenario, sonnet, evaluation, verdict(noChecks, evaluation));

    expect(markdown).toContain('assumed similar to subagents');
    expect(markdown).toContain('- Team multiplier: 3.5× the tokens of one session');
  });
});
