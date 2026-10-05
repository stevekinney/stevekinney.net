import { describe, expect, it } from 'vitest';

import { formatCost } from '$lib/experiments/format';

import modelPricingData from '../model-calculator/model-pricing.toml';
import { parseModelPricingCatalog } from '../model-calculator/model-pricing-schema';
import {
  amdahl,
  bestWorkers,
  continuousOptimum,
  evaluate,
  fanTokens,
  soloTokens,
  speedupCeiling,
  speedupCurve,
  wallClockMinutes,
} from './economics';
import type { EconomicsInputs } from './economics';
import { bestWorkersText, costText, formatMultiplier, tokensText, wallClockText } from './display';
import { applyPreset, findPreset } from './presets';
import type { PresetId } from './presets';
import { findModel, toWorkerPricing } from './pricing';
import { defaultScenario, toInputs } from './scenario';
import type { Scenario } from './scenario';

// The real shared price table, through its real loader: these checks fail if it drifts.
const pricing = toWorkerPricing(parseModelPricingCatalog(modelPricingData));
const sonnet = findModel(pricing.models, pricing.defaultModelId)!;

const scenario = (patch: Partial<Scenario> = {}): Scenario => ({
  ...defaultScenario(pricing.defaultModelId),
  ...patch,
});

const inputs = (patch: Partial<Scenario> = {}): EconomicsInputs =>
  toInputs(scenario(patch), sonnet);

const preset = (id: PresetId): EconomicsInputs =>
  toInputs(applyPreset(findPreset(id)!, scenario()), sonnet);

describe('acceptance check 1: Amdahl’s law', () => {
  it('gives 1.818 for 40% serial work on 4 workers, shown as 1.82×', () => {
    expect(amdahl(0.4, 4)).toBeCloseTo(1.818, 3);
    expect(formatMultiplier(amdahl(0.4, 4))).toBe('1.82×');
  });

  it('never passes 2.5× however many workers you add', () => {
    expect(speedupCeiling(0.4)).toBe(2.5);
    expect(formatMultiplier(speedupCeiling(0.4)!)).toBe('2.5×');
    expect(amdahl(0.4, 32)).toBeLessThan(2.5);
    expect(amdahl(0.4, 1_000_000)).toBeCloseTo(2.5, 4);
  });
});

describe('acceptance check 2: wall-clock at the defaults', () => {
  it('takes 60 × 0.55 + 12 = 45 minutes with 4 workers, a 1.33× speedup', () => {
    expect(wallClockMinutes(60, 0.4, 3, 4)).toBeCloseTo(45, 10);

    const evaluation = evaluate(inputs());
    expect(evaluation.fanMinutes).toBeCloseTo(45, 10);
    expect(evaluation.speedup).toBeCloseTo(1.3333, 4);
    expect(wallClockText(evaluation)).toBe('45 min vs 60 solo (1.33× faster)');
  });

  it('also takes 45 minutes with 3 workers, so the best is 3 or 4 and the fourth buys nothing', () => {
    expect(wallClockMinutes(60, 0.4, 3, 3)).toBeCloseTo(45, 10);

    const best = bestWorkers(60, 0.4, 3);
    expect(best.workers).toBe(3);
    expect(best.tied).toEqual([3, 4]);
    expect(best.minutes).toBeCloseTo(45, 10);
    expect(bestWorkersText(evaluate(inputs()))).toBe(
      'Fastest at 3 or 4 workers (45 min): the fourth worker buys nothing.',
    );
  });

  it('puts the continuous optimum at √12 ≈ 3.46', () => {
    expect(continuousOptimum(60, 0.4, 3)).toBeCloseTo(Math.sqrt(12), 10);
    expect(continuousOptimum(60, 0.4, 3)!.toFixed(2)).toBe('3.46');
  });
});

describe('acceptance check 3: tokens at the defaults', () => {
  it('reads 350K solo', () => {
    expect(soloTokens(inputs()).input).toBe(350_000);
  });

  it('reads 4 × 70K + 300K + 8K = 588K fanned out', () => {
    const fan = fanTokens(inputs());

    expect(fan).toMatchObject({ spawn: 80_000, shared: 200_000, unique: 300_000, reports: 8_000 });
    expect(fan.input).toBe(588_000);
  });

  it('writes 20K of output either way', () => {
    expect(soloTokens(inputs()).output).toBe(20_000);
    expect(fanTokens(inputs()).output).toBe(20_000);
  });

  it('comes to 1.64×: 608K ÷ 370K', () => {
    const evaluation = evaluate(inputs());

    expect(evaluation.fan.total).toBe(608_000);
    expect(evaluation.solo.total).toBe(370_000);
    expect(evaluation.tokenMultiplier).toBeCloseTo(608 / 370, 10);
    expect(tokensText(evaluation)).toBe('608K vs 370K (1.64×)');
  });
});

