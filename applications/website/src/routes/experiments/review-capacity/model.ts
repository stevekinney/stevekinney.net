import type { OverflowPolicy, Scenario } from './scenario';

/** An eight-hour working day, which review and follow-up minutes are drawn against. */
export const WORKDAY_MINUTES = 480;

export type DailyBalance = {
  /** Lines the agents open for review each day. */
  generated: number;
  /** Lines one reviewer can review well each day. */
  capacity: number;
  /** Generated minus capacity. Positive means more is opened than you can review fresh. */
  gap: number;
  /** Minutes of fresh review: what fits in your sittings, never more. */
  reviewMinutes: number;
  /** Lines beyond capacity, which the "review it tired" policy reviews anyway. */
  overflowLines: number;
  /** Minutes those overflow lines take at the same pace, past your good sittings. */
  overflowMinutes: number;
  /** Minutes spent touching up pull requests after the agents are done. */
  followUpMinutes: number;
  /**
   * How many agents you can keep fully reviewed at this rate. Null when an
   * agent produces nothing, so any number of them fits.
   */
  sustainableAgents: number | null;
  /** Whether one pull request is larger than a whole day of good sittings. */
  oversizedPr: boolean;
};

/** Escaped defects from lines reviewed fresh and lines reviewed tired. */
export type EscapedDefects = { fresh: number; fatigued: number; total: number };

const detection = (scenario: Scenario): number => scenario.freshDetection / 100;

export const sustainableAgents = (scenario: Scenario): number | null => {
  const perAgent = scenario.prsPerAgent * scenario.linesPerPr;
  if (perAgent <= 0) return null;

  const capacity = scenario.sittings * scenario.linesPerSitting;

  // A tiny epsilon keeps 1,200 / 600 from flooring to 1.9999…
  return Math.floor(capacity / perAgent + 1e-9);
};

export const dailyBalance = (scenario: Scenario): DailyBalance => {
  const generated = scenario.agents * scenario.prsPerAgent * scenario.linesPerPr;
  const capacity = scenario.sittings * scenario.linesPerSitting;
  const perSitting = (lines: number): number =>
    (lines / scenario.linesPerSitting) * scenario.minutesPerSitting;
  const overflowLines = Math.max(0, generated - capacity);

  return {
    generated,
    capacity,
    gap: generated - capacity,
    reviewMinutes: perSitting(Math.min(generated, capacity)),
    overflowLines,
    overflowMinutes: perSitting(overflowLines),
    followUpMinutes:
      scenario.agents *
      scenario.prsPerAgent *
      (scenario.followUpShare / 100) *
      scenario.followUpMinutes,
    sustainableAgents: sustainableAgents(scenario),
    oversizedPr: scenario.linesPerPr > capacity,
  };
};

/**
 * Defects that get past review:
 * fresh lines / 1,000 × density × (1 − detection)
 * + tired lines / 1,000 × density × (1 − detection × fatigued factor).
 */
export const escapedDefects = (
  freshLines: number,
  tiredLines: number,
  scenario: Scenario,
): EscapedDefects => {
  const fresh = (freshLines / 1000) * scenario.defectDensity * (1 - detection(scenario));
  const fatigued =
    (tiredLines / 1000) *
    scenario.defectDensity *
    (1 - detection(scenario) * scenario.fatiguedFactor);

  return { fresh, fatigued, total: fresh + fatigued };
};

/**
 * How many pull requests have been opened by the end of `day`. Arrivals are
 * whole pull requests, so a fractional rate such as 2.5 a day opens 2, then 3,
 * then 2, and so on, and the average still matches the rate.
 */
export const openedBy = (scenario: Scenario, day: number): number =>
  Math.floor(scenario.agents * scenario.prsPerAgent * day + 1e-9);

export type SimulatedDay = {
  /** Working day, from 1. */
  day: number;
  openedPrs: number;
  generatedLines: number;
  /** Lines reviewed inside your good sittings. */
  freshLines: number;
  /** Lines reviewed past them, which only the "review it tired" policy does. */
  tiredLines: number;
  /** Lines still waiting at the end of the day. Always zero when you review it tired. */
  backlogLines: number;
  /** Pull requests not yet fully reviewed, including one that's partly reviewed. */
  backlogPrs: number;
  /** The working day the oldest waiting pull request was opened, or null when nothing waits. */
  oldestOpenedDay: number | null;
  /** Working days the oldest waiting pull request has waited: today minus the day it was opened. */
  oldestAge: number | null;
  escaped: EscapedDefects;
  /** Running totals of escaped defects from day 1. */
  cumulativeEscaped: EscapedDefects;
};

