import FastGlob from 'fast-glob';
import { readFileSync } from 'fs';
import matter from 'gray-matter';
import path from 'path';

interface FrontmatterData {
  date?: string | Date;
  [key: string]: unknown;
}

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

const files = FastGlob.sync('content/**/*.md', { dot: false });

const missing: string[] = [];

for (const rel of files) {
  if (shouldIgnore(rel)) continue;
  try {
    const raw = readFileSync(rel, 'utf-8');
    const { data } = matter(raw);
    const frontmatter = data as FrontmatterData;
    if (!frontmatter || !frontmatter.date) {
      missing.push(rel);
    }
  } catch {
    // If frontmatter can't be parsed, consider it missing
    missing.push(rel);
  }
}

console.log(`Files missing date: ${missing.length}`);
for (const p of missing.slice(0, 50)) {
  console.log(` - ${p}`);
}
if (missing.length > 50) {
  console.log(` ... and ${missing.length - 50} more`);
}
