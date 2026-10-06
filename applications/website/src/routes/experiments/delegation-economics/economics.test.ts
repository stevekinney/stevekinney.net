import { describe, expect, it } from 'vitest';

import { formatCost } from '$lib/experiments/format';

import modelPricingData from '$lib/experiments/model-pricing.toml';
import { parseModelPricingCatalog } from '$lib/experiments/model-pricing-schema';
import {
  amdahl,
  bestWorkers,
  evaluate,
  fanTokens,
  soloTokens,
  speedupCeiling,
  speedupCurve,
  wallClockMinutes,
} from './economics';
import type { EconomicsInputs } from './economics';
import { answerText, bestWorkersText, detailText, formatMultiplier } from './display';
import { applyPreset, findPreset } from './presets';
import type { PresetId } from './presets';
import { findModel, toWorkerPricing } from './pricing';
import { defaultScenario, toInputs } from './scenario';
import type { Scenario } from './scenario';

// The real shared price table, through its real loader: these checks fail if it drifts.
const pricing = toWorkerPricing(parseModelPricingCatalog(modelPricingData));
const sonnet = findModel(pricing.models, pricing.defaultModelId);

const scenario = (patch: Partial<Scenario> = {}): Scenario => ({
  ...defaultScenario(pricing.defaultModelId),
  ...patch,
});

const inputs = (patch: Partial<Scenario> = {}): EconomicsInputs =>
  toInputs(scenario(patch), sonnet);

const preset = (id: PresetId): EconomicsInputs =>
  toInputs(applyPreset(findPreset(id)!, scenario()), sonnet);

describe('Amdahl’s law', () => {
  it('gives 1.818 for 40% serial work on 4 workers, shown as 1.82×', () => {
    expect(amdahl(0.4, 4)).toBeCloseTo(1.818, 3);
    expect(formatMultiplier(amdahl(0.4, 4))).toBe('1.82×');
  });

  it('never passes 2.5× however many workers you add', () => {
    expect(speedupCeiling(0.4)).toBe(2.5);
    expect(amdahl(0.4, 32)).toBeLessThan(2.5);
    expect(amdahl(0.4, 1_000_000)).toBeCloseTo(2.5, 4);
  });
});

describe('the defaults', () => {
  it('take 60 × 0.55 + 12 = 45 minutes with 4 workers, a 1.33× speedup', () => {
    expect(wallClockMinutes(60, 0.4, 3, 4)).toBeCloseTo(45, 10);

    const evaluation = evaluate(inputs());
    expect(evaluation.fanMinutes).toBeCloseTo(45, 10);
    expect(evaluation.speedup).toBeCloseTo(1.3333, 4);
  });

  it('also take 45 minutes with 3 workers, so the best is 3 or 4', () => {
    const best = bestWorkers(60, 0.4, 3);

    expect(best.workers).toBe(3);
    expect(best.tied).toEqual([3, 4]);
    expect(bestWorkersText(evaluate(inputs()))).toBe(
      'Fastest at 3 or 4 workers (45 min). However many workers you add, it’s never faster than 2.5×.',
    );
  });

  it('read 350K solo and 4 × 70K + 300K + 8K = 588K fanned out, with 20K of output either way', () => {
    const evaluation = evaluate(inputs());

    expect(soloTokens(inputs())).toEqual({ input: 350_000, output: 20_000, total: 370_000 });
    expect(fanTokens(inputs())).toEqual({ input: 588_000, output: 20_000, total: 608_000 });
    expect(evaluation.tokenMultiplier).toBeCloseTo(608 / 370, 10);
  });

  it('cost 0.35 × $2 + 0.02 × $10 = $0.90 solo and $1.38 fanned out on Sonnet 5.5', () => {
    const evaluation = evaluate(inputs());

    expect(sonnet).toMatchObject({ input: 2, output: 10 });
    expect(formatCost(evaluation.soloCost)).toBe('$0.90');
    expect(evaluation.fanCost).toBeCloseTo(1.376, 10);
    expect(formatCost(evaluation.fanCost)).toBe('$1.38');
  });

  it('answer in one line', () => {
    const evaluation = evaluate(inputs());

    expect(answerText(evaluation)).toBe('4 workers: 1.33× faster, 1.53× the cost');
    expect(detailText(evaluation)).toBe('45 min instead of 60, and 608K tokens instead of 370K.');
  });

  it('round an exact half cent up: $0.335 shows as $0.34', () => {
    const evaluation = evaluate(
      inputs({ sharedTokens: 167_500, uniqueTokens: 0, outputTokens: 0, workers: 1 }),
    );

    expect(evaluation.soloCost).toBe(0.335);
    expect(formatCost(evaluation.soloCost)).toBe('$0.34');
  });
});

