import type { CacheAssessment, Calibration } from './calibrate';
import { clamp, clampTo, ranges } from './scenario';
import type { Scenario, ScenarioField } from './scenario';

/** The fields still showing a value that came from the session, until the person edits them. */
export type ImportedFields = Partial<Record<ScenarioField, true>>;

export type CalibrationPatch = {
  patch: Partial<Scenario>;
  imported: ImportedFields;
};

/**
 * What a calibration fills in. The baseline prefix isn't here: the first
 * turn's context is only an estimate, and it's offered rather than applied.
 * A model that isn't in the price table leaves the selection alone.
 */
export const calibrationPatch = (
  calibration: Calibration,
  assessment: CacheAssessment | null,
): CalibrationPatch => {
  const patch: Partial<Scenario> = {
    contextNow: clampTo(ranges.contextNow, calibration.contextNow),
    outputPerTurn: clampTo(ranges.outputPerTurn, calibration.outputPerTurn),
  };

  if (calibration.inputPerTurn !== null) {
    patch.inputPerTurn = clampTo(ranges.inputPerTurn, calibration.inputPerTurn);
  }
  if (calibration.summaryPercent !== null) {
    patch.summaryPercent = clamp(
      calibration.summaryPercent,
      ranges.summaryPercent.typedMin,
      ranges.summaryPercent.typedMax,
    );
  }
  if (calibration.modelMatch) patch.modelId = calibration.modelMatch.id;
  if (assessment) patch.warm = assessment.warm;

  const imported: ImportedFields = {};
  for (const field of Object.keys(patch) as ScenarioField[]) imported[field] = true;

  return { patch, imported };
};

/**
 * The values to go back to on "Discard import". A field that was already from
 * an earlier import keeps the value it had before that one, so discarding
 * undoes every import, not just the last.
 */
export const mergeBackup = (
  current: Scenario,
  existing: Partial<Scenario> | null,
  imported: ImportedFields,
  incoming: ImportedFields,
): Partial<Scenario> => {
  const backup: Partial<Scenario> = { ...existing };

  for (const field of Object.keys(incoming) as ScenarioField[]) {
    if (!(imported[field] && field in backup)) {
      (backup as Record<string, unknown>)[field] = current[field];
    }
  }

  return backup;
};

/** The fields to put back when the import is discarded: only the ones the person hasn't edited since. */
export const discardPatch = (
  backup: Partial<Scenario> | null,
  imported: ImportedFields,
): Partial<Scenario> => {
  const patch: Partial<Scenario> = {};
  if (!backup) return patch;

  for (const field of Object.keys(imported) as ScenarioField[]) {
    if (field in backup) (patch as Record<string, unknown>)[field] = backup[field];
  }

  return patch;
};
