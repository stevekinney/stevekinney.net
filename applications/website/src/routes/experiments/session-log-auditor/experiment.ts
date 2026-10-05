import type { ExperimentMetadata } from '$lib/experiments/registry';

export const experiment: ExperimentMetadata = {
  title: 'Session Log Auditor',
  description:
    'Drop in your Claude Code session transcripts and count what actually goes wrong: recurring tool failures clustered by session, how many come from your environment rather than the model, what the sessions cost, and whether the problems you fixed stay fixed.',
  added: '2026-10-04',
};