describe('presets', () => {
  it('Four reviewers, one monorepo costs 3× as much for a 1.5× speedup', () => {
    const evaluation = evaluate(preset('four-reviewers'));

    expect(evaluation.fan.total).toBe(948_000);
    expect(evaluation.solo.total).toBe(260_000);
    expect(evaluation.fanMinutes).toBeCloseTo(39.5, 10);
    expect(answerText(evaluation)).toBe('4 workers: 1.52× faster, 3.02× the cost');
  });

  it('Ten independent files is a good fit: 1.89× faster for 1.25× the cost', () => {
    const evaluation = evaluate(preset('ten-files'));

    expect(evaluation.fanMinutes).toBeCloseTo(31.8, 10);
    expect(evaluation.fan.total).toBe(560_000);
    expect(evaluation.solo.total).toBe(430_000);
    expect(answerText(evaluation)).toBe('5 workers: 1.89× faster, 1.25× the cost');
  });

  it('keep the selected model', () => {
    const opus = pricing.models.find((model) => model.name === 'Claude Opus 5.5')!;
    const applied = applyPreset(findPreset('ten-files')!, scenario({ modelId: opus.id }));

    expect(applied.modelId).toBe(opus.id);
  });
});

describe('edge cases', () => {
  it('with nothing serial has no ceiling', () => {
    const evaluation = evaluate(inputs({ serialFraction: 0 }));

    expect(evaluation.ceiling).toBeNull();
    expect(evaluation.fanMinutes).toBeCloseTo(27, 10);
  });

  it('with everything serial is slower, and says so', () => {
    const evaluation = evaluate(inputs({ serialFraction: 1 }));

    expect(evaluation.fanMinutes).toBe(72);
    expect(evaluation.slower).toBe(true);
    expect(evaluation.best.workers).toBe(1);
    expect(answerText(evaluation)).toBe('4 workers: 1.2× slower, 1.53× the cost');
  });

  it('treats one worker as the solo session', () => {
    const evaluation = evaluate(inputs({ workers: 1 }));

    expect(evaluation.fanMinutes).toBe(60);
    expect(evaluation.speedup).toBe(1);
    expect(evaluation.fan).toEqual(evaluation.solo);
    expect(answerText(evaluation)).toBe('1 worker is just the solo session.');
  });

  it('with free integration, the best is the most workers', () => {
    expect(evaluate(inputs({ integrationMinutes: 0 })).best.tied).toEqual([32]);
  });

  it('with everything serial and free integration, says adding workers buys nothing', () => {
    expect(bestWorkersText(evaluate(inputs({ serialFraction: 1, integrationMinutes: 0 })))).toBe(
      'Every worker count from 1 to 32 takes the same time, so adding workers buys nothing.',
    );
  });

  it('with every input zero, returns no NaN and no speedup to report', () => {
    const zero = inputs({
      soloMinutes: 0,
      serialFraction: 0,
      integrationMinutes: 0,
      spawnTokens: 0,
      sharedTokens: 0,
      uniqueTokens: 0,
      outputTokens: 0,
      reportTokens: 0,
    });
    const evaluation = evaluate(zero);

    expect(evaluation.speedup).toBeNull();
    expect(evaluation.costMultiplier).toBeNull();
    expect(answerText(evaluation)).toBe('There’s no work to speed up.');
    expect(JSON.stringify(speedupCurve(zero))).not.toContain('NaN');
  });

  it('with no solo time, says integration makes it slower without an infinite multiple', () => {
    const evaluation = evaluate(inputs({ soloMinutes: 0 }));

    expect(evaluation.fanMinutes).toBe(12);
    expect(answerText(evaluation)).toBe('4 workers: slower, 1.53× the cost');
  });
});

describe('speedupCurve', () => {
  it('has a point for every worker count from 1 to 32 that turns down past the best', () => {
    const curve = speedupCurve(inputs());

    expect(curve).toHaveLength(32);
    expect(curve[0]).toMatchObject({ workers: 1, ideal: 1, speedup: 1, minutes: 60 });
    expect(curve[3].tokens).toBe(608_000);
    expect(curve[3].cost).toBeCloseTo(1.376, 10);
    expect(curve[31].speedup!).toBeLessThan(curve[3].speedup!);
  });
});
