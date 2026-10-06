import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { formatCost } from '$lib/experiments/format';

import {
  MAXIMUM_RECORDS,
  analyzeLog,
  counterfactual,
  counterfactualGovernors,
  createLogReader,
  guessLowerIsBetter,
  guessMapping,
  parseLogText,
  readBoolean,
  readFailure,
  readNumber,
} from './replay';
import type { FieldMapping, Replay } from './replay';

// Synthetic logs, written for these tests. None came from a real loop.
const fixture = (name: string): string =>
  readFileSync(
    fileURLToPath(new URL(`../../../../tests/fixtures/loop-governor/${name}`, import.meta.url)),
    'utf8',
  );

const replayOf = (name: string, overrides: { costIsRunningTotal?: boolean } = {}): Replay => {
  const log = parseLogText(fixture(name));
  const mapping = guessMapping(log.keys);

  return analyzeLog(log, {
    mapping,
    lowerIsBetter: guessLowerIsBetter(mapping.score),
    costIsRunningTotal: overrides.costIsRunningTotal ?? false,
  });
};

describe('acceptance check 7: a log whose score is flat from iteration 15', () => {
  const replay = replayOf('flat-from-15.jsonl');

  it('reports that a stall detector of 3 stops the run at iteration 17', () => {
    const result = counterfactual(replay, { kind: 'stall', m: 3 }, formatCost);

    expect(result.stopIteration).toBe(17);
    expect(result.sentence).toBe(
      'A stall detector of 3 stops this at iteration 17 and saves $17.85.',
    );
  });

  it('marks progress on every iteration through 14 and none after', () => {
    const progress = replay.iterations
      .filter((step) => step.progress)
      .map((step) => step.iteration);

    expect(progress).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
    expect(replay.iterations.find((step) => step.iteration === 17)?.sinceProgress).toBe(3);
  });

  it('adds the costs before rounding, to $53.95', () => {
    expect(replay.total).toBe(53.95);
    expect(formatCost(replay.total)).toBe('$53.95');
  });

  it('marks identical failures on consecutive iterations as repeated', () => {
    const repeated = replay.iterations
      .filter((step) => step.repeated)
      .map((step) => step.iteration);

    // 15 and 17 share a failure, but 16 sits between them, so they don't count.
    expect(repeated).toEqual([19, 24]);
    expect(counterfactual(replay, { kind: 'repeatedFailure' }, formatCost).stopIteration).toBe(19);
  });

  it('tries stall detectors of 2, 3, and 5 and the page’s own settings', () => {
    const governors = counterfactualGovernors({ stallM: 4, maxIterations: 10, budget: 20 });
    const sentences = governors.map((governor) => counterfactual(replay, governor, formatCost));

    expect(sentences.map((result) => result.name)).toEqual([
      'A stall detector of 2',
      'A stall detector of 3',
      'A stall detector of 4',
      'A stall detector of 5',
      'A repeated-failure check',
      'A maximum of 10 iterations',
      'A $20.00 budget',
    ]);
    expect(sentences[0].stopIteration).toBe(16);
    expect(sentences[5]).toMatchObject({ stopIteration: 10, progressLost: 4 });
    expect(sentences[5].sentence).toContain('but it cuts off 4 later progress iterations');
    // $1.85 + $2.10 + … passes $20 on iteration 10, at $20.75.
    expect(sentences[6].stopIteration).toBe(10);
  });

  it('says when a governor never fires', () => {
    expect(counterfactual(replay, { kind: 'stall', m: 50 }, formatCost).sentence).toBe(
      'A stall detector of 50 never fires on this run.',
    );
  });
});

