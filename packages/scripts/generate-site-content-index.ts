import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

import type { CourseManifest, SiteContentIndex, WritingManifest } from '@stevekinney/content-types';
import { writeFormattedJson } from './write-formatted-json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WRITING_MANIFEST_PATH = path.resolve(REPO_ROOT, 'content/writing/manifest.json');
const OUTPUT_PATH = path.resolve(
  REPO_ROOT,
  'applications/website/src/lib/server/content-index.json',
);

const normalizePath = (value: string): string => value.split(path.sep).join('/');

const getFileSignature = async (file: string): Promise<string> => {
  const fileStat = await stat(file);
  return `${file}:${fileStat.size}:${fileStat.mtimeMs}`;
};

const readJson = async <T>(filePath: string): Promise<T> => {
  const contents = await readFile(filePath, 'utf8');
  return JSON.parse(contents) as T;
};

const readExistingIndex = async (): Promise<SiteContentIndex | null> => {
  try {
    return await readJson<SiteContentIndex>(OUTPUT_PATH);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

const main = async () => {
  const courseManifestPaths = await fg('courses/*/manifest.json', {
    cwd: REPO_ROOT,
    absolute: true,
    onlyFiles: true,
  });

  const manifestPaths = [WRITING_MANIFEST_PATH, ...courseManifestPaths].sort();

  if (manifestPaths.length === 0) {
    throw new Error('No manifests found. Run `bun run manifest` from the repository root first.');
  }

  const signatures = await Promise.all(manifestPaths.map((file) => getFileSignature(file)));
  const hash = createHash('sha256').update(signatures.join('|')).digest('hex');

  const existing = await readExistingIndex();
  if (existing?.meta?.hash === hash) {
    console.log('Site content index is already up to date.');
    return;
  }

  const writingManifest = await readJson<WritingManifest>(WRITING_MANIFEST_PATH);
  const courseManifests = await Promise.all(
    courseManifestPaths.sort().map((manifestPath) => readJson<CourseManifest>(manifestPath)),
  );

  const index: SiteContentIndex = {
    meta: {
      generatedAt: new Date().toISOString(),
      hash,
    },
    posts: writingManifest.posts
      .map(({ file: _file, ...post }) => post)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    courses: courseManifests
      .map((manifest) => ({
        title: manifest.course.title,
        description: manifest.course.description,
        date: manifest.course.date,
        modified: manifest.course.modified,
        slug: manifest.course.slug,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  };

  await writeFormattedJson(OUTPUT_PATH, index);
  console.log(`Wrote content index to ${normalizePath(path.relative(REPO_ROOT, OUTPUT_PATH))}.`);
};

await main();
