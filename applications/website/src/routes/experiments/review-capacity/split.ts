export type SplitPlan = {
  lines: number;
  /** Effective sittings the pull request needs, reviewed well. */
  sittings: number;
  minutes: number;
  /** Suggested sizes for reviewable units, as even as whole lines allow. */
  parts: number[];
};

/**
 * How many sittings a pull request needs, and how to cut it into units that
 * each fit one. The parts are even, and the larger ones come first.
 */
export const splitPlan = (
  lines: number,
  linesPerSitting: number,
  minutesPerSitting: number,
): SplitPlan => {
  const whole = Math.max(0, Math.round(lines));
  const sittings = whole === 0 ? 0 : Math.ceil(whole / linesPerSitting);
  const base = sittings === 0 ? 0 : Math.floor(whole / sittings);
  const remainder = whole - base * sittings;

  return {
    lines: whole,
    sittings,
    minutes: sittings * minutesPerSitting,
    parts: Array.from({ length: sittings }, (_, index) => base + (index < remainder ? 1 : 0)),
  };
};
