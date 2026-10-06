import type { ExperimentMetadata } from '$lib/experiments/registry';

export const experiment: ExperimentMetadata = {
  title: 'Loop Governor',
  description:
    'Simulate thousands of runs of an agent loop to see how often it finishes honestly, stops on a false “done”, or runs away with your budget, and which governors change that.',
  added: '2026-10-04',
};
