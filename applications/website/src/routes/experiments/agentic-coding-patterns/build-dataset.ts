/**
 * Reads the Agentic Coding Patterns notes from the Obsidian vault and writes
 * the normalized dataset the explorer ships with. It runs locally, never in
 * the site build, because Vercel can't see the vault: the output is committed.
 *
 *   bun run experiments:patterns:build
 *   bun run experiments:patterns:build -- --source <folder> --output <file>
 *
 * The folder defaults to `AGENTIC_CODING_PATTERNS_SOURCE`, then to the vault.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

import { buildDataset, formatReport } from './normalize-notes';
import type { NoteSource } from './pattern-types';

const here = path.dirname(fileURLToPath(import.meta.url));

const defaultSource = path.join(
  homedir(),
  'Vaults',
  'Lost Gradient',
  'AI Development Setup',
  'Agentic Coding Patterns',
);
const defaultOutput = path.join(here, 'patterns.json');

const readOption = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);

  return index === -1 ? undefined : process.argv[index + 1];
};

const collectMarkdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith('.'))
      .map((entry) => {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) return collectMarkdownFiles(entryPath);

        return Promise.resolve(entry.name.toLowerCase().endsWith('.md') ? [entryPath] : []);
      }),
  );

  return nested.flat();
};

const source = path.resolve(
  readOption('source') ?? process.env.AGENTIC_CODING_PATTERNS_SOURCE ?? defaultSource,
);
const output = path.resolve(readOption('output') ?? defaultOutput);

const files = await collectMarkdownFiles(source).catch(() => {
  console.error(`Couldn't read notes from ${source}. Pass --source <folder> to point elsewhere.`);
  process.exit(1);
});

const notes: NoteSource[] = await Promise.all(
  files.map(async (file) => ({
    // Paths are relative to the source folder, so the dataset never records where the vault lives.
    path: path.relative(source, file).split(path.sep).join('/'),
    text: await readFile(file, 'utf8'),
  })),
);

const dataset = buildDataset(notes);

// Format the way Prettier would, so the lint check accepts the committed file.
const options = (await resolveConfig(output)) ?? {};
await writeFile(output, await format(JSON.stringify(dataset), { ...options, parser: 'json' }));

console.log(`Read ${notes.length} notes from ${source}`);
console.log(`Wrote ${dataset.entries.length} entries to ${path.relative(process.cwd(), output)}\n`);
console.log(formatReport(dataset).join('\n'));