describe('acceptance check 4: cost on Sonnet 5.5', () => {
  it('prices Sonnet 5.5 from the shared table at $2 input, $0.20 cached, and $10 output', () => {
    expect(sonnet).toMatchObject({ input: 2, cachedInput: 0.2, output: 10 });
  });

  it('costs 0.35 × $2 + 0.02 × $10 = $0.90 solo and $1.38 fanned out', () => {
    const evaluation = evaluate(inputs());

    expect(evaluation.soloCost).toBeCloseTo(0.9, 10);
    expect(evaluation.fanCost).toBeCloseTo(1.376, 10);
    expect(costText(evaluation)).toBe('$1.38 vs $0.90');
  });

  it('costs $1.27 with a shared prefix, as 60K of spawn tokens move to the cached price', () => {
    const evaluation = evaluate(inputs({ sharedPrefix: true }));

    expect(evaluation.fanCost).toBeCloseTo(1.268, 10);
    expect(formatCost(evaluation.fanCost)).toBe('$1.27');
    expect(evaluate(inputs()).fanCost - evaluation.fanCost).toBeCloseTo((60_000 * 1.8) / 1e6, 10);
  });

  it('rounds an exact half cent up: $0.335 shows as $0.34', () => {
    const evaluation = evaluate(
      inputs({ sharedTokens: 167_500, uniqueTokens: 0, outputTokens: 0, workers: 1 }),
    );

    expect(evaluation.soloCost).toBe(0.335);
    expect(formatCost(evaluation.soloCost)).toBe('$0.34');
  });
});

describe('acceptance check 6 and the other presets', () => {
  it('Fan out the serial thing tops out at 1.21× with 8 workers: 1 ÷ (0.8 + 0.025)', () => {
    const evaluation = evaluate(preset('serial'));

    expect(evaluation.workers).toBe(8);
    expect(evaluation.idealSpeedup).toBeCloseTo(1 / 0.825, 10);
    expect(formatMultiplier(evaluation.idealSpeedup)).toBe('1.21×');
    // With integration, it's slower than one session, and the cost tile warns.
    expect(evaluation.fanMinutes).toBeCloseTo(73.5, 10);
    expect(evaluation.slower).toBe(true);
    expect(evaluation.warning).toBe(true);
  });

  it('Four reviewers, one monorepo costs 3.6× the tokens for a 1.5× speedup', () => {
    const evaluation = evaluate(preset('four-reviewers'));

    expect(evaluation.fan.total).toBe(948_000);
    expect(evaluation.solo.total).toBe(260_000);
    expect(evaluation.tokenMultiplier).toBeCloseTo(3.646, 3);
    expect(evaluation.fanMinutes).toBeCloseTo(39.5, 10);
    expect(evaluation.speedup).toBeCloseTo(1.519, 3);
    expect(wallClockText(evaluation)).toBe('39.5 min vs 60 solo (1.52× faster)');
  });

  it('Ten independent files is a good fit: 1.89× faster for 1.3× the tokens', () => {
    const evaluation = evaluate(preset('ten-files'));

    expect(evaluation.fanMinutes).toBeCloseTo(31.8, 10);
    expect(evaluation.fan.total).toBe(560_000);
    expect(evaluation.solo.total).toBe(430_000);
    expect(evaluation.warning).toBe(false);
  });

  it('Incident triage team runs three teammates at 3.5× the tokens of one session', () => {
    const evaluation = evaluate(preset('incident-team'));

    expect(evaluation.workers).toBe(3);
    expect(evaluation.fan.total).toBeCloseTo(evaluation.solo.total * 3.5, 6);
    expect(evaluation.fanCost).toBeCloseTo(evaluation.soloCost * 3.5, 10);
  });
});

describe('team modes', () => {
  it('multiplies the solo tokens by 3.5 for a team and 7 in plan mode', () => {
    expect(evaluate(inputs({ mode: 'team' })).tokenMultiplier).toBeCloseTo(3.5, 10);
    expect(evaluate(inputs({ mode: 'plan' })).tokenMultiplier).toBeCloseTo(7, 10);
    expect(evaluate(inputs({ mode: 'plan', planMultiplier: 6 })).tokenMultiplier).toBeCloseTo(
      6,
      10,
    );
  });

  it('takes wall-clock from the subagent model', () => {
    expect(evaluate(inputs({ mode: 'team' })).fanMinutes).toBeCloseTo(45, 10);
  });

  it('ignores the shared prefix, which the multiplier already covers', () => {
    expect(evaluate(inputs({ mode: 'team', sharedPrefix: true })).fanCost).toBeCloseTo(
      evaluate(inputs({ mode: 'team' })).fanCost,
      10,
    );
  });

  it('warns past 16 teammates, and never for subagents', () => {
    expect(evaluate(inputs({ mode: 'team', workers: 16 })).teamTooLarge).toBe(false);
    expect(evaluate(inputs({ mode: 'team', workers: 17 })).teamTooLarge).toBe(true);
    expect(evaluate(inputs({ mode: 'plan', workers: 32 })).teamTooLarge).toBe(true);
    expect(evaluate(inputs({ workers: 32 })).teamTooLarge).toBe(false);
  });
});

