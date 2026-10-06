import { describe, expect, it } from 'vitest';

import {
  compileAgentRules,
  defaultAgentRules,
  histogramBins,
  measuredInputs,
  measureThroughput,
  needsMoreThanOneSitting,
  parseListing,
  workingDaysSpanned,
} from './listing';
import type { ParsedListing, PullRequest } from './listing';

// Synthetic entries in the shape `gh pr list --json` prints. GitHub's CLI
// reports a bot as `app/<name>` with `is_bot: true`.
const entry = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  number: 1,
  additions: 100,
  deletions: 20,
  createdAt: '2026-10-01T09:00:00Z',
  mergedAt: '2026-10-01T15:00:00Z',
  author: { id: 'X', is_bot: false, login: 'example-human', name: '' },
  ...overrides,
});

const parsed = (data: unknown): ParsedListing => {
  const result = parseListing(JSON.stringify(data));
  if ('error' in result) throw new Error(result.error);

  return result;
};

describe('acceptance check 5: a pasted listing', () => {
  it('counts 350 additions and 120 deletions as 470 lines, more than one effective sitting', () => {
    const [pr] = parsed([entry({ additions: 350, deletions: 120 })]).pullRequests;

    expect(pr.lines).toBe(470);
    expect(needsMoreThanOneSitting(pr.lines, 400)).toBe(true);

    const report = measureThroughput([pr], defaultAgentRules, 400);
    expect(report.all.overOneSitting).toBe(1);
    expect(report.shareOverOneSitting).toBe(1);
    const bin = report.histogram.find((candidate) => candidate.count === 1);
    expect(bin).toMatchObject({ label: '401–800', overOneSitting: true });
  });

  it('measures against the lines-per-sitting input, not a fixed 400', () => {
    expect(needsMoreThanOneSitting(470, 500)).toBe(false);
    expect(needsMoreThanOneSitting(400, 400)).toBe(false);
  });
});

describe('parseListing', () => {
  it('skips entries without usable additions or deletions, and says why', () => {
    const result = parsed([
      entry(),
      entry({ additions: undefined }),
      entry({ deletions: '12' }),
      entry({ additions: -3, deletions: null }),
      'not a pull request',
      null,
    ]);

    expect(result.pullRequests).toHaveLength(1);
    expect(result.skipped).toEqual([
      { position: 2, reason: 'no usable additions' },
      { position: 3, reason: 'no usable deletions' },
      { position: 4, reason: 'no usable additions and deletions' },
      { position: 5, reason: 'not an object' },
      { position: 6, reason: 'not an object' },
    ]);
  });

  it('skips sizes too large to be real, so the sum stays finite', () => {
    const result = parsed([
      entry({ additions: 1e308, deletions: 1e308 }),
      entry({ additions: 2 ** 53 }),
      entry({ deletions: 10_000_001 }),
      entry({ additions: 10_000_000, deletions: 10_000_000 }),
    ]);

    expect(result.skipped).toEqual([
      { position: 1, reason: 'additions and deletions over 10,000,000 lines' },
      { position: 2, reason: 'additions over 10,000,000 lines' },
      { position: 3, reason: 'deletions over 10,000,000 lines' },
    ]);
    expect(result.pullRequests.map((pullRequest) => pullRequest.lines)).toEqual([20_000_000]);
  });

  it('keeps an entry with a missing author or dates, for sizes only', () => {
    const [pr] = parsed([
      { additions: 5, deletions: 5, createdAt: 'yesterday', author: null },
    ]).pullRequests;

    expect(pr).toMatchObject({ login: 'unknown', isBot: false, lines: 10, number: 1 });
    expect(pr.createdAt).toBeNull();
    expect(pr.mergedAt).toBeNull();
  });

  it('explains what is wrong with text that is not a listing', () => {
    expect(parseListing('')).toEqual({ error: expect.stringContaining('Paste') });
    expect(parseListing('{ nope')).toEqual({ error: expect.stringContaining('valid JSON') });
    expect(parseListing('{"number": 1}')).toEqual({ error: expect.stringContaining('array') });
  });

  it('accepts an empty listing', () => {
    expect(parsed([])).toEqual({ pullRequests: [], skipped: [] });
  });
});

