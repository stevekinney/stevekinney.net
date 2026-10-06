import { describe, expect, it } from 'vitest';

import modelPricingData from '$lib/experiments/model-pricing.toml';
import { parseModelPricingCatalog } from '$lib/experiments/model-pricing-schema';

import { toWorkflowModels } from './models';
import { revealPrediction } from './predict';
import { findPreset } from './presets';
import { runWorkflow } from './run';
import { compareMakespans, summaryToMarkdown } from './summary';

const models = toWorkflowModels(parseModelPricingCatalog(modelPricingData));

describe('summaryToMarkdown', () => {
  it('lists the makespans, agents, cost, and warnings', () => {
    const config = findPreset('big-fan-out')!.config();
    config.durationMode = 'manual';
    config.manual = Array.from({ length: 50 }, () => [1, 1]);
    config.concurrency = 256;
    const markdown = summaryToMarkdown(config, runWorkflow(config, models));

    expect(markdown).toContain('- pipeline() makespan: 2 min');
    expect(markdown).toContain('- parallel() makespan: 2 min');
    expect(markdown).toContain('- Agents scheduled: 101');
    expect(markdown).toContain('- Projected tokens: 3.03M');
    expect(markdown).toContain('- Estimated cost: $12.12');
    expect(markdown).toContain('### Warnings');
    expect(markdown).toContain('- Large workflow: 101 agents is more than 25.');
    expect(markdown).toContain('- Every agent runs on your session model.');
  });

  it('includes the silent drops', () => {
    const config = findPreset('silent-drops')!.config();

    expect(summaryToMarkdown(config, runWorkflow(config, models))).toContain(
      '- Results: 47 of 50 items (3 dropped silently)',
    );
  });
});

describe('compareMakespans', () => {
  it('says one stage makes both strategies identical', () => {
    expect(compareMakespans(5, 5, 1)).toBe(
      'With one stage there’s no barrier, so both strategies are identical.',
    );
  });

  it('names the faster strategy and the gap', () => {
    expect(compareMakespans(11, 20, 2)).toBe('pipeline() finishes 9 min sooner than parallel().');
    expect(compareMakespans(26, 26, 2)).toBe('Both strategies take 26 min.');
  });
});

describe('revealPrediction', () => {
  it('confirms a guess of pipeline() by 9 minutes', () => {
    const reveal = revealPrediction({ winner: 'pipeline', minutes: 9 }, 11, 20);

    expect(reveal).toMatchObject({
      winner: 'pipeline',
      gap: 9,
      correctWinner: true,
      correctGap: true,
    });
    expect(reveal.message).toBe(
      'You called it. pipeline() finishes first, 9 min sooner: 11 min against 20 min.',
    );
  });

  it('explains the common tie guess', () => {
    const reveal = revealPrediction({ winner: 'tie', minutes: null }, 11, 20);

    expect(reveal.correctWinner).toBe(false);
    expect(reveal.message).toContain('Most people guess a tie');
  });

  it('credits the strategy but not a wrong gap', () => {
    expect(revealPrediction({ winner: 'pipeline', minutes: 3 }, 11, 20).message).toMatch(
      /^Right strategy, but you guessed 3 min\./,
    );
  });
});
