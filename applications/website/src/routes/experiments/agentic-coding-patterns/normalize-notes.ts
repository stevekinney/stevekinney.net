import {
  defaultIncludedTypes,
  knownCategories,
  knownConfidences,
  knownMaturities,
  sectionHeadings,
  uncategorized,
} from './pattern-constants';
import { frontmatterList, frontmatterString, parseFrontmatter } from './frontmatter';
import type {
  CoreSection,
  DatasetReport,
  ExcludedNote,
  NoteSource,
  PatternDataset,
  PatternEntry,
} from './pattern-types';
import { extractSection, findHeadings } from './sections';
import { extractWikilinkTargets } from './wikilinks';

/**
 * Turns notes into the dataset the explorer shows. The build script and the
 * in-browser folder loader both call it, so a folder a person drops is read
 * exactly as the bundled library was. It needs no Node APIs.
 */

export const slugify = (value: string): string => {
  const slug = value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug === '' ? 'note' : slug;
};

const comparePaths = (first: string, second: string): number =>
  first < second ? -1 : first > second ? 1 : 0;

/** The file name without its folders or extension. */
export const noteName = (path: string): string =>
  (path.split(/[\\/]/).at(-1) ?? path).replace(/\.(md|markdown)$/i, '');

/** Reads a comma list such as `pattern, methodology` into lowercase types. */
export const parseTypeList = (value: string): string[] => [
  ...new Set(
    value
      .split(',')
      .map((type) => type.trim().toLowerCase())
      .filter((type) => type !== ''),
  ),
];

const normalizeCategory = (value: string): string => {
  const category = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');

  return category === '' ? uncategorized : category;
};

const normalizeMaturity = (value: string): string => value.trim().toLowerCase();

const normalizeConfidence = (value: string): string => {
  const trimmed = value.trim();
  const known = knownConfidences.find(
    (confidence) => confidence.toLowerCase() === trimmed.toLowerCase(),
  );

  return known ?? trimmed;
};

type NormalizedNote =
  | { kind: 'entry'; entry: Omit<PatternEntry, 'id' | 'related'> & { rawRelated: string[] } }
  | { kind: 'excluded'; excluded: ExcludedNote };

const normalizeNote = (note: NoteSource, includedTypes: string[]): NormalizedNote => {
  const parsed = parseFrontmatter(note.text);

  if (!parsed.hasFrontmatter) {
    return { kind: 'excluded', excluded: { path: note.path, reason: 'It has no frontmatter.' } };
  }

  const type = frontmatterString(parsed.data.type).trim().toLowerCase();

  if (type === '') {
    return {
      kind: 'excluded',
      excluded: { path: note.path, reason: 'Its frontmatter has no type.' },
    };
  }

  if (!includedTypes.includes(type)) {
    return {
      kind: 'excluded',
      excluded: {
        path: note.path,
        reason: `Its type is "${type}", and only ${includedTypes.join(', ')} ${includedTypes.length === 1 ? 'is' : 'are'} included.`,
      },
    };
  }

  const lines = parsed.body.split('\n');
  const headings = findHeadings(lines);
  const section = (heading: string): string => extractSection(lines, headings, heading) ?? '';

  const summary = section(sectionHeadings.summary);
  const whenToUse = section(sectionHeadings.whenToUse);
  const whenNotToUse = section(sectionHeadings.whenNotToUse);
  const missing: CoreSection[] = [];
  if (summary === '') missing.push('summary');
  if (whenToUse === '') missing.push('whenToUse');
  if (whenNotToUse === '') missing.push('whenNotToUse');

  const aliases = [
    ...new Set(
      frontmatterList(parsed.data.aliases ?? parsed.data.alias)
        .map((alias) => alias.trim())
        .filter((alias) => alias !== ''),
    ),
  ];

  return {
    kind: 'entry',
    entry: {
      name: noteName(note.path),
      type,
      category: normalizeCategory(frontmatterString(parsed.data.category)),
      maturity: normalizeMaturity(frontmatterString(parsed.data.maturity)),
      confidence: normalizeConfidence(frontmatterString(parsed.data.confidence)),
      aliases,
      summary,
      whenToUse,
      whenNotToUse,
      drawbacks: section(sectionHeadings.drawbacks),
      rawRelated: extractWikilinkTargets(section(sectionHeadings.related)),
      sourcePath: note.path,
      missing,
    },
  };
};

export type BuildDatasetOptions = {
  /** The types to include. Defaults to `pattern` and `methodology`. */
  includedTypes?: readonly string[];
};

/**
 * Normalizes notes into entries and a report of what was found. Notes are read
 * in path order, so when two share a name the first path wins and the other is
 * excluded with a reason that names both paths.
 */