describe('edge cases', () => {
  it('with nothing serial has no ceiling, and Amdahl gives n', () => {
    const evaluation = evaluate(inputs({ serialFraction: 0 }));

    expect(evaluation.ceiling).toBeNull();
    expect(evaluation.idealSpeedup).toBe(4);
    expect(evaluation.fanMinutes).toBeCloseTo(27, 10);
  });

  it('with everything serial never speeds up, and integration only adds time', () => {
    const evaluation = evaluate(inputs({ serialFraction: 1 }));

    expect(evaluation.ceiling).toBe(1);
    expect(evaluation.idealSpeedup).toBe(1);
    expect(evaluation.fanMinutes).toBe(72);
    expect(evaluation.slower).toBe(true);
    expect(evaluation.integrationExceedsSavings).toBe(true);
    expect(evaluation.best.workers).toBe(1);
  });

  it('treats one worker as the solo session: multipliers of 1 and nothing integrated', () => {
    for (const mode of ['subagents', 'team', 'plan'] as const) {
      const evaluation = evaluate(inputs({ workers: 1, mode, sharedPrefix: true }));

      expect(evaluation.fanMinutes).toBe(60);
      expect(evaluation.integration).toBe(0);
      expect(evaluation.speedup).toBe(1);
      expect(evaluation.tokenMultiplier).toBe(1);
      expect(evaluation.costMultiplier).toBe(1);
      expect(evaluation.fan).toEqual(evaluation.solo);
      expect(evaluation.integrationExceedsSavings).toBe(false);
      expect(evaluation.warning).toBe(false);
    }
  });

  it('with free integration, the best is the most workers and there is no continuous optimum', () => {
    const evaluation = evaluate(inputs({ integrationMinutes: 0 }));

    expect(evaluation.best.workers).toBe(32);
    expect(evaluation.best.tied).toEqual([32]);
    expect(evaluation.continuousOptimum).toBeNull();
  });

  it('with no unique work still charges every worker for the shared context', () => {
    const evaluation = evaluate(inputs({ uniqueTokens: 0 }));

    expect(evaluation.solo.input).toBe(50_000);
    expect(evaluation.fan.input).toBe(288_000);
  });

  it('with every input empty or zero, returns no NaN and no speedup to report', () => {
    const evaluation = evaluate(
      inputs({
        soloMinutes: 0,
        serialFraction: 0,
        integrationMinutes: 0,
        spawnTokens: 0,
        sharedTokens: 0,
        uniqueTokens: 0,
        outputTokens: 0,
        reportTokens: 0,
      }),
    );

    expect(evaluation.fanMinutes).toBe(0);
    expect(evaluation.speedup).toBeNull();
    expect(evaluation.tokenMultiplier).toBeNull();
    expect(evaluation.costMultiplier).toBeNull();
    expect(evaluation.fanCost).toBe(0);
    expect(evaluation.warning).toBe(false);
    expect(wallClockText(evaluation)).toBe('0 min vs 0 solo (no work to speed up)');
    expect(tokensText(evaluation)).toBe('0 vs 0');
    expect(
      JSON.stringify(speedupCurve(inputs({ soloMinutes: 0, integrationMinutes: 0 }))),
    ).not.toContain('NaN');
  });

  it('warns when the fan-out costs more than 2× for under a 1.2× speedup', () => {
    const evaluation = evaluate(
      inputs({
        serialFraction: 0.85,
        workers: 3,
        integrationMinutes: 0,
        sharedTokens: 600_000,
        uniqueTokens: 0,
      }),
    );

    expect(evaluation.speedup).toBeCloseTo(1 / 0.9, 10);
    expect(evaluation.costMultiplier).toBeCloseTo(3.882 / 1.35, 10);
    expect(evaluation.slower).toBe(false);
    expect(evaluation.warning).toBe(true);
  });
});

describe('speedupCurve', () => {
  it('has a point for every worker count from 1 to 32, matching evaluate at each', () => {
    const curve = speedupCurve(inputs());

    expect(curve).toHaveLength(32);
    expect(curve[0]).toMatchObject({ workers: 1, ideal: 1, speedup: 1, minutes: 60 });
    expect(curve[3].minutes).toBeCloseTo(45, 10);
    expect(curve[3].tokens).toBe(608_000);
    expect(curve[3].cost).toBeCloseTo(1.376, 10);
    // Past the best, integration makes each extra worker slower.
    expect(curve[31].speedup!).toBeLessThan(curve[3].speedup!);
  });
});
