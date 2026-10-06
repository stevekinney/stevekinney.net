import type { ExperimentMetadata } from '$lib/experiments/registry';

export const experiment: ExperimentMetadata = {
  title: 'Is It the Model, or Your Machine?',
  description:
    'Drop in your Claude Code session transcripts and find the failures that keep coming back, ranked by sessions affected, and how many come from your environment rather than the model.',
  added: '2026-10-04',
};
