import type { ExperimentMetadata } from '$lib/experiments/registry';

export const experiment: ExperimentMetadata = {
  title: 'Cache Break-Even',
  description:
    'Work out whether switching models or effort levels mid-session pays back the cost of re-caching everything already in context, from your own session or from numbers you type.',
  added: '2026-10-04',
};