describe('reading a log defensively', () => {
  it('maps renamed and nested fields, and skips a line cut off mid-write', () => {
    const log = parseLogText(fixture('renamed-fields.jsonl'));

    expect(log.skippedLines).toBe(1);
    expect(log.records).toHaveLength(10);
    expect(guessMapping(log.keys)).toEqual({
      iteration: 'attempt',
      session: 'session',
      cost: 'usage.total_cost_usd',
      score: 'errors_remaining',
      kept: 'accepted',
      failure: 'error',
    } satisfies FieldMapping);
  });

  it('treats a falling error count as improvement', () => {
    expect(guessLowerIsBetter('errors_remaining')).toBe(true);
    expect(guessLowerIsBetter('score')).toBe(false);

    const replay = replayOf('renamed-fields.jsonl', { costIsRunningTotal: true });

    expect(replay.iterations.filter((step) => step.progress)).toHaveLength(4);
    expect(counterfactual(replay, { kind: 'stall', m: 3 }, formatCost).stopIteration).toBe(7);
  });

  it('turns a running total into per-iteration costs', () => {
    const replay = replayOf('renamed-fields.jsonl', { costIsRunningTotal: true });

    expect(replay.iterations.every((step) => step.cost === 0.5)).toBe(true);
    expect(replay.total).toBe(5);
  });

  it('reads a drop in the running total as a new run starting over', () => {
    const log = parseLogText(
      [2, 6, 10, 1, 2].map((total) => JSON.stringify({ cost_usd: total })).join('\n'),
    );
    const replay = analyzeLog(log, {
      mapping: guessMapping(log.keys),
      lowerIsBetter: false,
      costIsRunningTotal: true,
    });

    expect(replay.iterations.map((step) => step.cost)).toEqual([2, 4, 4, 1, 1]);
    expect(replay.total).toBe(12);
    expect(replay.notes).toContain(
      'The running total dropped once, so that iteration starts a new total at its own value.',
    );
  });

  const runningTotals = (
    lines: Record<string, unknown>[],
    runningTotalScope?: 'log' | 'session',
  ): Replay => {
    const log = parseLogText(lines.map((line) => JSON.stringify(line)).join('\n'));

    return analyzeLog(log, {
      mapping: guessMapping(log.keys),
      lowerIsBetter: false,
      costIsRunningTotal: true,
      runningTotalScope,
    });
  };

  it('keeps a running total for each session when told to', () => {
    const replay = runningTotals(
      [
        { session_id: 'a', cost_usd: 1 },
        { session_id: 'b', cost_usd: 2 },
        { session_id: 'a', cost_usd: 3 },
        { session_id: 'b', cost_usd: 5 },
      ],
      'session',
    );

    expect(replay.iterations.map((step) => step.cost)).toEqual([1, 2, 2, 3]);
    expect(replay.total).toBe(8);
    expect(replay.notes.some((note) => note.includes('dropped'))).toBe(false);
  });

  it('keeps one running total across the log by default, even when sessions repeat', () => {
    // A loop-wide total, logged against whichever session ran each iteration.
    const replay = runningTotals([
      { session_id: 'a', cost_usd: 1 },
      { session_id: 'b', cost_usd: 2 },
      { session_id: 'a', cost_usd: 3 },
      { session_id: 'c', cost_usd: 4 },
    ]);

    expect(replay.iterations.map((step) => step.cost)).toEqual([1, 1, 1, 1]);
    expect(replay.total).toBe(4);
  });

  it('keeps one running total when every iteration starts a fresh session', () => {
    const replay = runningTotals(
      [1, 2, 3, 4].map((total, index) => ({ session_id: `fresh-${index + 1}`, cost_usd: total })),
    );

    expect(replay.iterations.map((step) => step.cost)).toEqual([1, 1, 1, 1]);
    expect(replay.total).toBe(4);
    expect(replay.notes.some((note) => note.includes('its own session'))).toBe(false);
  });

  it('leaves per-session totals indeterminate when a cost row has no session ID', () => {
    // Two unidentified sessions would otherwise merge into one total under an empty key.
    const replay = runningTotals(
      [
        { session_id: 'a', cost_usd: 1 },
        { cost_usd: 2 },
        { session_id: 'a', cost_usd: 3 },
        { session_id: '', cost_usd: 4 },
      ],
      'session',
    );

    // Only the rows with a session ID count, so the total is the least it could be.
    expect(replay).toMatchObject({ costIndeterminate: true, unidentifiedCosts: 2, total: 3 });
    expect(replay.iterations.map((step) => step.cost)).toEqual([1, 0, 2, 0]);
    expect(replay.notes).toContain(
      '2 iterations with a cost have no session ID, so their running totals can’t be told apart: the total is only the least it could be, and what a governor saves is unknown. Choose “Across the whole log” to read one running total across every row.',
    );
    expect(replay.notes.some((note) => note.includes('read across the whole log'))).toBe(false);
  });

  it('reports at least the per-session total of the rows with a session ID', () => {
    // If the unidentified row starts another session, the true total is $10, not $8.
    const replay = runningTotals(
      [
        { session_id: 'a', cost_usd: 1 },
        { session_id: 'b', cost_usd: 5 },
        { cost_usd: 2 },
        { session_id: 'a', cost_usd: 3 },
      ],
      'session',
    );

    expect(replay).toMatchObject({ costIndeterminate: true, unidentifiedCosts: 1, total: 8 });
    expect(replay.iterations.map((step) => step.cumulative)).toEqual([1, 6, 6, 8]);
  });

  it('keeps the cost exact across the whole log, even with rows that have no session ID', () => {
    const replay = runningTotals([
      { session_id: 'a', cost_usd: 1 },
      { cost_usd: 2 },
      { session_id: 'a', cost_usd: 3 },
    ]);

    expect(replay).toMatchObject({ costIndeterminate: false, unidentifiedCosts: 0, total: 3 });
  });

  it('claims no savings and no budget stop when the cost is indeterminate', () => {
    const replay = runningTotals(
      [
        { session_id: 'a', cost_usd: 1, kept: true },
        { session_id: 'b', cost_usd: 5, kept: true },
        { cost_usd: 2, kept: true },
        { session_id: 'a', cost_usd: 3, kept: true },
      ],
      'session',
    );

    const capped = counterfactual(replay, { kind: 'maxIterations', maximum: 2 }, formatCost);
    expect(capped).toMatchObject({ stopIteration: 2, saved: null, uncertain: false });
    expect(capped.sentence).toBe(
      'A maximum of 2 iterations stops this at iteration 2, but 1 iteration with a cost has no session ID, so what it saves can’t be told, and it cuts off 2 later progress iterations.',
    );

    const budget = counterfactual(replay, { kind: 'budget', dollars: 5 }, formatCost);
    expect(budget).toMatchObject({ stopIndex: null, saved: null, uncertain: true });
    expect(budget.sentence).toBe(
      'A $5.00 budget can’t be checked on this log: 1 iteration with a cost has no session ID, so the running total is unknown.',
    );
  });

  it('keeps per-session totals when only rows without a cost lack a session ID', () => {
    const replay = runningTotals(
      [
        { session_id: 'a', cost_usd: 1 },
        { session_id: 'b', cost_usd: 2 },
        { score: 1 },
        { session_id: 'a', cost_usd: 3 },
      ],
      'session',
    );

    expect(replay.iterations.map((step) => step.cost)).toEqual([1, 2, 0, 2]);
    expect(replay.costIndeterminate).toBe(false);
    expect(replay.notes.some((note) => note.includes('no session ID'))).toBe(false);
  });

  it('reads per-session totals across the log when no session is mapped', () => {
    const log = parseLogText(
      [1, 3, 6].map((total) => JSON.stringify({ cost_usd: total })).join('\n'),
    );
    const replay = analyzeLog(log, {
      mapping: guessMapping(log.keys),
      lowerIsBetter: false,
      costIsRunningTotal: true,
      runningTotalScope: 'session',
    });

    expect(replay.total).toBe(6);
  });

  it('starts a new total on a drop within a session', () => {
    const replay = runningTotals(
      [
        { session_id: 'a', cost_usd: 2 },
        { session_id: 'b', cost_usd: 5 },
        { session_id: 'a', cost_usd: 1 },
      ],
      'session',
    );

    expect(replay.iterations.map((step) => step.cost)).toEqual([2, 5, 1]);
    expect(replay.notes).toContain(
      'The running total dropped once, so that iteration starts a new total at its own value.',
    );
  });

  it('reads a running total as per-iteration costs only if told to', () => {
    expect(replayOf('renamed-fields.jsonl').total).toBe(27.5);
  });

  it('infers stalls from kept alone when there’s no score, and says so', () => {
    const replay = replayOf('no-score.jsonl');

    expect(replay.hasScore).toBe(false);
    expect(replay.notes[0]).toContain('no score, so progress is inferred from kept alone');
    expect(replay.iterations.map((step) => step.progress)).toEqual([
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(counterfactual(replay, { kind: 'stall', m: 3 }, formatCost).stopIteration).toBe(8);
  });

  it('says what it couldn’t find', () => {
    const replay = analyzeLog(parseLogText('{"a":1}\n{"a":2}\n[1,2]\nnot json\n'), {
      mapping: guessMapping(['a']),
      lowerIsBetter: false,
      costIsRunningTotal: false,
    });

    expect(replay.iterations.map((step) => step.iteration)).toEqual([1, 2]);
    expect(replay.notes).toEqual([
      'This log has neither a score nor a kept field, so there’s no way to tell progress from a stall. Map one of them to see stalls.',
      'This log has no cost field, so every iteration costs $0.',
      'Skipped 2 lines that weren’t JSON objects.',
    ]);
  });

  it('leaves progress unknown, and the stall detector unchecked, with neither score nor kept', () => {
    const log = parseLogText(
      [1, 2, 3, 4, 5].map((cost) => JSON.stringify({ cost_usd: cost })).join('\n'),
    );
    const replay = analyzeLog(log, {
      mapping: guessMapping(log.keys),
      lowerIsBetter: false,
      costIsRunningTotal: false,
    });

    expect(replay.hasProgress).toBe(false);
    expect(replay.iterations.every((step) => step.progress === null)).toBe(true);
    expect(replay.iterations.every((step) => step.sinceProgress === null)).toBe(true);

    const stall = counterfactual(replay, { kind: 'stall', m: 2 }, formatCost);
    expect(stall).toMatchObject({ stopIndex: null, stopIteration: null, saved: 0 });
    expect(stall.sentence).toBe(
      'A stall detector of 2 can’t be checked on this log, which has neither a score nor a kept field.',
    );

    // The other governors don't need progress.
    expect(counterfactual(replay, { kind: 'maxIterations', maximum: 3 }, formatCost)).toMatchObject(
      { stopIteration: 3, saved: 9 },
    );
  });

  describe('rows whose progress is unknown', () => {
    const replayOfLines = (lines: Record<string, unknown>[]): Replay => {
      const log = parseLogText(lines.map((line) => JSON.stringify(line)).join('\n'));
      const mapping = guessMapping(log.keys);

      return analyzeLog(log, {
        mapping,
        lowerIsBetter: guessLowerIsBetter(mapping.score),
        costIsRunningTotal: false,
      });
    };
    const scored = (scores: (number | null)[]): Replay =>
      replayOfLines(scores.map((score) => ({ cost_usd: 1, score })));

    it('leaves progress unknown, and the stall count where it was, when a row has no score', () => {
      const replay = scored([1, 2, 3, null, null, null, 3, 3]);

      expect(replay.iterations.map((step) => step.progress)).toEqual([
        true,
        true,
        true,
        null,
        null,
        null,
        false,
        false,
      ]);
      // An unknown row neither resets nor adds to the count, and shows none of its own.
      expect(replay.notes).toContain(
        '3 iterations have no readable score, so their progress is unknown: they neither start nor end a stall.',
      );
      expect(replay.iterations.map((step) => step.sinceProgress)).toEqual([
        0,
        0,
        0,
        null,
        null,
        null,
        1,
        2,
      ]);
    });

    it('says a stall detector only might stop a run with unknown rows in the stretch', () => {
      const result = counterfactual(
        scored([1, 2, 3, null, null, null, 3, 3]),
        { kind: 'stall', m: 3 },
        formatCost,
      );

      expect(result.uncertain).toBe(true);
      expect(result.sentence).not.toContain('stops this');
      expect(result.sentence).not.toContain('never fires');
      expect(result.sentence).toContain('might stop this as early as iteration 6');
      // The chart marks the iteration the sentence names.
      expect(result).toMatchObject({ stopIteration: 6, saved: 0, progressLost: 0 });
      expect(result.sentence).toContain('3 iterations have no readable score');
    });

    it('says a stop is uncertain when an unknown score earlier could have raised the best', () => {
      // If iteration 2 scored 20, iteration 3 wasn’t progress and the stall came sooner.
      const result = counterfactual(
        scored([10, null, 15, 15, 15]),
        { kind: 'stall', m: 2 },
        formatCost,
      );

      // Every row after the missing score beats 10 but might not beat it, so all are unknown.
      expect(result).toMatchObject({ uncertain: true, stopIteration: 3, saved: 0 });
      expect(result.sentence).toBe(
        'A stall detector of 2 might stop this as early as iteration 3, but 4 iterations have unknown progress, so it can’t tell.',
      );
    });

    it('keeps the stop definite, and progress lost uncertain, when unknown rows follow it', () => {
      const result = counterfactual(
        scored([1, 2, 2, 2, null, 5]),
        { kind: 'stall', m: 2 },
        formatCost,
      );

      // If iteration 5 scored 10, iteration 6 wasn’t progress, so neither row is definite.
      expect(result).toMatchObject({ uncertain: false, progressLost: 0, progressLostAtMost: 2 });
      expect(result.sentence).toBe(
        'A stall detector of 2 stops this at iteration 4 and saves $2.00, and it might cut off up to 2 later progress iterations, but their progress is unknown, so it can’t tell exactly.',
      );
    });

    it('leaves an improvement unknown after a row whose score is missing', () => {
      // If iteration 2 scored 20, neither 11 nor 12 improved on it.
      const replay = scored([10, null, 11, 12]);

      expect(replay.iterations.map((step) => step.progress)).toEqual([true, null, null, null]);
      // The same holds when a lower score is better.
      const errors = replayOfLines([12, null, 11, 10].map((count) => ({ errors: count })));
      expect(errors.iterations.map((step) => step.progress)).toEqual([true, null, null, null]);
      expect(replay.notes).toContain(
        '2 iterations beat the best known score after an iteration whose progress is unknown and that might have scored higher, so their progress is unknown too.',
      );

      const result = counterfactual(replay, { kind: 'maxIterations', maximum: 1 }, formatCost);
      expect(result).toMatchObject({ stopIteration: 1, progressLost: 0, progressLostAtMost: 3 });
      expect(result.sentence).toBe(
        'A maximum of 1 iterations stops this at iteration 1 and saves $3.00, and it might cut off up to 3 later progress iterations, but their progress is unknown, so it can’t tell exactly.',
      );
    });

    it('settles an improvement once it beats the score an unknown row might have had', () => {
      const replay = replayOfLines([
        { score: 10, kept: true },
        { score: 15, kept: 'maybe' },
        { score: 12, kept: true },
        { score: 20, kept: true },
        { score: 18, kept: true },
      ]);

      // 12 beats 10 but not the 15 that might have been kept; 20 beats both.
      expect(replay.iterations.map((step) => step.progress)).toEqual([
        true,
        null,
        null,
        true,
        false,
      ]);
    });

    it('says progress lost is uncertain for every governor when a later row is unknown', () => {
      const replay = replayOfLines(
        [true, true, 'maybe', true].map((kept) => ({ cost_usd: 1, kept })),
      );

      for (const governor of [
        { kind: 'maxIterations', maximum: 1 },
        { kind: 'budget', dollars: 1 },
      ] as const) {
        const result = counterfactual(replay, governor, formatCost);
        expect(result).toMatchObject({ stopIteration: 1, progressLost: 2, progressLostAtMost: 3 });
        expect(result.sentence).toContain(
          'but it cuts off at least 2 later progress iterations, and up to 3: 1 more has unknown progress, so it can’t tell exactly.',
        );
      }
    });

    it('stays silent about progress lost when the log can’t show progress at all', () => {
      const log = parseLogText(
        [1, 2, 3].map((cost) => JSON.stringify({ cost_usd: cost })).join('\n'),
      );
      const replay = analyzeLog(log, {
        mapping: guessMapping(log.keys),
        lowerIsBetter: false,
        costIsRunningTotal: false,
      });
      const result = counterfactual(replay, { kind: 'maxIterations', maximum: 1 }, formatCost);

      // Any later iteration might have made progress, so no upper bound can be known.
      expect(result).toMatchObject({ progressLost: 0, progressLostAtMost: null });
      expect(result.sentence).toBe(
        'A maximum of 1 iterations stops this at iteration 1 and saves $5.00.',
      );
      for (const governor of [
        { kind: 'stall', m: 2 },
        { kind: 'maxIterations', maximum: 3 },
        { kind: 'budget', dollars: 100 },
      ] as const) {
        expect(counterfactual(replay, governor, formatCost).progressLostAtMost).toBeNull();
      }
    });

    it('leaves progress unknown when kept can’t be read, alone or beside a score', () => {
      const keptOnly = replayOfLines(
        [true, 'maybe', 'maybe', 'maybe', true].map((kept) => ({ cost_usd: 1, kept })),
      );
      expect(keptOnly.iterations.map((step) => step.progress)).toEqual([
        true,
        null,
        null,
        null,
        true,
      ]);
      expect(keptOnly.iterations.map((step) => step.kept)).toEqual([true, null, null, null, true]);
      const stall = counterfactual(keptOnly, { kind: 'stall', m: 3 }, formatCost);
      expect(stall.uncertain).toBe(true);
      expect(stall.sentence).toContain('might stop this as early as iteration 4');
      expect(stall.sentence).toContain('3 iterations have no readable kept value');

      const both = replayOfLines([
        { score: 1, kept: true },
        { score: 2, kept: 'maybe' },
        { score: 1, kept: 'maybe' },
        { score: 3, kept: false },
      ]);
      // Improved but maybe not kept is unknown; no better than the best is no progress either way.
      expect(both.iterations.map((step) => step.progress)).toEqual([true, null, false, false]);
    });
  });

  it('stops reading at the record limit and says so', () => {
    const reader = createLogReader();
    for (let index = 0; index <= MAXIMUM_RECORDS; index += 1) reader.addLine(`{"i":${index}}`);
    const log = reader.finish();

    expect(log.records).toHaveLength(MAXIMUM_RECORDS);
    expect(log.truncated).toBe(true);
  });

  it('reads numbers, booleans, and failures from loosely typed values', () => {
    expect(readNumber('$1.25')).toBe(1.25);
    expect(readNumber('abc')).toBeNull();
    expect(readNumber(Number.NaN)).toBeNull();
    expect(readBoolean('Reverted')).toBe(false);
    expect(readBoolean(1)).toBe(true);
    expect(readBoolean('maybe')).toBeNull();
    expect(readFailure('  tsc:   3 errors ')).toBe('tsc: 3 errors');
    expect(readFailure('')).toBeNull();
    expect(readFailure(false)).toBeNull();
    expect(readFailure({ code: 2 })).toBe('{"code":2}');
  });
});
