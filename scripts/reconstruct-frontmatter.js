import FastGlob from 'fast-glob';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import simpleGit from 'simple-git';

const git = simpleGit();

function shouldIgnore(relPath) {
  const base = path.basename(relPath);
  if (base === '_index.md') return true;
  if (base === 'README.md') return true;
  if (base.startsWith('meta-') && base.endsWith('.md')) return true;
  if (relPath.endsWith('/meta-orphaned.md')) return true;
  if (relPath.endsWith('/meta-ophaned.md')) return true;
  if (relPath.endsWith('/meta-broken.md')) return true;
  return false;
}

async function getLastCommitISO(filePath) {
  try {
    const out = await git.raw(['log', '-1', '--format=%cI', '--', filePath]);
    return out.trim() || null;
  } catch {
    return null;
  }
}

async function getFirstCommitISO(filePath) {
  try {
    const out = await git.raw(['log', '--follow', '--format=%cI', '--', filePath]);
    const lines = out
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.length ? lines[lines.length - 1] : null;
  } catch {
    return null;
  }
}

function titleCase(str) {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripMarkdown(s) {
  if (!s) return s;
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  s = s.replace(/^\s{0,3}#{1,6}\s*/gm, '');
  s = s.replace(/^>\s?/gm, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function deriveTitle(data, content, filePath) {
  if (data?.title && String(data.title).trim()) return data.title;
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*#\s+(.+)/);
    if (m) return stripMarkdown(m[1]).trim();
  }
  const base = path.basename(filePath, '.md');
  return titleCase(base);
}

function deriveDescription(data, content) {
  if (data?.description && String(data.description).trim()) return data.description;
  const lines = content.split(/\r?\n/);
  const para = [];
  let inFence = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (line.trim().length === 0) {
      if (para.length) break;
      continue;
    }
    if (/^\s*#/.test(line)) continue;
    if (/^\s*>/.test(line)) continue;
    para.push(line.trim());
  }
  let desc = stripMarkdown(para.join(' '));
  if (!desc) return undefined;
  if (desc.length > 240) desc = desc.slice(0, 237).trimEnd() + '...';
  return desc;
}

function stripBrokenFrontmatter(raw) {
  // Remove a leading frontmatter block if present, regardless of validity
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    if (end !== -1) {
      const after = raw.slice(end + 4);
      // If next line is blank, drop it
      return after.replace(/^\r?\n/, '');
    }
  }
  return raw;
}

async function processFile(rel) {
  const raw = readFileSync(rel, 'utf-8');
  let parsed;
  let hadError = false;
  try {
    parsed = matter(raw);
  } catch {
    hadError = true;
    const body = stripBrokenFrontmatter(raw);
    parsed = { data: {}, content: body }; // reconstruct from scratch
  }

  const data = parsed.data || {};
  const content = parsed.content || '';

  const lastIso = await getLastCommitISO(rel);
  const firstIso = await getFirstCommitISO(rel);

  const next = { ...data };
  // Title/description
  if (!next.title || !String(next.title).trim()) next.title = deriveTitle(data, content, rel);
  const desc = deriveDescription(data, content);
  if (!next.description && desc) next.description = desc;
  // Dates
  if (!next.modified && lastIso) next.modified = lastIso;
  if (!next.date && firstIso) next.date = firstIso;

  const changed =
    hadError ||
    next.title !== data.title ||
    next.description !== data.description ||
    next.modified !== data.modified ||
    next.date !== data.date;

  if (changed) {
    const updated = matter.stringify(content, next);
    writeFileSync(rel, updated, 'utf-8');
    return true;
  }
  return false;
}

async function main() {
  const cli = process.argv.slice(2);
  const files = cli.length ? cli : FastGlob.sync('content/**/*.md');
  let count = 0;
  for (const rel of files) {
    if (shouldIgnore(rel)) continue;

    const updated = await processFile(rel);
    if (updated) {
      count += 1;
      console.log(`Reconstructed frontmatter: ${rel}`);
    }
  }
  console.log(`Done. Reconstructed ${count} file(s).`);
}

main();
