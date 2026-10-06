import { describe, expect, it } from 'vitest';

import { formatDefects, formatLines, formatMinutes, formatSignedLines } from './display';
import {
  allFreshEscapedPerDay,
  dailyBalance,
  escapedDefects,
  openedBy,
  simulate,
  sustainableAgents,
  sweep,
} from './model';
import { defaultScenario } from './scenario';
import type { Scenario } from './scenario';

const scenario = (overrides: Partial<Scenario> = {}): Scenario => ({
  ...defaultScenario,
  ...overrides,
});

describe('acceptance check 1: the defaults', () => {
  const balance = dailyBalance(defaultScenario);

  it('generates 1,800 lines a day against a capacity of 1,200', () => {
    expect(balance.generated).toBe(1_800);
    expect(balance.capacity).toBe(1_200);
    expect(formatLines(balance.generated)).toBe('1,800');
    expect(formatLines(balance.capacity)).toBe('1,200');
  });

  it('leaves a gap of +600 lines a day', () => {
    expect(balance.gap).toBe(600);
    expect(formatSignedLines(balance.gap)).toBe('+600');
  });

  it('can keep 2 agents fully reviewed', () => {
    expect(balance.sustainableAgents).toBe(2);
  });

  it('spends 180 minutes reviewing', () => {
    expect(balance.reviewMinutes).toBe(180);
  });

  it('spends 6 × 0.523 × 20 = 62.8 minutes a day on follow-up', () => {
    expect(balance.followUpMinutes).toBeCloseTo(62.76, 10);
    expect(formatMinutes(balance.followUpMinutes)).toBe('62.8');
  });

  it('does not flag a 300-line pull request as larger than a day', () => {
    expect(balance.oversizedPr).toBe(false);
  });
});

describe('a backlog that never clears', () => {
  it('keeps the queue in order across thousands of reviewed pull requests', () => {
    // 100 pull requests of 10 lines a day against 990 lines of capacity: one more waits each day.
    const simulation = simulate(
      scenario({
        agents: 10,
        prsPerAgent: 10,
        linesPerPr: 10,
        sittings: 1,
        linesPerSitting: 990,
        days: 60,
      }),
      'queue',
    );
    const last = simulation.days.at(-1)!;

    // 5,940 pull requests reviewed in order, so the oldest waiting one opened on day 60.
    expect(last).toMatchObject({ backlogLines: 600, backlogPrs: 60, oldestOpenedDay: 60 });
    expect(simulation.days.every((day, index) => day.backlogPrs === index + 1)).toBe(true);
  });
});

describe('acceptance check 2: queue it', () => {
  const simulation = simulate(defaultScenario, 'queue');
  const last = simulation.days.at(-1)!;

  it('ends 10 days with 6,000 lines waiting, which is 20 pull requests', () => {
    expect(simulation.days).toHaveLength(10);
    expect(last.backlogLines).toBe(6_000);
    expect(last.backlogPrs).toBe(20);
  });

  it('grows the backlog by 600 lines a day', () => {
    expect(simulation.days.map((day) => day.backlogLines)).toEqual([
      600, 1_200, 1_800, 2_400, 3_000, 3_600, 4_200, 4_800, 5_400, 6_000,
    ]);
  });

  it('reviews the oldest work first, so the oldest waiting pull request ages day by day', () => {
    const ages = simulation.days.map((day) => day.oldestAge);

    expect(ages).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2, 3]);
    for (let index = 1; index < ages.length; index += 1) {
      expect(ages[index]!).toBeGreaterThanOrEqual(ages[index - 1]!);
    }
    expect(last.oldestOpenedDay).toBe(7);
  });

  it('reviews everything it reviews fresh, at the full 1,200 lines a day', () => {
    expect(simulation.days.every((day) => day.freshLines === 1_200 && day.tiredLines === 0)).toBe(
      true,
    );
    expect(simulation.totals.escaped.fatigued).toBe(0);
  });
});

describe('acceptance check 3: review it tired', () => {
  it('lets 5.40 + 5.85 = 11.25 defects escape a day', () => {
    const day = simulate(defaultScenario, 'tired').days[0];

    expect(day.freshLines).toBe(1_200);
    expect(day.tiredLines).toBe(600);
    expect(day.escaped.fresh).toBeCloseTo(5.4, 10);
    expect(day.escaped.fatigued).toBeCloseTo(5.85, 10);
    expect(day.escaped.total).toBeCloseTo(11.25, 10);
    expect(formatDefects(day.escaped.fresh)).toBe('5.40');
    expect(formatDefects(day.escaped.fatigued)).toBe('5.85');
    expect(formatDefects(day.escaped.total)).toBe('11.25');
  });

  it('compares with 8.10 if all 1,800 lines had been reviewed fresh', () => {
    expect(allFreshEscapedPerDay(defaultScenario)).toBeCloseTo(8.1, 10);
    expect(formatDefects(allFreshEscapedPerDay(defaultScenario))).toBe('8.10');
  });

  it('never builds a backlog', () => {
    const simulation = simulate(defaultScenario, 'tired');

    expect(simulation.days.every((day) => day.backlogLines === 0)).toBe(true);
    expect(simulation.totals.escaped.total).toBeCloseTo(112.5, 10);
  });

  it('spends another 90 minutes on the overflow', () => {
    expect(dailyBalance(defaultScenario).overflowMinutes).toBe(90);
  });
});

