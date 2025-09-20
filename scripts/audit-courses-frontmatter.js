import FastGlob from 'fast-glob';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import matter from 'gray-matter';

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

function titleCase(str) {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripMarkdown(s) {
  if (!s) return s;
  // Remove code fences and inline code
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`([^`]+)`/g, '$1');
  // Replace links and images with their text
  s = s.replace(/!\[[^\]]*]\([^)]*\)/g, ' ');
  s = s.replace(/\[([^\]]+)]\([^)]*\)/g, '$1');
  // Remove headings and blockquote markers
  s = s.replace(/^\s{0,3}#{1,6}\s*/gm, '');
  s = s.replace(/^>\s?/gm, '');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function deriveTitle(data, content, filePath) {
  if (data?.title && String(data.title).trim().length > 0) return data.title;
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*#\s+(.+)/);
    if (m) return stripMarkdown(m[1]).trim();
  }
  // Fallback to file name
  const base = path.basename(filePath, '.md');
  return titleCase(base);
}

function deriveDescription(data, content) {
  if (data?.description && String(data.description).trim().length > 0) return data.description;
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
      if (para.length > 0) break; // end first paragraph
      continue;
    }
    if (/^\s*#/.test(line)) continue; // skip headings
    if (/^\s*>/.test(line)) continue; // skip blockquotes
    para.push(line.trim());
  }
  let desc = stripMarkdown(para.join(' '));
  if (!desc || desc.length === 0) return undefined;
  // Keep concise description
  if (desc.length > 240) desc = desc.slice(0, 237).trimEnd() + '...';
  return desc;
}

const cliFiles = process.argv.slice(2);
const files =
  cliFiles.length > 0 ? cliFiles : FastGlob.sync('content/courses/**/*.md', { dot: false });

let updated = 0;
let missing = 0;

for (const rel of files) {
  if (shouldIgnore(rel)) continue;

  const raw = readFileSync(rel, 'utf-8');
  let parsed;
  try {
    parsed = matter(raw);
  } catch {
    // If frontmatter is broken, skip; user can fix manually
    console.warn(`Skipped (invalid frontmatter): ${rel}`);
    continue;
  }

  const data = parsed.data || {};
  const title = deriveTitle(data, parsed.content, rel);
  const description = deriveDescription(data, parsed.content);

  const nextData = { ...data };
  if (!data.title || String(data.title).trim().length === 0) nextData.title = title;
  if (!data.description || String(data.description).trim().length === 0) {
    if (description) nextData.description = description;
  }

  const changed = nextData.title !== data.title || nextData.description !== data.description;
  if (changed) {
    const updatedContent = matter.stringify(parsed.content, nextData);
    writeFileSync(rel, updatedContent, 'utf-8');
    updated += 1;
    console.log(
      `Updated: ${rel}${!data.title ? ' (title)' : ''}${!data.description ? ' (description)' : ''}`,
    );
  } else if (!data.title || !data.description) {
    missing += 1;
  }
}

console.log(`Done. Updated ${updated} file(s).`);
if (missing > 0) {
  console.log(`Warning: ${missing} file(s) still missing fields (unable to derive).`);
}
