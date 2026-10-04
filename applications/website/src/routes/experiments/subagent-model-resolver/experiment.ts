import type { ExperimentMetadata } from '$lib/experiments/registry';

export const experiment: ExperimentMetadata = {
  title: 'Which Model Actually Runs',
  description:
    'Work out which model a Claude Code subagent really runs on, on any version, and audit your own agent files to see what changes when you upgrade.',
  added: '2026-10-04',
};