describe('agent rules', () => {
  const pr = (login: string, isBot = false): PullRequest => ({
    number: 1,
    login,
    isBot,
    lines: 10,
    createdAt: null,
    mergedAt: null,
  });

  it('counts the CLI’s app/ logins, [bot] suffixes, and the bot flag as agents', () => {
    const isAgent = compileAgentRules(defaultAgentRules);

    expect(isAgent(pr('app/example-agent', true))).toBe(true);
    expect(isAgent(pr('example-agent[bot]'))).toBe(true);
    expect(isAgent(pr('some-service', true))).toBe(true);
    expect(isAgent(pr('example-human'))).toBe(false);
  });

  it('does not treat a person whose login ends in bot as an agent', () => {
    expect(compileAgentRules(defaultAgentRules)(pr('robbot'))).toBe(false);
  });

  it('takes a list of logins and patterns, ignoring case', () => {
    const isAgent = compileAgentRules({ useBotFlag: false, patterns: 'Example-Agent\nclaude-*' });

    expect(isAgent(pr('example-agent'))).toBe(true);
    expect(isAgent(pr('claude-worker-2'))).toBe(true);
    expect(isAgent(pr('app/example-agent', true))).toBe(false);
  });

  it('treats pattern characters other than * literally', () => {
    const isAgent = compileAgentRules({ useBotFlag: false, patterns: 'a.b' });

    expect(isAgent(pr('a.b'))).toBe(true);
    expect(isAgent(pr('axb'))).toBe(false);
  });
});

describe('workingDaysSpanned', () => {
  it('counts only weekdays between the first and last merge, in UTC', () => {
    // Friday October 2 to Monday October 5, 2026: the weekend doesn't count.
    expect(
      workingDaysSpanned([new Date('2026-10-02T23:30:00Z'), new Date('2026-10-05T00:10:00Z')]),
    ).toBe(2);
    expect(workingDaysSpanned([new Date('2026-10-05T12:00:00Z')])).toBe(1);
    expect(
      workingDaysSpanned([new Date('2026-10-05T12:00:00Z'), new Date('2026-10-16T12:00:00Z')]),
    ).toBe(10);
  });

  it('counts a span with no weekdays as one day', () => {
    expect(workingDaysSpanned([new Date('2026-10-03T12:00:00Z')])).toBe(1);
    expect(workingDaysSpanned([])).toBe(0);
  });

  it('agrees with counting day by day for every start weekday and length', () => {
    const DAY = 86_400_000;
    const start = Date.UTC(2026, 9, 4); // A Sunday.

    for (let offset = 0; offset < 7; offset += 1) {
      for (let length = 0; length < 30; length += 1) {
        const first = start + offset * DAY;
        let expected = 0;
        for (let day = 0; day <= length; day += 1) {
          const weekday = new Date(first + day * DAY).getUTCDay();
          if (weekday !== 0 && weekday !== 6) expected += 1;
        }

        expect(
          workingDaysSpanned([new Date(first + length * DAY), new Date(first + 12 * 3_600_000)]),
        ).toBe(Math.max(1, expected));
      }
    }
  });

  it('counts a span of hundreds of millennia without walking it', () => {
    const started = performance.now();
    const days = workingDaysSpanned([
      new Date('2000-01-01T00:00:00Z'),
      new Date('+275000-01-01T00:00:00Z'),
    ]);

    expect(performance.now() - started).toBeLessThan(50);
    // 99,711,204 calendar days, Saturday to Wednesday: 14,244,457 whole weeks and three weekdays.
    expect(days).toBe(71_222_288);
  });
});