export type Simulation = {
  policy: OverflowPolicy;
  days: SimulatedDay[];
  totals: {
    reviewedLines: number;
    tiredLines: number;
    escaped: EscapedDefects;
    /** Escaped defects per 1,000 lines you reviewed, which compares quality across policies. */
    escapedPerThousandReviewed: number;
  };
};

type WaitingPr = { openedDay: number; remaining: number };

const addEscaped = (first: EscapedDefects, second: EscapedDefects): EscapedDefects => ({
  fresh: first.fresh + second.fresh,
  fatigued: first.fatigued + second.fatigued,
  total: first.total + second.total,
});

const noEscapes: EscapedDefects = { fresh: 0, fatigued: 0, total: 0 };

/**
 * Runs the working days one at a time.
 *
 * Queue it: each day you review up to your capacity, oldest first (FIFO): the
 * backlog before today's work, and a pull request you started yesterday before
 * one you haven't. A pull request larger than a day's capacity is reviewed in
 * parts across days and waits until its last line is reviewed. Everything you
 * review is reviewed fresh.
 *
 * Review it tired: everything opened today is reviewed today. The first
 * `capacity` lines are reviewed fresh and the rest at fatigued detection.
 */
export const simulate = (
  scenario: Scenario,
  policy: OverflowPolicy = scenario.policy,
): Simulation => {
  const capacity = scenario.sittings * scenario.linesPerSitting;
  // The queue only grows at the back, so a head index and a running total of waiting
  // lines replace shifting the array and summing it every day.
  const queue: WaitingPr[] = [];
  let head = 0;
  let backlogLines = 0;
  const days: SimulatedDay[] = [];
  let cumulative = noEscapes;
  let reviewedLines = 0;
  let tiredTotal = 0;

  for (let day = 1; day <= scenario.days; day += 1) {
    const openedPrs = openedBy(scenario, day) - openedBy(scenario, day - 1);
    const generatedLines = openedPrs * scenario.linesPerPr;
    let freshLines = 0;
    let tiredLines = 0;

    if (policy === 'queue') {
      for (let index = 0; index < openedPrs; index += 1) {
        queue.push({ openedDay: day, remaining: scenario.linesPerPr });
      }
      backlogLines += generatedLines;

      let budget = capacity;
      while (budget > 0 && head < queue.length) {
        const next = queue[head];
        const reviewed = Math.min(budget, next.remaining);
        next.remaining -= reviewed;
        budget -= reviewed;
        freshLines += reviewed;
        backlogLines -= reviewed;
        if (next.remaining === 0) head += 1;
      }
    } else {
      freshLines = Math.min(generatedLines, capacity);
      tiredLines = generatedLines - freshLines;
    }

    const escaped = escapedDefects(freshLines, tiredLines, scenario);
    cumulative = addEscaped(cumulative, escaped);
    reviewedLines += freshLines + tiredLines;
    tiredTotal += tiredLines;

    const oldestOpenedDay = queue[head]?.openedDay ?? null;
    days.push({
      day,
      openedPrs,
      generatedLines,
      freshLines,
      tiredLines,
      backlogLines,
      backlogPrs: queue.length - head,
      oldestOpenedDay,
      oldestAge: oldestOpenedDay === null ? null : day - oldestOpenedDay,
      escaped,
      cumulativeEscaped: cumulative,
    });
  }

  return {
    policy,
    days,
    totals: {
      reviewedLines,
      tiredLines: tiredTotal,
      escaped: cumulative,
      escapedPerThousandReviewed: reviewedLines > 0 ? (cumulative.total / reviewedLines) * 1000 : 0,
    },
  };
};

/** Escaped defects per day if every generated line had been reviewed fresh. */
export const allFreshEscapedPerDay = (scenario: Scenario): number =>
  escapedDefects(dailyBalance(scenario).generated, 0, scenario).total;

export type SweepPoint = {
  agents: number;
  /** Lines still waiting after the last simulated day, when you queue it. */
  backlogLines: number;
  backlogPrs: number;
  /** Average escaped defects per day, when you review it tired. */
  escapedPerDay: number;
};

export const SWEEP_AGENTS = 10;

/** Runs both policies for 1 to 10 agents over the scenario's working days. */
export const sweep = (scenario: Scenario): SweepPoint[] =>
  Array.from({ length: SWEEP_AGENTS }, (_, index) => {
    const variant = { ...scenario, agents: index + 1 };
    const queued = simulate(variant, 'queue').days.at(-1);
    const tired = simulate(variant, 'tired');

    return {
      agents: index + 1,
      backlogLines: queued?.backlogLines ?? 0,
      backlogPrs: queued?.backlogPrs ?? 0,
      escapedPerDay: tired.totals.escaped.total / scenario.days,
    };
  });