describe('acceptance check 4: two agents', () => {
  const two = scenario({ agents: 2 });

  it('generates exactly the 1,200 lines you can review', () => {
    expect(dailyBalance(two).generated).toBe(1_200);
    expect(dailyBalance(two).gap).toBe(0);
  });

  it('keeps the backlog at 0 and both policies match', () => {
    const queued = simulate(two, 'queue');
    const tired = simulate(two, 'tired');

    expect(queued.days.every((day) => day.backlogLines === 0 && day.oldestAge === null)).toBe(true);
    expect(tired.days.every((day) => day.tiredLines === 0)).toBe(true);
    expect(queued.totals.escaped.total).toBeCloseTo(tired.totals.escaped.total, 10);
    expect(queued.days.map((day) => day.freshLines)).toEqual(
      tired.days.map((day) => day.freshLines),
    );
  });
});

describe('escapedDefects', () => {
  it('applies the fatigued factor only to tired lines', () => {
    expect(escapedDefects(1_000, 0, defaultScenario).total).toBeCloseTo(4.5, 10);
    expect(escapedDefects(0, 1_000, defaultScenario).total).toBeCloseTo(9.75, 10);
  });
});

describe('edge cases', () => {
  it('handles zero agents with nothing generated and nothing waiting', () => {
    const none = scenario({ agents: 0 });
    const balance = dailyBalance(none);

    expect(balance.generated).toBe(0);
    expect(balance.reviewMinutes).toBe(0);
    expect(balance.followUpMinutes).toBe(0);
    expect(balance.sustainableAgents).toBe(2);
    expect(simulate(none).days.every((day) => day.backlogLines === 0)).toBe(true);
    expect(simulate(none).totals.escapedPerThousandReviewed).toBe(0);
  });

  it('says any number of agents fits when an agent opens nothing', () => {
    expect(sustainableAgents(scenario({ prsPerAgent: 0 }))).toBeNull();
  });

  it('can sustain no agents at all with no sittings', () => {
    expect(sustainableAgents(scenario({ sittings: 0 }))).toBe(0);
  });

  it('floors to whole agents', () => {
    expect(sustainableAgents(scenario({ linesPerPr: 250 }))).toBe(2);
    expect(sustainableAgents(scenario({ linesPerPr: 200 }))).toBe(3);
  });

  it('queues a pull request larger than a day of capacity across days and flags it', () => {
    const big = scenario({ agents: 1, prsPerAgent: 1, linesPerPr: 1_500, days: 3 });
    const simulation = simulate(big, 'queue');

    expect(dailyBalance(big).oversizedPr).toBe(true);
    // Day 1 reviews 1,200 of the first 1,500. Day 2 finishes it (300) and starts the next (900).
    expect(simulation.days.map((day) => day.freshLines)).toEqual([1_200, 1_200, 1_200]);
    expect(simulation.days.map((day) => day.backlogLines)).toEqual([300, 600, 900]);
    expect(simulation.days.map((day) => day.backlogPrs)).toEqual([1, 1, 1]);
    expect(simulation.days.map((day) => day.oldestOpenedDay)).toEqual([1, 2, 3]);
  });

  it('keeps a partly reviewed pull request waiting until its last line is reviewed', () => {
    const simulation = simulate(scenario({ linesPerPr: 500, agents: 1, days: 2 }), 'queue');

    // Two 500-line pull requests a day against 1,200 lines: both finish on day 1.
    expect(simulation.days[0].backlogPrs).toBe(0);
    expect(
      simulate(scenario({ linesPerPr: 700, agents: 1, days: 1 }), 'queue').days[0],
    ).toMatchObject({ backlogLines: 200, backlogPrs: 1, oldestOpenedDay: 1, oldestAge: 0 });
  });

  it('makes both policies equal on quality with a fatigued factor of 1, and differ only in backlog', () => {
    const noFatigue = scenario({ fatiguedFactor: 1 });
    const queued = simulate(noFatigue, 'queue');
    const tired = simulate(noFatigue, 'tired');

    expect(queued.totals.escapedPerThousandReviewed).toBeCloseTo(4.5, 10);
    expect(tired.totals.escapedPerThousandReviewed).toBeCloseTo(4.5, 10);
    expect(queued.days.at(-1)?.backlogLines).toBe(6_000);
    expect(tired.days.at(-1)?.backlogLines).toBe(0);
  });

  it('reviews tired at a worse rate per line when the factor is below 1', () => {
    expect(simulate(defaultScenario, 'tired').totals.escapedPerThousandReviewed).toBeCloseTo(
      6.25,
      10,
    );
  });
});

describe('openedBy', () => {
  it('opens whole pull requests and keeps a fractional rate on average', () => {
    const fractional = scenario({ agents: 1, prsPerAgent: 2.5 });

    expect([1, 2, 3, 4].map((day) => openedBy(fractional, day))).toEqual([2, 5, 7, 10]);
    expect(openedBy(scenario({ agents: 3, prsPerAgent: 0.7 }), 3)).toBe(6);
  });

  it('opens 6 pull requests a day at the defaults', () => {
    expect(simulate(defaultScenario).days.every((day) => day.openedPrs === 6)).toBe(true);
  });
});

describe('sweep', () => {
  it('runs 1 to 10 agents over the scenario’s working days', () => {
    const points = sweep(defaultScenario);

    expect(points.map((point) => point.agents)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(points[0]).toMatchObject({ backlogLines: 0, backlogPrs: 0 });
    expect(points[1]).toMatchObject({ backlogLines: 0, backlogPrs: 0 });
    expect(points[2]).toMatchObject({ backlogLines: 6_000, backlogPrs: 20 });
    expect(points[2].escapedPerDay).toBeCloseTo(11.25, 10);
    expect(points[1].escapedPerDay).toBeCloseTo(5.4, 10);
  });

  it('uses the working-days input rather than a fixed ten', () => {
    expect(sweep(scenario({ days: 5 }))[2].backlogLines).toBe(3_000);
  });
});
