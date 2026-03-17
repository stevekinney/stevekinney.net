import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import simpleGit from 'simple-git';

import { parseFrontmatter, toDateString } from './frontmatter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const git = simpleGit(REPO_ROOT);

const today = (): string => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getFirstCommitDate = async (file: string): Promise<string | null> => {
  try {
    const log = await git.log({ file, '--diff-filter': 'A', '--follow': null });
    const first = log.all.at(-1);
    if (!first) return null;
    return toDateString(first.date);
  } catch {
    return null;
  }
};

const shouldSkip = (filePath: string, data: Record<string, unknown>): boolean => {
  if (path.basename(filePath) === '_index.md') return true;
  if (data.layout === 'contents') return true;
  return false;
};

/** Extract the raw frontmatter block (between --- markers) from file contents. */
const extractFrontmatterBlock = (contents: string): { block: string; rest: string } | null => {
  const match = contents.match(/^---\n([\s\S]*?)\n---(\n[\s\S]*)?$/);
  if (!match) return null;
  return { block: match[1], rest: match[2] ?? '' };
};

/** Replace or add a frontmatter field value (single-line values only). */
const setField = (block: string, key: string, value: string): string => {
  const regex = new RegExp(`^${key}:.*$`, 'm');
  if (regex.test(block)) {
    return block.replace(regex, `${key}: ${value}`);
  }
  return block + `\n${key}: ${value}`;
};

/** Remove a frontmatter field (handles single-line values). */
const removeField = (block: string, key: string): string => {
  return block.replace(new RegExp(`^${key}:.*\n?`, 'm'), '');
};

const processFile = async (filePath: string): Promise<boolean> => {
  const absolutePath = path.resolve(REPO_ROOT, filePath);
  const contents = await readFile(absolutePath, 'utf8');

  // Use parseFrontmatter (CORE_SCHEMA) to read data safely
  const { data } = parseFrontmatter(contents);

  if (shouldSkip(filePath, data)) return false;

  const extracted = extractFrontmatterBlock(contents);
  if (!extracted) return false;

  let { block } = extracted;
  const { rest } = extracted;
  let changed = false;

  // Backfill missing date from Git history
  if (!data.date) {
    const gitDate = await getFirstCommitDate(filePath);
    const dateValue = gitDate ?? today();
    block = setField(block, 'date', dateValue);
    changed = true;
  } else {
    // Normalize date to YYYY-MM-DD
    const normalizedDate = toDateString(data.date);
    if (normalizedDate && normalizedDate !== String(data.date)) {
      block = setField(block, 'date', normalizedDate);
      changed = true;
    }
  }

  // Set modified to today
  const todayStr = today();
  const normalizedModified = toDateString(data.modified);
  if (normalizedModified !== todayStr) {
    block = setField(block, 'modified', todayStr);
    changed = true;
  }

  // Remove published field
  if ('published' in data) {
    block = removeField(block, 'published');
    changed = true;
  }

  if (!changed) return false;

  const newContents = `---\n${block}\n---${rest}`;
  await writeFile(absolutePath, newContents, 'utf8');
  return true;
};

const main = async () => {
  let files: string[];

  if (process.argv.length > 2) {
    // Files passed as arguments (from pre-commit hook / lint-staged)
    files = process.argv.slice(2);
  } else {
    // Default: glob all content files
    const patterns = ['writing/*.md', 'courses/**/*.md'];
    files = await fg(patterns, { cwd: REPO_ROOT, onlyFiles: true });
  }

  let updated = 0;
  for (const file of files) {
    const wasUpdated = await processFile(file);
    if (wasUpdated) {
      updated++;
      console.log(`  Updated: ${file}`);
    }
  }

  console.log(`Done. Updated ${updated} of ${files.length} files.`);
};

await main();
