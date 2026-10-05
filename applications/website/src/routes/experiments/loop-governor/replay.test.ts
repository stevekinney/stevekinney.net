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
