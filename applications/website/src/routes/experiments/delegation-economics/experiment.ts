import type { ExperimentMetadata } from '$lib/experiments/registry';

export const experiment: ExperimentMetadata = {
  title: 'Should I Fan Out?',
  description:
    'See how much faster a task finishes when you split it across subagents or an agent team, and how many more tokens and dollars it costs than one session.',
  added: '2026-10-04',
};
