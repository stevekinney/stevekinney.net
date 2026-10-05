import { describe, expect, it } from 'vitest';

import type { Calibration } from './calibrate';
import { calibrationPatch, discardPatch, mergeBackup } from './import-state';
import { defaultModels } from './pricing';
import { defaultScenario } from './scenario';

const calibration = (overrides: Partial<Calibration> = {}): Calibration => ({
  files: 1,
  sessions: 1,
  turns: 40,
  sidechainTurns: 0,
  skippedLines: 0,
  contextNow: 312_000,
  outputPerTurn: 900,
  inputPerTurn: 4_200,
  inputPairs: 39,
  pairsAcrossCompaction: 0,
  modelId: 'claude-sonnet-5',
  modelMatch: defaultModels.find((model) => model.id === 'sonnet-5') ?? null,
  lastTimestamp: null,
  importedAt: 0,
  summaryPercent: 4.1,
  compactions: [],
  baselineEstimate: 18_000,
  ...overrides,
});

describe('calibrationPatch', () => {
  it('fills in what the session measured and marks each field', () => {
    const { patch, imported } = calibrationPatch(calibration(), { warm: false, sentence: '' });

    expect(patch).toEqual({
      contextNow: 312_000,
      outputPerTurn: 900,
      inputPerTurn: 4_200,
      summaryPercent: 4.1,
      modelId: 'sonnet-5',
      warm: false,
    });
    expect(Object.keys(imported).sort()).toEqual(Object.keys(patch).sort());
  });

  it('never applies the baseline estimate', () => {
    expect(calibrationPatch(calibration(), null).patch).not.toHaveProperty('baseline');
  });

  it('leaves the model alone when the session’s model is not in the price table', () => {
    const { patch, imported } = calibrationPatch(calibration({ modelMatch: null }), null);

    expect(patch).not.toHaveProperty('modelId');
    expect(imported.modelId).toBeUndefined();
  });

  it('leaves out what the session could not measure', () => {
    const { patch } = calibrationPatch(
      calibration({ inputPerTurn: null, summaryPercent: null }),
      null,
    );

    expect(patch).not.toHaveProperty('inputPerTurn');
    expect(patch).not.toHaveProperty('summaryPercent');
    expect(patch).not.toHaveProperty('warm');
  });

  it('holds a context past the text box’s limit to it', () => {
    expect(calibrationPatch(calibration({ contextNow: 99_000_000 }), null).patch.contextNow).toBe(
      10_000_000,
    );
  });
});

describe('discarding an import', () => {
  const { imported } = calibrationPatch(calibration(), null);

  it('puts back the values from before the import', () => {
    const backup = mergeBackup(defaultScenario, null, {}, imported);

    expect(discardPatch(backup, imported)).toMatchObject({
      contextNow: 400_000,
      outputPerTurn: 2_000,
      inputPerTurn: 5_000,
      summaryPercent: 5,
      modelId: 'opus-5',
    });
  });

  it('leaves a field the person edited after the import alone', () => {
    const backup = mergeBackup(defaultScenario, null, {}, imported);
    const stillImported = { ...imported };
    delete stillImported.contextNow;

    expect(discardPatch(backup, stillImported)).not.toHaveProperty('contextNow');
  });

  it('keeps the value from before the first import when a second one follows', () => {
    const first = mergeBackup(defaultScenario, null, {}, imported);
    const afterFirst = { ...defaultScenario, contextNow: 312_000 };
    const second = mergeBackup(afterFirst, first, imported, imported);

    expect(second.contextNow).toBe(400_000);
  });

  it('has nothing to restore without a backup', () => {
    expect(discardPatch(null, imported)).toEqual({});
  });
});
