import { findTerm, termKeys } from './budget';
import type { Scenario, TermKey } from './budget';

/** A file the person dropped, with what it takes to estimate it. */
export type EvidenceFile = {
  /** Unique within the list. It is the path. */
  id: string;
  path: string;
  characters: number;
  bytes: number;
  /** Whether the file is in the pool the fit mode works from. */
  selected: boolean;
};

export type FitMode = 'manual' | 'fill' | 'smallest';

export const fitModes: readonly { mode: FitMode; label: string; description: string }[] = [
  {
    mode: 'manual',
    label: 'Manual',
    description: 'Every checked file is included, whether or not it fits.',
  },
  {
    mode: 'fill',
    label: 'Fill in priority order',
    description:
      'Checked files go in from the top until the next one would not fit. The rest are marked as not fitting.',
  },
  {
    mode: 'smallest',
    label: 'Smallest first',
    description: 'Checked files go in from the smallest up, which fits the most files.',
  },
];

export const defaultCharactersPerToken = 4;
export const minimumCharactersPerToken = 0.1;
export const maximumCharactersPerToken = 100;

/** Characters divided by characters per token, rounded up so an estimate never flatters the fit. */
export const estimateTokens = (characters: number, charactersPerToken: number): number =>
  Math.max(0, Math.ceil(characters / charactersPerToken - 1e-9));

/**
 * The characters per token implied by a file whose true token count the person
 * knows, or null when the numbers can't give a sensible ratio.
 */
export const calibrate = (characters: number, trueTokens: number): number | null => {
  if (!(characters > 0) || !(trueTokens > 0)) return null;

  const ratio = characters / trueTokens;

  return ratio >= minimumCharactersPerToken && ratio <= maximumCharactersPerToken ? ratio : null;
};

export type FitStatus = 'included' | 'unchecked' | 'overflow';

export type FitPlan = {
  statuses: FitStatus[];
  /** Each file's estimate, in the order given. */
  tokens: number[];
  /** What the included files add up to. */
  evidence: number;
  includedCount: number;
};

/**
 * Decides which files are in, given the files in priority order. A file the
 * mode leaves out is marked `overflow`, which the list shows as "doesn't fit".
 */
export const planFit = (
  files: readonly EvidenceFile[],
  charactersPerToken: number,
  usableTokens: number,
  mode: FitMode,
): FitPlan => {
  const tokens = files.map((file) => estimateTokens(file.characters, charactersPerToken));
  const statuses: FitStatus[] = files.map((file) => (file.selected ? 'included' : 'unchecked'));
  const room = Math.max(usableTokens, 0);

  if (mode === 'fill') {
    let running = 0;
    let full = false;

    files.forEach((file, index) => {
      if (!file.selected) return;

      if (!full && running + tokens[index] <= room) {
        running += tokens[index];
      } else {
        full = true;
        statuses[index] = 'overflow';
      }
    });
  } else if (mode === 'smallest') {
    const candidates = files
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.selected)
      .sort(
        (first, second) => tokens[first.index] - tokens[second.index] || first.index - second.index,
      );
    let running = 0;

    for (const { index } of candidates) {
      if (running + tokens[index] <= room) {
        running += tokens[index];
      } else {
        statuses[index] = 'overflow';
      }
    }
  }

  let evidence = 0;
  let includedCount = 0;
  statuses.forEach((status, index) => {
    if (status === 'included') {
      evidence += tokens[index];
      includedCount += 1;
    }
  });

  return { statuses, tokens, evidence, includedCount };
};

export type EvidenceSummary = {
  evidence: number;
  usable: number;
  /** Evidence as a share of what is usable, or null when nothing is usable. */
  share: number | null;
  fits: boolean;
  /** What is left once the evidence is in. Zero when it does not fit. */
  spare: number;
  /** How far past the usable budget the evidence goes. Zero when it fits. */
  over: number;
};

export const summarizeEvidence = (evidence: number, usableTokens: number): EvidenceSummary => {
  const fits = evidence <= usableTokens;

  return {
    evidence,
    usable: usableTokens,
    share: usableTokens > 0 ? (evidence / usableTokens) * 100 : null,
    fits,
    spare: fits ? usableTokens - evidence : 0,
    over: fits ? 0 : evidence - usableTokens,
  };
};

export type CutSuggestion = {
  files: { id: string; path: string; tokens: number }[];
  /** What the evidence comes to once those files are out. */
  remaining: number;
  /** False when even removing every file would leave the window over-committed. */
  possible: boolean;
};

/**
 * The fewest files to remove so the rest fit: the largest included files, one
 * at a time, until what is left is within the usable budget. Among files of
 * the same size, the lowest priority goes first.
 */
export const suggestCuts = (
  included: readonly { id: string; path: string; tokens: number }[],
  usableTokens: number,
): CutSuggestion | null => {
  const evidence = included.reduce((total, file) => total + file.tokens, 0);
  if (evidence <= usableTokens) return null;

  const candidates = included
    .map((file, index) => ({ file, index }))
    .sort((first, second) => second.file.tokens - first.file.tokens || second.index - first.index);
  const files: CutSuggestion['files'] = [];
  let remaining = evidence;

  for (const { file } of candidates) {
    if (remaining <= usableTokens) break;
    if (file.tokens === 0) continue;

    files.push(file);
    remaining -= file.tokens;
  }

  return { files, remaining, possible: remaining <= usableTokens };
};

export type TermReduction = {
  key: TermKey;
  phrase: string;
  from: number;
  to: number;
};

/**
 * Every single term that could absorb the shortfall on its own, the largest
 * first. A term that is smaller than the shortfall can't, because it can't go
 * below zero.
 */
export const suggestTermReductions = (scenario: Scenario, shortfall: number): TermReduction[] =>
  termKeys
    .filter((key) => scenario[key] >= shortfall && scenario[key] > 0)
    .map((key) => ({
      key,
      phrase: findTerm(key).phrase,
      from: scenario[key],
      to: scenario[key] - shortfall,
    }))
    .sort((first, second) => second.from - first.from);

/** The included files' paths, one per line, for feeding to another tool. */
export const exportPaths = (paths: readonly string[]): string =>
  paths.length === 0 ? '' : `${paths.join('\n')}\n`;

/** Moves the item at `from` to `to`, shifting the others. */
export const moveItem = <T>(items: readonly T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || from >= items.length) return [...items];

  const target = Math.min(Math.max(to, 0), items.length - 1);
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);

  return next;
};

export type SortKey = 'size' | 'name';

/** Largest first for size, A to Z for name, with the opposite order on a second request. */
export const sortFiles = (
  files: readonly EvidenceFile[],
  key: SortKey,
  descending: boolean,
): EvidenceFile[] =>
  [...files].sort((first, second) => {
    const comparison =
      key === 'size'
        ? first.characters - second.characters
        : first.path.localeCompare(second.path, 'en', { numeric: true });

    return (descending ? -comparison : comparison) || first.path.localeCompare(second.path);
  });
