import path from 'node:path';
import yaml from 'js-yaml';
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const date = value instanceof Date ? value : new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const normalizePath = (value: string): string => value.split(path.sep).join('/');