export const buildDataset = (
  notes: readonly NoteSource[],
  { includedTypes = defaultIncludedTypes }: BuildDatasetOptions = {},
): PatternDataset => {
  const types = [...new Set(includedTypes.map((type) => type.trim().toLowerCase()))].filter(
    (type) => type !== '',
  );
  const excluded: ExcludedNote[] = [];
  const winners = new Map<string, string>();
  const candidates: Extract<NormalizedNote, { kind: 'entry' }>['entry'][] = [];

  for (const note of [...notes].sort((first, second) => comparePaths(first.path, second.path))) {
    const result = normalizeNote(note, types);

    if (result.kind === 'excluded') {
      excluded.push(result.excluded);
      continue;
    }

    const key = result.entry.name.toLowerCase();
    const winner = winners.get(key);

    if (winner !== undefined) {
      excluded.push({
        path: note.path,
        reason: `Another note named "${result.entry.name}" comes first, at ${winner}, so this one is skipped.`,
      });
      continue;
    }

    winners.set(key, note.path);
    candidates.push(result.entry);
  }

  candidates.sort(
    (first, second) =>
      first.name.localeCompare(second.name, 'en', { sensitivity: 'base' }) ||
      comparePaths(first.sourcePath, second.sourcePath),
  );

  const usedIds = new Set<string>();
  const ids = candidates.map((candidate) => {
    const base = slugify(candidate.name);
    let id = base;

    for (let suffix = 2; usedIds.has(id); suffix += 1) id = `${base}-${suffix}`;
    usedIds.add(id);

    return id;
  });

  const namesByLowercase = new Map(
    candidates.map((candidate) => [candidate.name.toLowerCase(), candidate.name]),
  );

  const report: DatasetReport = {
    includedTypes: types,
    notesRead: notes.length,
    includedByType: {},
    excluded,
    partial: [],
    dangling: [],
    unknown: [],
    relatedLinkCount: 0,
  };

  const entries = candidates.map(({ rawRelated, ...candidate }, index): PatternEntry => {
    const id = ids[index] ?? slugify(candidate.name);
    const related: string[] = [];
    const seen = new Set<string>([candidate.name.toLowerCase()]);

    for (const target of rawRelated) {
      const key = target.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      const resolved = namesByLowercase.get(key);
      related.push(resolved ?? target);

      if (resolved === undefined) report.dangling.push({ id, name: candidate.name, target });
    }

    report.relatedLinkCount += related.length;
    report.includedByType[candidate.type] = (report.includedByType[candidate.type] ?? 0) + 1;

    if (candidate.missing.length > 0) {
      report.partial.push({
        id,
        name: candidate.name,
        sourcePath: candidate.sourcePath,
        missing: candidate.missing,
      });
    }

    const unknownFields = [
      [
        'category',
        candidate.category,
        (knownCategories as readonly string[]).includes(candidate.category),
      ],
      [
        'maturity',
        candidate.maturity,
        (knownMaturities as readonly string[]).includes(candidate.maturity),
      ],
      [
        'confidence',
        candidate.confidence,
        (knownConfidences as readonly string[]).includes(candidate.confidence),
      ],
    ] as const;

    for (const [field, value, known] of unknownFields) {
      if (!known) {
        report.unknown.push({
          id,
          name: candidate.name,
          field,
          value: value === uncategorized ? '' : value,
        });
      }
    }

    return { id, ...candidate, related };
  });

  return { entries, report };
};

const countLine = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

/** The report as plain text lines, which the build script prints. */
export const formatReport = ({ entries, report }: PatternDataset): string[] => {
  const lines: string[] = [];
  const byType = Object.entries(report.includedByType)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');

  lines.push(
    `Included: ${entries.length} of ${report.notesRead} notes${byType ? ` (${byType})` : ''}.`,
  );

  lines.push('', `Excluded: ${report.excluded.length}`);
  for (const { path, reason } of report.excluded) lines.push(`  ${path}: ${reason}`);

  lines.push('', `Partial entries: ${report.partial.length}`);
  for (const { name, missing } of report.partial)
    lines.push(`  ${name}: missing ${missing.join(', ')}`);

  lines.push('', `Dangling related links: ${report.dangling.length}`);
  for (const { name, target } of report.dangling) lines.push(`  ${name} -> ${target}`);

  lines.push('', `Unknown category, maturity, or confidence values: ${report.unknown.length}`);
  for (const { name, field, value } of report.unknown) {
    lines.push(`  ${name}: ${field} ${value === '' ? 'is missing' : `"${value}" is unknown`}`);
  }

  lines.push('', `Related links: ${countLine(report.relatedLinkCount, 'link')} in total.`);

  return lines;
};
