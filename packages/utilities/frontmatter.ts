import path from 'node:path';
import * as yaml from 'js-yaml';
import matter from 'gray-matter';

/** Parse frontmatter with CORE schema so date-like strings stay as strings (avoids js-yaml timezone bugs). */
export const parseFrontmatter = (contents: string) =>
  matter(contents, {
    engines: {
      yaml: {
        parse: (str: string) =>
          yaml.load(str, { schema: yaml.CORE_SCHEMA }) as Record<string, unknown>,
      },
    },
  });

/** Parse date from frontmatter. Date-only strings (YYYY-MM-DD) are parsed as UTC to avoid timezone shifts. */
export const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const str = String(value);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    const candidate = new Date(Date.UTC(y, m - 1, d));
    if (
      candidate.getUTCFullYear() !== y ||
      candidate.getUTCMonth() !== m - 1 ||
      candidate.getUTCDate() !== d
    )
      return null;
    return candidate;
  }
  const calendar = /^(\d{4})-(\d{2})-(\d{2})T/u.exec(str);
  if (calendar) {
    const candidate = new Date(
      Date.UTC(Number(calendar[1]), Number(calendar[2]) - 1, Number(calendar[3])),
    );
    if (
      candidate.getUTCFullYear() !== Number(calendar[1]) ||
      candidate.getUTCMonth() !== Number(calendar[2]) - 1 ||
      candidate.getUTCDate() !== Number(calendar[3])
    )
      return null;
  }
  const date = value instanceof Date ? value : new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Format any date-like value as a YYYY-MM-DD string (UTC). Returns null if the value is not a valid date. */
export const toDateString = (value: unknown): string | null => {
  const date = toDate(value);
  if (!date) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const normalizePath = (value: string): string => value.split(path.sep).join('/');

export type ContentSourceKind = 'writing' | 'course' | 'lesson';

/** Classify a repository markdown path by the content document it represents. */
export const classifyContentSource = (value: string): ContentSourceKind | null => {
  const sourcePath = normalizePath(value).replace(/^\.\//, '');
  if (/^writing\/[^/]+\.md$/.test(sourcePath)) return 'writing';
  if (/^courses\/[^/]+\/README\.md$/.test(sourcePath)) return 'course';
  if (/^courses\/[^/]+\/[^/]+\.md$/.test(sourcePath)) return 'lesson';
  return null;
};
