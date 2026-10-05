import type { ExperimentMetadata } from '$lib/experiments/registry';

export const experiment: ExperimentMetadata = {
  title: 'Workflow Fan-Out',
  description:
    'Animate a multi-stage workflow under pipeline() and parallel(), see what .filter(Boolean) hides in the results, estimate what the run costs by model, and lint a pasted orchestration script.',
  added: '2026-10-04',
};
