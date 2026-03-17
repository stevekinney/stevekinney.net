import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

import type { PostManifestEntry, WritingManifest } from '@stevekinney/content-types';
import { normalizePath, parseFrontmatter, toDate } from './frontmatter';
import { writeFormattedJson } from './write-formatted-json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.resolve(process.cwd(), 'manifest.json');

const getFileSignature = async (file: string): Promise<string> => {
  const contents = await readFile(file);
  const contentHash = createHash('sha256').update(contents).digest('hex');
  return `${file}:${contentHash}`;
};

const readExistingManifest = async (): Promise<WritingManifest | null> => {
  try {
    const contents = await readFile(OUTPUT_PATH, 'utf8');
    return JSON.parse(contents) as WritingManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

const buildPosts = async (files: string[]): Promise<PostManifestEntry[]> => {
  const entries = await Promise.all(
    files.map(async (file) => {
      const absoluteFile = path.resolve(process.cwd(), file);
      const contents = await readFile(absoluteFile, 'utf8');
      const { data } = parseFrontmatter(contents);
      const date = toDate(data.date) ?? new Date(0);
      const modified = toDate(data.modified) ?? date;

      return {
        title: String(data.title ?? ''),
        description: data.description ? String(data.description) : '',
        date: date.toISOString(),
        modified: modified.toISOString(),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        slug: path.basename(file, '.md'),
        file: normalizePath(path.relative(REPO_ROOT, absoluteFile)),
      };
    }),
  );

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const main = async () => {
  const markdownFiles = await fg('*.md', {
    cwd: process.cwd(),
    onlyFiles: true,
  });

  const absoluteFiles = markdownFiles.map((file) => path.resolve(process.cwd(), file)).sort();
  const signatures = await Promise.all(absoluteFiles.map((file) => getFileSignature(file)));
  const hash = createHash('sha256').update(signatures.join('|')).digest('hex');

  const existing = await readExistingManifest();
  if (existing?.meta?.hash === hash) {
    console.log('Writing manifest is already up to date.');
    return;
  }

  const manifest: WritingManifest = {
    meta: {
      generatedAt: new Date().toISOString(),
      hash,
    },
    posts: await buildPosts(markdownFiles),
  };

  await writeFormattedJson(OUTPUT_PATH, manifest);
  console.log(
    `Wrote writing manifest to ${normalizePath(path.relative(process.cwd(), OUTPUT_PATH))}.`,
  );
};

await main();
