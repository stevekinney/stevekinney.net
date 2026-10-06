import type { ExperimentMetadata } from '$lib/experiments/registry';

export const experiment: ExperimentMetadata = {
  title: 'Usable Evidence Budget',
  description:
    'See how much of a model’s context window is left for the files you are working on after instructions, history, tools, reserved output, and compaction margin each take their share, then drop in files to check whether they fit.',
  added: '2026-10-04',
};
