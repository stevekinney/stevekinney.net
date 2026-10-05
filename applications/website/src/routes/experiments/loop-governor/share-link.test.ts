import { describe, expect, it } from 'vitest';

import { cloneConfig, defaultConfig } from './loop-config';
import { findPreset, presetMatching, presets } from './presets';
import { decodeConfig, decodeState, encodeConfig, encodeState } from './share-link';
import { simulateBatch } from './simulate';
import { buildSummary } from './summary';

describe('the share link', () => {
  it('round-trips every preset, with its seed', () => {
    for (const preset of presets) {
      const config = { ...preset.apply(defaultConfig()), seed: 1234, runs: 2_500 };

      expect(decodeConfig(encodeConfig(config))).toEqual(config);
    }
  });

  it('round-trips an edited ladder and the pinned configuration', () => {
    const config = cloneConfig(defaultConfig());
    config.ladder['touch-done'] = 0.4;
    const pinned = { ...findPreset('well-governed')!.apply(config), seed: 7 };

    expect(decodeState(encodeState({ config, pinned }))).toEqual({ config, pinned });
  });

  it('holds values inside their ranges and ignores what it can’t read', () => {
    const config = decodeConfig('p=7&k=-3&m=nonsense&n=99999999&s=abc&e=');

    expect(config).toMatchObject({ p: 1, k: 1, marker: 'promise-string', runs: 10_000, seed: 42 });
  });

  it('reads nothing from an empty or unrelated hash', () => {
    expect(decodeState('')).toBeNull();
    expect(decodeState('utm_source=x')).toBeNull();
  });
});

describe('the presets', () => {
  it('starts from the specification’s defaults', () => {
    expect(presetMatching(defaultConfig())?.id).toBe('promise-string');
  });

  it('sets e = 0.2 failing open for a missing compiler', () => {
    expect(findPreset('compiler-missing')!.apply(defaultConfig())).toMatchObject({
      e: 0.2,
      failureMode: 'open',
    });
  });

  it('marks the impossible task and sets p = 0', () => {
    expect(findPreset('impossible')!.apply(defaultConfig())).toMatchObject({
      impossible: true,
      p: 0,
      honestWayOut: false,
    });
  });

  it('runs the overnight loop in an accumulating context with no budget cap', () => {
    const config = findPreset('overnight')!.apply(defaultConfig());

    expect(config.context).toBe('accumulating');
    expect(config.governors.budget).toBe(false);
  });

  it('governs the external loop with a dual condition, a stall detector, a budget, and fresh context', () => {
    const config = findPreset('well-governed')!.apply(defaultConfig());

    expect(config).toMatchObject({ dual: true, context: 'fresh' });
    expect(config.governors).toMatchObject({ stall: true, budget: true });
    expect(simulateBatch(config).outcomes['done-false']).toBe(0);
  });

  it('keeps the run count and seed when switching', () => {
    const base = { ...defaultConfig(), runs: 5_000, seed: 9 };

    expect(findPreset('overnight')!.apply(base)).toMatchObject({ runs: 5_000, seed: 9 });
  });
});

describe('the summary', () => {
  it('reports the outcome distribution, costs, and the exact values', () => {
    const config = defaultConfig();
    const summary = buildSummary(config, simulateBatch(config), 'https://example.com/#p=0.35');

    expect(summary).toContain('1,000 simulated runs, seed 42.');
    expect(summary).toContain('- Marker: A promise string in output, q = 0.15 (illustrative)');
    expect(summary).toMatch(/\| Done \(false\) \| \d+ \| \d+\.\d% \|/);
    expect(summary).toContain('- Median: $');
    expect(summary).toContain('- Fresh context is cheaper in total from iteration 4 on.');
    expect(summary).toContain('- False done before true done: 21.8% exact');
    expect(summary.trimEnd().endsWith('https://example.com/#p=0.35')).toBe(true);
  });
});
