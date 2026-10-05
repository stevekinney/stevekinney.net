/**
 * Reads the synthetic fixtures under `tests/fixtures/session-log-auditor` for
 * unit tests. Node only; the page never imports this.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { claudeCodeAdapter } from './audit-data';
import type { AuditData } from './audit-data';

export const FIXTURE_ROOT = fileURLToPath(
  new URL('../../../../tests/fixtures/session-log-auditor/', import.meta.url),
);

/** Every fixture file's path relative to the fixture folder, sorted, as a dropped folder lists them. */
export const fixturePaths = (directory = FIXTURE_ROOT): string[] =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
    .map((entry) => relative(FIXTURE_ROOT, join(entry.parentPath, entry.name)))
    .sort();

/** A fixture's lines, as written. */
export const fixtureLines = (path: string): string[] =>
  readFileSync(join(FIXTURE_ROOT, path), 'utf8').split('\n');

/** Reads files given as `path → lines` through the Claude Code adapter. */
export const readLinesByFile = (files: Record<string, readonly string[]>): AuditData => {
  const reader = claudeCodeAdapter.createReader();

  for (const [path, lines] of Object.entries(files)) {
    const file = reader.readFile(path);
    lines.forEach((line) => file.addLine(line));
    file.finish();
  }

  return reader.finish();
};

/** Reads every fixture through the Claude Code adapter. */
export const readFixtures = (): AuditData =>
  readLinesByFile(Object.fromEntries(fixturePaths().map((path) => [path, fixtureLines(path)])));
