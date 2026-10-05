export type OverflowPolicy = 'queue' | 'tired';

/** The one state object the simulation is derived from. Every field is a control on the page. */
export type Scenario = {
  agents: number;
  /** Can be fractional, such as a rate measured from a pull-request listing. */
  prsPerAgent: number;
  linesPerPr: number;
  linesPerSitting: number;
  minutesPerSitting: number;
  sittings: number;
  policy: OverflowPolicy;
  /** How well a tired review detects defects, as a share of a fresh one, from 0 to 1. */
  fatiguedFactor: number;
  /** Defects per 1,000 changed lines. */
  defectDensity: number;
  /** The share of defects a fresh review catches, as a percentage. */
  freshDetection: number;
  /** The share of pull requests a human has to touch after merge, as a percentage. */
  followUpShare: number;
  followUpMinutes: number;
  days: number;
};

export type NumericField = Exclude<keyof Scenario, 'policy'>;

export const defaultScenario: Scenario = {
  agents: 3,
  prsPerAgent: 2,
  linesPerPr: 300,
  linesPerSitting: 400,
  minutesPerSitting: 60,
  sittings: 3,
  policy: 'queue',
  fatiguedFactor: 0.5,
  defectDensity: 15,
  freshDetection: 70,
  followUpShare: 52.3,
  followUpMinutes: 20,
  days: 10,
};

export type FieldRange = {
  min: number;
  max: number;
  /** Whether the field takes only whole numbers. */
  whole: boolean;
};

/** What each text box accepts. A link or a pasted listing is held to the same limits. */
export const ranges: Record<NumericField, FieldRange> = {
  agents: { min: 0, max: 50, whole: true },
  prsPerAgent: { min: 0, max: 20, whole: false },
  linesPerPr: { min: 1, max: 20_000, whole: true },
  linesPerSitting: { min: 50, max: 2_000, whole: true },
  minutesPerSitting: { min: 10, max: 240, whole: true },
  sittings: { min: 0, max: 10, whole: true },
  fatiguedFactor: { min: 0, max: 1, whole: false },
  defectDensity: { min: 0, max: 100, whole: false },
  freshDetection: { min: 0, max: 100, whole: false },
  followUpShare: { min: 0, max: 100, whole: false },
  followUpMinutes: { min: 0, max: 240, whole: true },
  days: { min: 1, max: 60, whole: true },
};

/** Holds a value inside its field's range, rounding whole-number fields. */
export const clampField = (field: NumericField, value: number): number => {
  const range = ranges[field];
  const rounded = range.whole ? Math.round(value) : value;

  return Math.min(range.max, Math.max(range.min, rounded));
};

/**
 * Reads a number typed into a field. Accepts digit grouping (`1,200`) and a
 * trailing percent sign. Returns null for anything that isn't a number inside
 * the field's range, so the box can say so instead of silently clamping.
 */
export const parseField = (field: NumericField, text: string): number | null => {
  const normalized = text
    .trim()
    .replace(/[,_\s]/g, '')
    .replace(/%$/, '');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const value = Number(normalized);
  const range = ranges[field];
  if (value < range.min || value > range.max) return null;
  if (range.whole && !Number.isInteger(value)) return null;

  return value;
};
