/** The sections every entry should have. An entry missing one is "partial". */
export type CoreSection = 'summary' | 'whenToUse' | 'whenNotToUse';

/** Every section the explorer reads from a note's body. */
export type SectionKey = CoreSection | 'drawbacks';

/** One note, normalized. The section fields hold the note's own Markdown. */
export type PatternEntry = {
  /** A slug of the name. It's the entry's stable URL fragment. */
  id: string;
  /** The file name without its extension, which is also what wikilinks point at. */
  name: string;
  type: string;
  category: string;
  /** Lowercase, such as `established`. Empty when the note doesn't say. */
  maturity: string;
  /** Capitalized, such as `Strong`. Empty when the note doesn't say. */
  confidence: string;
  aliases: string[];
  summary: string;
  whenToUse: string;
  whenNotToUse: string;
  drawbacks: string;
  /** The names a note's Related Patterns section links to, resolved to the real name when it exists. */
  related: string[];
  sourcePath: string;
  /** Which core sections are absent. */
  missing: CoreSection[];
};

export type ExcludedNote = {
  path: string;
  reason: string;
};

export type PartialEntry = {
  id: string;
  name: string;
  sourcePath: string;
  missing: CoreSection[];
};

export type DanglingLink = {
  id: string;
  name: string;
  target: string;
};

export type UnknownValue = {
  id: string;
  name: string;
  field: 'category' | 'maturity' | 'confidence';
  /** The value as written. Empty when the note leaves the field out. */
  value: string;
};

/** What a build or a folder load found, in the order the report prints it. */
export type DatasetReport = {
  includedTypes: string[];
  /** How many notes were read, included or not. */
  notesRead: number;
  includedByType: Record<string, number>;
  excluded: ExcludedNote[];
  partial: PartialEntry[];
  dangling: DanglingLink[];
  unknown: UnknownValue[];
  /** Every related link that survived: duplicates and self-references are already dropped. */
  relatedLinkCount: number;
};

export type PatternDataset = {
  entries: PatternEntry[];
  report: DatasetReport;
};

/** A Markdown file to normalize. */
export type NoteSource = {
  path: string;
  text: string;
};
