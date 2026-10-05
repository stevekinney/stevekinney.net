import { describe, expect, it } from 'vitest';

import { describeColumns, findVanity, guessMapping, hasOutcome, normalizeHeader } from './columns';

describe('normalizeHeader', () => {
  it('lowercases and turns other characters into single underscores', () => {
    expect(normalizeHeader(' Duration (min) ')).toBe('duration_min');
    expect(normalizeHeader('Review-Minutes')).toBe('review_minutes');
  });
});

describe('guessMapping', () => {
  it('matches the expected columns case-insensitively', () => {
    expect(
      guessMapping([
        'Condition',
        'TASK',
        'Minutes',
        'Accepted',
        'Rework',
        'Review_Minutes',
        'Cost',
      ]),
    ).toEqual({
      condition: 0,
      task: 1,
      minutes: 2,
      accepted: 3,
      rework: 4,
      reviewMinutes: 5,
      cost: 6,
    });
  });

  it('matches common synonyms', () => {
    expect(
      guessMapping(['workflow', 'ticket', 'Duration (min)', 'merged', 'review time', 'cost_usd']),
    ).toEqual({
      condition: 0,
      task: 1,
      minutes: 2,
      accepted: 3,
      rework: null,
      reviewMinutes: 4,
      cost: 5,
    });
    expect(guessMapping(['group', 'duration']).minutes).toBe(1);
  });

  it('never maps a vanity metric to a role', () => {
    const mapping = guessMapping(['condition', 'lines_of_code', 'acceptance_rate']);

    expect(mapping.minutes).toBeNull();
    expect(mapping.accepted).toBeNull();
    expect(hasOutcome(mapping)).toBe(false);
  });
});

describe('describeColumns', () => {
  it('lists unknown columns and explains vanity metrics', () => {
    const columns = ['condition', 'minutes', 'mood', 'loc', 'acceptance_rate', 'tokens', 'agents'];
    const report = describeColumns(columns, guessMapping(columns));

    expect(report.unknown).toEqual(['mood']);
    expect(report.vanity.map((entry) => entry.label)).toEqual([
      'Lines of code',
      'Suggestion acceptance rate',
      'Raw token counts',
      'Number of agents running',
    ]);
    expect(report.vanity[1].reason).toContain('goes up when you stop reading');
  });

  it('recognizes the spellings in the specification', () => {
    for (const name of ['lines', 'loc', 'tokens', 'agents', 'acceptance_rate', 'Lines of Code']) {
      expect(findVanity(name), name).not.toBeNull();
    }
    expect(findVanity('minutes')).toBeNull();
  });
});
