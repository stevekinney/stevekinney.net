import FastGlob from 'fast-glob';
import { readFileSync, writeFileSync, statSync } from 'fs';
import matter from 'gray-matter';
import simpleGit from 'simple-git';
import path from 'path';
import { fileURLToPath } from 'url';

interface FrontmatterData {
  modified?: string;
  date?: string;
  [key: string]: unknown;
}

interface FileSystemTimes {
  birthISO: string | null;
  modISO: string | null;
}

// Resolve repo root based on this file's location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const git = simpleGit({ baseDir: repoRoot });

// If file paths are passed via CLI args, use those; otherwise scan all
const cliFiles = process.argv.slice(2);
const files =
  cliFiles.length > 0
    ? cliFiles
    : FastGlob.sync('../content/**/*.md', { cwd: __dirname, dot: false });

/**
 * Returns the most recent commit date for a given file in ISO 8601 format with timezone.
 * Uses `git log -1 --format=%cI -- <file>` which matches frontmatter date style.
 */
async function getLastCommitISO(filePath: string): Promise<string | null> {
  try {
    const result = await git.raw(['log', '-1', '--format=%cI', '--', filePath]);
    const iso = result.trim();
    return iso || null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to read git history for ${filePath}:`, message);
    return null;
  }
}

/**
 * Returns the first (oldest) commit date for a given file in ISO 8601 format.
 * Uses `git log --follow --format=%cI -- <file>` and takes the last line.
 */
async function getFirstCommitISO(filePath: string): Promise<string | null> {
  try {
    const result = await git.raw(['log', '--follow', '--format=%cI', '--', filePath]);
    const lines = result
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return null;
    return lines[lines.length - 1] || null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to read first commit for ${filePath}:`, message);
    return null;
  }
}

function shouldIgnore(file: string): boolean {
  if (file.endsWith('_index.md')) return true;
  if (file.endsWith('/meta-orphaned.md')) return true; // correct spelling
  if (file.endsWith('/meta-ophaned.md')) return true; // common misspelling
  if (file.endsWith('/meta-broken.md')) return true;
  return false;
}

let updatedCount = 0;

for (const inputPath of files) {
  const rel = inputPath; // keep original for ignore checks and logging

  if (shouldIgnore(rel)) continue;

  const abs = path.isAbsolute(inputPath) ? inputPath : path.resolve(repoRoot, inputPath);
  const lastIso = await getLastCommitISO(abs);

  const content = readFileSync(abs, 'utf-8');
  let parsed;
  try {
    parsed = matter(content);
  } catch {
    console.warn(`Skipping (invalid frontmatter): ${rel}`);
    continue;
  }
  const data = (parsed.data || {}) as FrontmatterData;

  let changed = false;
  const updatedFrontmatter: FrontmatterData = { ...data };

  // Fallback to filesystem timestamps when git history is absent
  const fsTimes: FileSystemTimes = (() => {
    try {
      const st = statSync(abs);
      const birth = st.birthtimeMs && st.birthtimeMs > 0 ? new Date(st.birthtimeMs) : null;
      const mod = st.mtimeMs && st.mtimeMs > 0 ? new Date(st.mtimeMs) : null;
      return {
        birthISO: birth ? birth.toISOString() : null,
        modISO: mod ? mod.toISOString() : null,
      };
    } catch {
      return { birthISO: null, modISO: null };
    }
  })();

  // Ensure modified reflects last commit or filesystem mtime
  const targetModified = lastIso || fsTimes.modISO;
  if (targetModified && data.modified !== targetModified) {
    updatedFrontmatter.modified = targetModified;
    changed = true;
  }

  // If missing date, set to first commit date
  if (!data.date) {
    const firstIso = await getFirstCommitISO(abs);
    const targetDate = firstIso || fsTimes.birthISO || fsTimes.modISO;
    if (targetDate) {
      updatedFrontmatter.date = targetDate;
      changed = true;
    }
  }

  if (!changed) continue; // nothing to update

  const updatedFile = matter.stringify(parsed.content, updatedFrontmatter);
  writeFileSync(abs, updatedFile, 'utf-8');
  updatedCount += 1;
  console.log(
    `Updated frontmatter in ${rel}${targetModified && data.modified !== targetModified ? ' [modified]' : ''}${!data.date ? ' [date]' : ''}`,
  );
}

console.log(`Done. Updated ${updatedCount} file(s).`);
