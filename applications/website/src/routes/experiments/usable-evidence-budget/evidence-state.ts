import { defaultMaximumBytes } from './file-intake';
import type { IntakeResult, SkippedEntry } from './file-intake';
import {
  calibrate,
  defaultCharactersPerToken,
  moveItem,
  sortFiles,
  estimateTokens,
} from './fit-check';
import type { EvidenceFile, FitMode, SortKey } from './fit-check';

export type EvidenceState = {
  /** The files, in priority order. */
  files: readonly EvidenceFile[];
  skipped: readonly SkippedEntry[];
  mode: FitMode;
  charactersPerToken: number;
  maximumBytes: number;
  /** Whether dependency and build folders are left unread when the next folder arrives. */
  skipFolders: boolean;
};

export const initialEvidence = (): EvidenceState => ({
  files: [],
  skipped: [],
  mode: 'manual',
  charactersPerToken: defaultCharactersPerToken,
  maximumBytes: defaultMaximumBytes,
  skipFolders: true,
});

/**
 * Adds what was just read. A path that is already in the list is replaced where
 * it stands, so dropping the same folder twice does not double it.
 */
export const addIntake = (
  state: EvidenceState,
  intake: IntakeResult,
  skippedFolders: readonly string[] = [],
): EvidenceState => {
  const replacements = new Map(intake.files.map((file) => [file.id, file]));
  const known = new Set(state.files.map((file) => file.id));
  const files = [
    ...state.files.map((file) => replacements.get(file.id) ?? file),
    ...intake.files.filter((file) => !known.has(file.id)),
  ];

  const skippedEntries: SkippedEntry[] = [
    ...skippedFolders.map((path): SkippedEntry => ({
      path: `${path}/`,
      reason: 'dependency-folder',
      bytes: null,
    })),
    ...intake.skipped,
  ];
  const incoming = new Set(skippedEntries.map((entry) => entry.path));
  const readNow = new Set(intake.files.map((file) => file.path));

  return {
    ...state,
    files,
    skipped: [
      ...state.skipped.filter((entry) => !incoming.has(entry.path) && !readNow.has(entry.path)),
      ...skippedEntries,
    ],
  };
};

export const clearEvidence = (state: EvidenceState): EvidenceState => ({
  ...state,
  files: [],
  skipped: [],
});

export const setSelected = (
  state: EvidenceState,
  id: string,
  selected: boolean,
): EvidenceState => ({
  ...state,
  files: state.files.map((file) => (file.id === id ? { ...file, selected } : file)),
});

export const setAllSelected = (state: EvidenceState, selected: boolean): EvidenceState => ({
  ...state,
  files: state.files.map((file) => ({ ...file, selected })),
});

export const moveFile = (state: EvidenceState, from: number, to: number): EvidenceState => ({
  ...state,
  files: moveItem(state.files, from, to),
});

export const sortEvidence = (
  state: EvidenceState,
  key: SortKey,
  descending: boolean,
): EvidenceState => ({ ...state, files: sortFiles(state.files, key, descending) });

/**
 * Derives characters per token from one file whose true token count is known.
 * Returns null if the file is missing or the count can't give a ratio.
 */
export const calibrateFromFile = (
  state: EvidenceState,
  id: string,
  trueTokens: number,
): EvidenceState | null => {
  const file = state.files.find((entry) => entry.id === id);
  const ratio = file ? calibrate(file.characters, trueTokens) : null;

  return ratio === null ? null : { ...state, charactersPerToken: ratio };
};

export const estimateFile = (state: EvidenceState, file: EvidenceFile): number =>
  estimateTokens(file.characters, state.charactersPerToken);
