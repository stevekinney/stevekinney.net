import { describe, expect, it } from 'vitest';

import modelPricingData from '../model-calculator/model-pricing.toml';
import { parseModelPricingCatalog } from '../model-calculator/model-pricing-schema';

import { toWorkflowModels } from './models';
import { findPreset, presets } from './presets';
import { runWorkflow } from './run';

const models = toWorkflowModels(parseModelPricingCatalog(modelPricingData));
const run = (id: string) => runWorkflow(findPreset(id)!.config(), models);

describe('presets', () => {
  it('has unique IDs and a notice for each', () => {
    expect(new Set(presets.map((preset) => preset.id)).size).toBe(presets.length);
    for (const preset of presets) expect(preset.notice.length).toBeGreaterThan(20);
  });

  it('slow first, slow last: pipeline() 11 and parallel() 20', () => {
    const { runs } = run('slow-first-slow-last');

    expect(runs?.pipeline.schedule.makespan).toBe(11);
    expect(runs?.parallel.schedule.makespan).toBe(20);
  });

  it('concurrency 1: both 26', () => {
    const { runs } = run('concurrency-1');

    expect(runs?.pipeline.schedule.makespan).toBe(26);
    expect(runs?.parallel.schedule.makespan).toBe(26);
  });

  it('a barrier that’s needed: pipeline() is sooner, but the stage needs every finding', () => {
    const preset = findPreset('barrier-needed')!;
    const { runs } = run('barrier-needed');

    expect(preset.config().stages[1].name).toBe('Dedupe');
    expect(runs!.pipeline.schedule.makespan).toBeLessThan(runs!.parallel.schedule.makespan);
  });

  it('big fan-out on Opus: 101 agents that all inherit, $12.12, and both warnings', () => {
    const result = run('big-fan-out');

    expect(result.estimate.agents).toBe(101);
    expect(result.estimate.cost).toBe(12.12);
    expect(result.inherits).toBe(true);
    expect(result.warnings).toHaveLength(2);
  });

  it('silent drops: 47 of 50 items, with 3 dropped silently, under both strategies', () => {
    const { runs } = run('silent-drops');

    for (const strategy of ['pipeline', 'parallel'] as const) {
      expect(runs?.[strategy].results?.headline).toBe('47 of 50 items (3 dropped silently)');
      expect(runs?.[strategy].results?.reported).toBe('Run completed — 47 results');
    }
  });
});

describe('runWorkflow', () => {
  it('simulates nothing when the runtime would reject the items', () => {
    const result = runWorkflow({ ...findPreset('big-fan-out')!.config(), items: 5_000 }, models);

    expect(result.runs).toBeNull();
    expect(result.refusals[0]).toMatch(/^Rejected:/);
  });

  it('simulates nothing past 1,000 agents', () => {
    const result = runWorkflow({ ...findPreset('big-fan-out')!.config(), items: 600 }, models);

    expect(result.estimate.agents).toBe(1_201);
    expect(result.runs).toBeNull();
    expect(result.refusals).toEqual([expect.stringMatching(/^Refused:/)]);
  });
});
