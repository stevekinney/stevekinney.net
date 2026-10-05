import { describe, expect, it } from 'vitest';

import { findMechanism, isMechanismId } from './mechanisms';
import { grade, missReason, outlineScenarios, predictScenario } from './scenarios';

describe('acceptance 1: the predict-first card', () => {
  it('asks about ensuring all contributors obey a check', () => {
    expect(predictScenario.text).toBe('Ensure all contributors obey this check');
  });

  it('answers with a required CI check', () => {
    expect(findMechanism(predictScenario.answer).name).toBe('Required CI check');
    expect(grade(predictScenario, 'ci')).toBe('match');
  });

  it('explains that a local hook is not the shared integration boundary', () => {
    expect(grade(predictScenario, 'hook')).toBe('miss');
    expect(missReason(predictScenario, 'hook')).toBe(
      'A local agent hook is not the shared integration boundary.',
    );
  });

  it('has no specific reason for a pick nobody is tempted by', () => {
    expect(missReason(predictScenario, 'skill')).toBeNull();
  });
});

describe('the outline’s scenarios', () => {
  it('has all eighteen cards with unique IDs and real answers', () => {
    expect(outlineScenarios).toHaveLength(18);
    expect(new Set(outlineScenarios.map((scenario) => scenario.id)).size).toBe(18);
    for (const scenario of outlineScenarios) {
      expect(isMechanismId(scenario.answer)).toBe(true);
      expect(scenario.reasoning.trim()).not.toBe('');
      if (scenario.tempting?.id) expect(scenario.tempting.id).not.toBe(scenario.answer);
    }
  });

  it.each([
    ['Format every file the agent edits', 'hook', 'instructions'],
    ['Never read `.env` files', 'permission', 'instructions'],
    ['Run a dependency audit every Monday', 'routine', 'hook'],
    ['Ensure every contributor’s change passes the contract tests', 'ci', 'hook'],
    ['How to investigate a failed billing contract test', 'skill', 'instructions'],
    ['Run `pnpm test:billing` from `apps/api` after billing changes', 'instructions', 'skill'],
    ['Three to five independent investigations', 'subagent', 'workflow'],
    ['Dozens to hundreds of agents, or an orchestration you’ll rerun', 'workflow', 'agent-team'],
    ['Workers need to argue with each other', 'agent-team', 'subagent'],
    ['A checkable outcome that takes many turns', 'goal', 'loop'],
    ['One command decides it’s done', 'hook', 'goal'],
    ['Watch for a deploy to finish while the session is open', 'loop', 'goal'],
    ['Must run while you’re away', 'routine', 'loop'],
    ['Hard spending caps and fresh context for each attempt', 'external-loop', 'goal'],
    ['A different model, tools, or permissions for one task', 'subagent', 'skill'],
    ['Five to thirty worktree pull requests', 'batch', 'workflow'],
    ['One edit you’re watching', 'prompt', null],
    ['Mid-run human approval is required', 'dispatch', 'workflow'],
  ])('“%s” is %s, and the tempting answer is %s', (text, answer, tempting) => {
    const scenario = outlineScenarios.find((entry) => entry.text === text);

    expect(scenario?.answer).toBe(answer);
    expect(scenario?.tempting?.id ?? null).toBe(tempting);
  });
});

describe('grade', () => {
  const env = outlineScenarios.find((scenario) => scenario.id === 'never-read-env')!;

  it('accepts a defensible alternative without marking it wrong', () => {
    expect(grade(env, 'permission')).toBe('match');
    expect(grade(env, 'sandbox')).toBe('alternative');
    expect(grade(env, 'instructions')).toBe('miss');
  });

  it('gives the tempting answer’s reason only for the tempting pick', () => {
    expect(missReason(env, 'instructions')).toBe('An instruction is not a guarantee.');
    expect(missReason(env, 'hook')).toBeNull();
  });
});
