import type { ExperimentMetadata } from '$lib/experiments/registry';

export const experiment: ExperimentMetadata = {
  title: 'Workflow Visualizer',
  description:
    'Paste or load a Claude Code workflow script to see its agents, fan-outs, and phases as a diagram, check it for mistakes, and export it as a Codex workflow.',
  added: '2026-10-06',
};