describe('an implausible merge span', () => {
  it('rejects a listing whose merges span more than 20 years', () => {
    const result = parseListing(
      JSON.stringify([
        entry({ number: 1, mergedAt: '2000-01-01T00:00:00Z' }),
        entry({ number: 2, mergedAt: '+275000-01-01T00:00:00Z' }),
      ]),
    );

    expect(result).toEqual({
      error:
        'Those merge dates span more than 20 years, from 2000-01-01 to +275000-01-01. Check the mergedAt values in the listing.',
    });
  });

  it('accepts a listing whose merges span 20 years', () => {
    const result = parseListing(
      JSON.stringify([
        entry({ number: 1, mergedAt: '2006-01-01T00:00:00Z' }),
        entry({ number: 2, mergedAt: '2026-01-01T00:00:00Z' }),
      ]),
    );

    expect('error' in result).toBe(false);
  });
});

describe('measureThroughput', () => {
  // Two working weeks: 10 agent pull requests and 5 human ones, Monday the 5th to Friday the 16th.
  const listing = parsed([
    ...Array.from({ length: 10 }, (_, index) =>
      entry({
        number: index + 1,
        additions: 200 + index * 50,
        deletions: 50,
        createdAt: `2026-10-${String(5 + index).padStart(2, '0')}T09:00:00Z`,
        mergedAt: `2026-10-${String(5 + index).padStart(2, '0')}T13:00:00Z`,
        author: { is_bot: true, login: 'app/example-agent' },
      }),
    ),
    ...Array.from({ length: 5 }, (_, index) =>
      entry({
        number: 20 + index,
        additions: 80,
        deletions: 20,
        createdAt: '2026-10-12T09:00:00Z',
        mergedAt: `2026-10-${12 + index}T09:00:00Z`,
      }),
    ),
  ]);
  const report = measureThroughput(listing.pullRequests, defaultAgentRules, 400);

  it('splits agents from people', () => {
    expect(report.agents.count).toBe(10);
    expect(report.humans.count).toBe(5);
    expect(report.authors.map((author) => [author.login, author.agent, author.count])).toEqual([
      ['app/example-agent', true, 10],
      ['example-human', false, 5],
    ]);
  });

  it('measures pull requests and lines per working day', () => {
    // The 5th through the 16th has 10 weekdays.
    expect(report.workingDays).toBe(10);
    expect(report.all.perDay).toBe(1.5);
    expect(report.agents.perDay).toBe(1);
    expect(report.agents.linesPerDay).toBe(
      Array.from({ length: 10 }, (_, index) => 250 + index * 50).reduce((a, b) => a + b, 0) / 10,
    );
  });

  it('measures the time from creation to merge', () => {
    expect(report.agents.medianHoursToMerge).toBe(4);
    expect(report.humans.medianHoursToMerge).toBe(48);
    expect(report.p90HoursToMerge).toBe(72);
  });

  it('counts the share over one sitting', () => {
    // Agent sizes run 250 to 700: 450 and up is over 400, so 6 of 15.
    expect(report.all.overOneSitting).toBe(6);
    expect(report.shareOverOneSitting).toBeCloseTo(6 / 15, 10);
  });

  it('offers the median agent size and the agent rate shared across your agents', () => {
    expect(measuredInputs(report, 2)).toEqual({
      linesPerPr: 475,
      prsPerAgent: 0.5,
      source: 'agents',
    });
  });

  it('falls back to every pull request when it finds no agents', () => {
    const humans = measureThroughput(
      listing.pullRequests,
      { useBotFlag: false, patterns: '' },
      400,
    );

    expect(measuredInputs(humans, 3)?.source).toBe('all');
    expect(measuredInputs(humans, 3)?.prsPerAgent).toBe(0.5);
  });

  it('offers nothing to load from an empty listing', () => {
    expect(measuredInputs(measureThroughput([], defaultAgentRules, 400), 3)).toBeNull();
  });
});

describe('histogramBins', () => {
  it('puts the one-sitting line on a bin edge, whatever the sitting size', () => {
    const bins = histogramBins([], 300);

    expect(bins.map((bin) => bin.label)).toEqual([
      '0–75',
      '76–150',
      '151–300',
      '301–600',
      '601–1200',
      'over 1200',
    ]);
    expect(bins.map((bin) => bin.overOneSitting)).toEqual([false, false, false, true, true, true]);
  });
});
