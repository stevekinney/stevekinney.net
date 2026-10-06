/**
 * Reads the synthetic fixtures under `tests/fixtures/session-log-auditor` for
 * unit tests. Node only; the page never imports this.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readLinesByFile } from './audit-data';
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

/** Reads every fixture through the Claude Code adapter. */
export const readFixtures = (): AuditData =>
  readLinesByFile(Object.fromEntries(fixturePaths().map((path) => [path, fixtureLines(path)])));
