import type { PatternDataset } from './pattern-types';

/**
 * Checks the committed dataset's shape while the page prerenders, so a bad
 * edit to `patterns.json` fails the build instead of shipping a broken page.
 * It's plain code rather than a schema library, which keeps zod out of the
 * browser bundle.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fail = (path: string, expected: string): never => {
  throw new Error(`patterns.json: ${path} should be ${expected}.`);
};

const text = (value: unknown, path: string): string =>
  typeof value === 'string' ? value : fail(path, 'a string');

const textList = (value: unknown, path: string): string[] =>
  Array.isArray(value)
    ? value.map((item, index) => text(item, `${path}[${index}]`))
    : fail(path, 'a list of strings');

const records = (value: unknown, path: string): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.map((item, index) => (isRecord(item) ? item : fail(`${path}[${index}]`, 'an object')))
    : fail(path, 'a list of objects');

const count = (value: unknown, path: string): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : fail(path, 'a whole number');

const coreSections = ['summary', 'whenToUse', 'whenNotToUse'] as const;

export const parseDataset = (value: unknown): PatternDataset => {
  if (!isRecord(value)) return fail('the file', 'an object');

  const ids = new Set<string>();
  const entries = records(value.entries, 'entries').map((entry, index) => {
    const path = `entries[${index}]`;
    const id = text(entry.id, `${path}.id`);

    if (ids.has(id)) fail(`${path}.id`, `unique, but "${id}" repeats`);
    ids.add(id);

    const missing = textList(entry.missing, `${path}.missing`).map((section) =>
      (coreSections as readonly string[]).includes(section)
        ? (section as (typeof coreSections)[number])
        : fail(`${path}.missing`, 'only core section names'),
    );

    return {
      id,
      name: text(entry.name, `${path}.name`),
      type: text(entry.type, `${path}.type`),
      category: text(entry.category, `${path}.category`),
      maturity: text(entry.maturity, `${path}.maturity`),
      confidence: text(entry.confidence, `${path}.confidence`),
      aliases: textList(entry.aliases, `${path}.aliases`),
      summary: text(entry.summary, `${path}.summary`),
      whenToUse: text(entry.whenToUse, `${path}.whenToUse`),
      whenNotToUse: text(entry.whenNotToUse, `${path}.whenNotToUse`),
      drawbacks: text(entry.drawbacks, `${path}.drawbacks`),
      related: textList(entry.related, `${path}.related`),
      sourcePath: text(entry.sourcePath, `${path}.sourcePath`),
      missing,
    };
  });

  const report = isRecord(value.report) ? value.report : fail('report', 'an object');
  const includedByType = isRecord(report.includedByType)
    ? report.includedByType
    : fail('report.includedByType', 'an object');

  return {
    entries,
    report: {
      includedTypes: textList(report.includedTypes, 'report.includedTypes'),
      notesRead: count(report.notesRead, 'report.notesRead'),
      includedByType: Object.fromEntries(
        Object.entries(includedByType).map(([type, total]) => [
          type,
          count(total, `report.includedByType.${type}`),
        ]),
      ),
      excluded: records(report.excluded, 'report.excluded').map((item, index) => ({
        path: text(item.path, `report.excluded[${index}].path`),
        reason: text(item.reason, `report.excluded[${index}].reason`),
      })),
      partial: records(report.partial, 'report.partial').map((item, index) => ({
        id: text(item.id, `report.partial[${index}].id`),
        name: text(item.name, `report.partial[${index}].name`),
        sourcePath: text(item.sourcePath, `report.partial[${index}].sourcePath`),
        missing: textList(item.missing, `report.partial[${index}].missing`).filter(
          (section): section is (typeof coreSections)[number] =>
            (coreSections as readonly string[]).includes(section),
        ),
      })),
      dangling: records(report.dangling, 'report.dangling').map((item, index) => ({
        id: text(item.id, `report.dangling[${index}].id`),
        name: text(item.name, `report.dangling[${index}].name`),
        target: text(item.target, `report.dangling[${index}].target`),
      })),
      unknown: records(report.unknown, 'report.unknown').map((item, index) => {
        const field = text(item.field, `report.unknown[${index}].field`);

        return {
          id: text(item.id, `report.unknown[${index}].id`),
          name: text(item.name, `report.unknown[${index}].name`),
          field:
            (['category', 'maturity', 'confidence'] as const).find((known) => known === field) ??
            fail(`report.unknown[${index}].field`, 'category, maturity, or confidence'),
          value: text(item.value, `report.unknown[${index}].value`),
        };
      }),
      relatedLinkCount: count(report.relatedLinkCount, 'report.relatedLinkCount'),
    },
  };
};
