import { describe, expect, it } from 'vitest';

import {
  addIntake,
  calibrateFromFile,
  clearEvidence,
  estimateFile,
  initialEvidence,
  moveFile,
  setAllSelected,
  setSelected,
  sortEvidence,
} from './evidence-state';
import type { EvidenceFile } from './fit-check';

const file = (path: string, characters: number): EvidenceFile => ({
  id: path,
  path,
  characters,
  bytes: characters,
  selected: true,
});

const intake = (
  files: EvidenceFile[],
  skipped: { path: string; reason: 'binary'; bytes: number }[] = [],
) => ({
  files,
  skipped,
});

describe('addIntake', () => {
  it('appends new files and keeps earlier ones', () => {
    const state = addIntake(
      addIntake(initialEvidence(), intake([file('a', 1)])),
      intake([file('b', 2)]),
    );

    expect(state.files.map((entry) => entry.path)).toEqual(['a', 'b']);
  });

  it('replaces a path that is dropped again, where it stands', () => {
    const first = addIntake(initialEvidence(), intake([file('a', 1), file('b', 2)]));
    const second = addIntake(first, intake([file('a', 10)]));

    expect(second.files.map((entry) => [entry.path, entry.characters])).toEqual([
      ['a', 10],
      ['b', 2],
    ]);
  });

  it('records skipped folders and files with their reasons', () => {
    const state = addIntake(
      initialEvidence(),
      intake([file('a', 1)], [{ path: 'logo.png', reason: 'binary', bytes: 9 }]),
      ['project/node_modules'],
    );

    expect(state.skipped.map((entry) => [entry.path, entry.reason])).toEqual([
      ['project/node_modules/', 'dependency-folder'],
      ['logo.png', 'binary'],
    ]);
  });

  it('does not list the same skipped path twice', () => {
    const once = addIntake(
      initialEvidence(),
      intake([], [{ path: 'logo.png', reason: 'binary', bytes: 9 }]),
    );
    const twice = addIntake(once, intake([], [{ path: 'logo.png', reason: 'binary', bytes: 9 }]));

    expect(twice.skipped).toHaveLength(1);
  });

  it('removes a skip entry once the file reads successfully', () => {
    const skipped = addIntake(
      initialEvidence(),
      intake([], [{ path: 'a.log', reason: 'binary', bytes: 9 }]),
    );
    const read = addIntake(skipped, intake([file('a.log', 5)]));

    expect(read.skipped).toEqual([]);
  });

  it('clears everything', () => {
    const state = clearEvidence(addIntake(initialEvidence(), intake([file('a', 1)])));

    expect(state.files).toEqual([]);
    expect(state.skipped).toEqual([]);
  });
});

describe('list edits', () => {
  const base = addIntake(initialEvidence(), intake([file('a', 10), file('b', 30), file('c', 20)]));

  it('toggles one file or all of them', () => {
    expect(setSelected(base, 'b', false).files.map((entry) => entry.selected)).toEqual([
      true,
      false,
      true,
    ]);
    expect(setAllSelected(base, false).files.every((entry) => !entry.selected)).toBe(true);
  });

  it('reorders by index', () => {
    expect(moveFile(base, 2, 0).files.map((entry) => entry.path)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by size and name', () => {
    expect(sortEvidence(base, 'size', true).files.map((entry) => entry.path)).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(sortEvidence(base, 'name', false).files.map((entry) => entry.path)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('calibration', () => {
  it('sets characters per token to 5 for a 400,000-character file known to be 80K, and re-estimates it', () => {
    const state = addIntake(initialEvidence(), intake([file('compare.log', 400_000)]));
    expect(estimateFile(state, state.files[0])).toBe(100_000);

    const calibrated = calibrateFromFile(state, 'compare.log', 80_000);

    expect(calibrated?.charactersPerToken).toBe(5);
    expect(estimateFile(calibrated!, calibrated!.files[0])).toBe(80_000);
  });

  it('returns null for a file that is not there or a count that makes no sense', () => {
    const state = addIntake(initialEvidence(), intake([file('a', 400)]));

    expect(calibrateFromFile(state, 'missing', 100)).toBeNull();
    expect(calibrateFromFile(state, 'a', 0)).toBeNull();
  });
});
