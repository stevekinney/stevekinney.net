/** Every number the page is derived from. Each one is a text box. */
export type Scenario = {
  agents: number;
  /** Can be fractional, such as a rate measured over a week. */
  prsPerAgent: number;
  linesPerPr: number;
  /** Good review sittings a day, the ones where you still catch things. */
  sittings: number;
  /** Lines one good sitting covers. */
  linesPerSitting: number;
};

export type NumericField = keyof Scenario;

export const defaultScenario: Scenario = {
  agents: 3,
  prsPerAgent: 2,
  linesPerPr: 300,
  sittings: 3,
  linesPerSitting: 400,
};

export type FieldRange = {
  min: number;
  max: number;
  /** Whether the field takes only whole numbers. */
  whole: boolean;
};

/** What each text box accepts. */
export const ranges: Record<NumericField, FieldRange> = {
  agents: { min: 0, max: 50, whole: true },
  prsPerAgent: { min: 0, max: 20, whole: false },
  linesPerPr: { min: 1, max: 20_000, whole: true },
  sittings: { min: 0, max: 10, whole: true },
  linesPerSitting: { min: 50, max: 2_000, whole: true },
};

/**
 * Reads a number typed into a field. Accepts digit grouping (`1,200`). Returns
 * null for anything that isn't a number inside the field's range, so the box
 * can say so instead of silently clamping.
 */
export const parseField = (field: NumericField, text: string): number | null => {
  const normalized = text.trim().replace(/[,_\s]/g, '');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const value = Number(normalized);
  const range = ranges[field];
  if (value < range.min || value > range.max) return null;
  if (range.whole && !Number.isInteger(value)) return null;

  return value;
};

export type DailyBalance = {
  /** Lines the agents open for review each day. */
  generated: number;
  /** Lines one reviewer can review well each day. */
  capacity: number;
  /** Generated minus capacity. Positive means more is opened than you can review well. */
  gap: number;
  /**
   * How many agents you can keep fully reviewed at this rate. Null when an
   * agent produces nothing, so any number of them fits.
   */
  sustainableAgents: number | null;
  /** Whether one pull request is larger than a whole day of good sittings. */
  oversizedPr: boolean;
};

const capacity = (scenario: Scenario): number => scenario.sittings * scenario.linesPerSitting;

export const sustainableAgents = (scenario: Scenario): number | null => {
  const perAgent = scenario.prsPerAgent * scenario.linesPerPr;
  if (perAgent <= 0) return null;

  // A tiny epsilon keeps 1,200 / 600 from flooring to 1.9999…
  return Math.floor(capacity(scenario) / perAgent + 1e-9);
};

export const dailyBalance = (scenario: Scenario): DailyBalance => {
  const generated = scenario.agents * scenario.prsPerAgent * scenario.linesPerPr;
  const lines = capacity(scenario);

  return {
    generated,
    capacity: lines,
    gap: generated - lines,
    sustainableAgents: sustainableAgents(scenario),
    oversizedPr: scenario.linesPerPr > lines,
  };
};

const SWEEP_AGENTS = 10;

export type SweepPoint = { agents: number; generated: number };

/** Lines opened each day for 1 to 10 agents, everything else held where it is. */
export const sweep = (scenario: Scenario): SweepPoint[] =>
  Array.from({ length: SWEEP_AGENTS }, (_, index) => ({
    agents: index + 1,
    generated: (index + 1) * scenario.prsPerAgent * scenario.linesPerPr,
  }));
