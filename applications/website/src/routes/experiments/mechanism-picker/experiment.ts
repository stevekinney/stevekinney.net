import type { ExperimentMetadata } from '$lib/experiments/registry';

export const experiment: ExperimentMetadata = {
  title: 'Which Primitive?',
  description:
    'Decide whether something belongs in a prompt, your instructions, a skill, a subagent, a hook, a workflow, a loop, a routine, or CI, and lint a CLAUDE.md for rules that need a stronger rung.',
  added: '2026-10-04',
};
