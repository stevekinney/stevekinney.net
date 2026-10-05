import { describe, expect, it } from 'vitest';

import { formatCost } from '$lib/experiments/format';

import modelPricingData from '../model-calculator/model-pricing.toml';
import { parseModelPricingCatalog } from '../model-calculator/model-pricing-schema';

import { defaultConfig } from './config';
import type { WorkflowConfig } from './config';
import { toWorkflowModels } from './models';
import { findPreset } from './presets';
import { checkScale, describeScale, estimateCost, LIMITS, modelChoiceCallout } from './scale';

const models = toWorkflowModels(parseModelPricingCatalog(modelPricingData));
const bigFanOut = (): WorkflowConfig => findPreset('big-fan-out')!.config();

describe('acceptance check 4: a large workflow', () => {
  const estimate = estimateCost(bigFanOut(), models);
  const check = checkScale(50, estimate.agents, estimate.tokens);

  it('counts 50 items × 2 stages plus one scout as 101 agents', () => {
    expect(estimate.agents).toBe(101);
    expect(check.largeByAgents).toBe(true);
  });

  it('projects 3.03M tokens at 30K per agent, past the 1.5M warning', () => {
    expect(estimate.tokens).toBe(3_030_000);
    expect(check.largeByTokens).toBe(true);
    expect(describeScale(check, 50, estimate.agents, estimate.tokens).warnings).toEqual([
      'Large workflow: 101 agents is more than 25.',
      'Large workflow: 3.03M projected tokens is more than 1.5M.',
    ]);
  });
});

describe('the warning thresholds', () => {
  it('warns only strictly above 25 agents and 1,500,000 tokens, as the runtime does', () => {
    expect(checkScale(1, 25, 1_500_000)).toMatchObject({
      largeByAgents: false,
      largeByTokens: false,
    });
    expect(checkScale(1, 26, 1_500_001)).toMatchObject({
      largeByAgents: true,
      largeByTokens: true,
    });
  });

  it('rejects more than 4,096 items and refuses more than 1,000 agents', () => {
    expect(checkScale(4_096, 1_000, 0)).toMatchObject({
      itemsRejected: false,
      agentsRefused: false,
    });
    const over = checkScale(4_097, 1_001, 0);
    expect(over).toMatchObject({ itemsRejected: true, agentsRefused: true });
    expect(describeScale(over, 4_097, 1_001, 0).refusals).toEqual([
      'Rejected: pipeline() and parallel() take at most 4,096 items per call, per the workflows documentation, and this call has 4,097. No agent starts.',
      'Refused: a run can have at most 1,000 agents, per the workflows documentation, and this one schedules 1,001.',
    ]);
  });

  it('keeps the documented defaults', () => {
    expect(LIMITS.defaultConcurrency).toBe(16);
    expect(LIMITS.maximumConcurrency).toBe(256);
  });
});

describe('acceptance check 5: choosing a model per stage', () => {
  it('costs $12.12 with every agent on Opus 5.5 at $4 per million input tokens', () => {
    const estimate = estimateCost(bigFanOut(), models);

    expect(
      estimate.rows.every((row) => row.model.name === 'Opus 5.5' && row.source === 'session'),
    ).toBe(true);
    expect(estimate.cost).toBe(12.12);
    expect(formatCost(estimate.cost)).toBe('$12.12');
    expect(modelChoiceCallout(bigFanOut(), models)).toBeNull();
  });

  it('costs $7.62 with stage 1 on Haiku 4.5: 1.5M × $1 + 1.5M × $4 + 0.03M × $4', () => {
    const config = bigFanOut();
    config.stages[0].modelId = 'claude-haiku-4-5';
    const estimate = estimateCost(config, models);

    expect(estimate.rows.map((row) => [row.tokens, row.model.input])).toEqual([
      [1_500_000, 1],
      [1_500_000, 4],
      [30_000, 4],
    ]);
    expect(estimate.cost).toBe(7.62);
  });

  it('says that saves $4.50 (37%)', () => {
    const config = bigFanOut();
    config.stages[0].modelId = 'claude-haiku-4-5';

    expect(modelChoiceCallout(config, models)).toBe(
      'Setting stage 1 to Haiku 4.5 saves $4.50 (37%).',
    );
  });

  it('says what a dearer choice costs, and sums several stage choices', () => {
    const dearer = bigFanOut();
    dearer.stages[1].modelId = 'claude-fable-5-1';
    expect(modelChoiceCallout(dearer, models)).toBe(
      'Setting stage 2 to Fable 5.1 costs $9.00 (74%) more.',
    );

    const both = bigFanOut();
    both.stages[0].modelId = 'claude-haiku-4-5';
    both.stages[1].definitionModelId = 'claude-haiku-4-5';
    expect(modelChoiceCallout(both, models)).toBe('Choosing models per stage saves $9.00 (74%).');
  });
});

describe('estimateCost', () => {
  it('rounds an exact half cent up, so $0.335 shows as $0.34', () => {
    const config: WorkflowConfig = {
      ...defaultConfig(),
      items: 1,
      scout: false,
      stages: [{ ...defaultConfig().stages[0], tokens: 335_000, modelId: 'claude-haiku-4-5' }],
    };
    const estimate = estimateCost(config, models);

    expect(estimate.cost).toBe(0.335);
    expect(formatCost(estimate.cost)).toBe('$0.34');
  });

  it('prices the output share at the output rate', () => {
    const config: WorkflowConfig = {
      ...defaultConfig(),
      items: 10,
      scout: false,
      outputPercent: 25,
      stages: [{ ...defaultConfig().stages[0], tokens: 100_000 }],
    };

    // 1M tokens on Opus 5.5: 750K × $4 + 250K × $20 = $3 + $5.
    expect(estimateCost(config, models).cost).toBe(8);
  });

  it('runs the scout on the environment variable’s model when it is set', () => {
    const config: WorkflowConfig = { ...bigFanOut(), environmentModelId: 'claude-sonnet-5-5' };
    const scout = estimateCost(config, models).rows.at(-1)!;

    expect(scout).toMatchObject({ key: 'scout', source: 'environment', agents: 1 });
    expect(scout.model.name).toBe('Sonnet 5.5');
  });

  it('leaves the scout out when it is off', () => {
    const estimate = estimateCost({ ...bigFanOut(), scout: false }, models);

    expect(estimate.agents).toBe(100);
    expect(estimate.tokens).toBe(3_000_000);
  });
});
