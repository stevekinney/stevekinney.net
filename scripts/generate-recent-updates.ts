import FastGlob from 'fast-glob';
import { readFileSync, writeFileSync } from 'fs';
import matter from 'gray-matter';
import simpleGit from 'simple-git';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

interface FrontmatterData {
  title?: string;
  description?: string;
  modified?: string;
  [key: string]: unknown;
}

interface UpdateEntry {
  title: string;
  description: string;
  modified: string;
  path: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const git = simpleGit({ baseDir: repoRoot });

function shouldIgnore(relPath: string): boolean {
  const base = path.basename(relPath);
  if (base === '_index.md') return true;
  if (base === 'README.md') return true;
  if (base.startsWith('meta-') && base.endsWith('.md')) return true;
  if (relPath.endsWith('/meta-orphaned.md')) return true;
  if (relPath.endsWith('/meta-ophaned.md')) return true;
  if (relPath.endsWith('/meta-broken.md')) return true;
  return false;
}

async function getLastCommitISO(filePath: string): Promise<string | null> {
  try {
    const iso = (await git.raw(['log', '-1', '--format=%cI', '--', filePath])).trim();
    return iso || null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const patterns = ['content/**/*.md'];
  const relFiles = FastGlob.sync(patterns, { cwd: repoRoot, dot: false });

  const entries: UpdateEntry[] = [];

  for (const rel of relFiles) {
    if (shouldIgnore(rel)) continue;

    const abs = path.resolve(repoRoot, rel);
    const raw = readFileSync(abs, 'utf-8');
    let data: FrontmatterData = {};
    try {
      ({ data } = matter(raw));
    } catch {
      // If frontmatter is invalid YAML, skip parsing but still include based on git date
      data = {};
    }

    let modified = data?.modified;
    if (!modified) {
      modified = await getLastCommitISO(abs);
    }
    if (!modified) continue; // skip if we cannot determine modified date

    // Convert filesystem path to site path: strip leading 'content' and trailing '.md'
    let sitePath = rel;
    if (sitePath.startsWith('content')) sitePath = sitePath.slice('content'.length);
    if (!sitePath.startsWith('/')) sitePath = '/' + sitePath;
    sitePath = sitePath.replace(/\.md$/, '');

    entries.push({
      title: data?.title ?? '',
      description: data?.description ?? '',
      modified,
      path: sitePath,
    });
  }

  entries.sort((a, b) => (a.modified < b.modified ? 1 : a.modified > b.modified ? -1 : 0));
  const top100 = entries.slice(0, 100);

  const yaml = YAML.stringify(top100);

  const outPath = path.resolve(repoRoot, 'static/recent-updates.yaml');
  writeFileSync(outPath, yaml, 'utf-8');
  console.log(`Wrote ${top100.length} entries to static/recent-updates.yaml`);
}

main();
