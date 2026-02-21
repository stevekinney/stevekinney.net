import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import matter from 'gray-matter';

import type { CourseManifest, CourseManifestEntry } from '@stevekinney/content-types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.resolve(process.cwd(), 'manifest.json');
const README_FILE = 'README.md';
const CONTENTS_FILE = '_index.md';
const MANIFEST_HASH_VERSION = 'course-manifest:v2';

const normalizePath = (value: string): string => value.split(path.sep).join('/');

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const getFileSignature = async (file: string): Promise<string> => {
  const fileStat = await stat(file);
  return `${file}:${fileStat.size}:${fileStat.mtimeMs}`;
};

const readExistingManifest = async (): Promise<CourseManifest | null> => {
  try {
    const contents = await readFile(OUTPUT_PATH, 'utf8');
    return JSON.parse(contents) as CourseManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

const asOptionalStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const tags = value
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
};

const buildLessonEntry = async (file: string): Promise<CourseManifestEntry> => {
  const absoluteFile = path.resolve(process.cwd(), file);
  const contents = await readFile(absoluteFile, 'utf8');
  const { data } = matter(contents);
  const date = toDate(data.date) ?? new Date(0);
  const modified = toDate(data.modified);

  const entry: CourseManifestEntry = {
    slug: path.basename(file, '.md'),
    title: String(data.title ?? ''),
    description: data.description ? String(data.description) : '',
    date: date.toISOString(),
    file: normalizePath(path.relative(REPO_ROOT, absoluteFile)),
  };

  if (modified) entry.modified = modified.toISOString();
  if (typeof data.published === 'boolean') entry.published = data.published;

  const tags = asOptionalStringArray(data.tags);
  if (tags) entry.tags = tags;

  return entry;
};

const main = async () => {
  const courseSlug = path.basename(process.cwd());
  const markdownFiles = await fg('*.md', {
    cwd: process.cwd(),
    onlyFiles: true,
  });

  if (!markdownFiles.includes(README_FILE)) {
    throw new Error(`Course package '${courseSlug}' is missing ${README_FILE}.`);
  }

  const absoluteFiles = markdownFiles.map((file) => path.resolve(process.cwd(), file)).sort();
  const signatures = await Promise.all(absoluteFiles.map((file) => getFileSignature(file)));
  const hash = createHash('sha256')
    .update([MANIFEST_HASH_VERSION, ...signatures].join('|'))
    .digest('hex');

  const existing = await readExistingManifest();
  if (existing?.meta?.hash === hash) {
    console.log(`Course manifest is already up to date for ${courseSlug}.`);
    return;
  }

  const readmePath = path.resolve(process.cwd(), README_FILE);
  const readmeContents = await readFile(readmePath, 'utf8');
  const { data: readmeData } = matter(readmeContents);

  const date = toDate(readmeData.date) ?? new Date(0);
  const modified = toDate(readmeData.modified);

  const course: CourseManifest['course'] = {
    slug: courseSlug,
    title: String(readmeData.title ?? ''),
    description: readmeData.description ? String(readmeData.description) : '',
    date: date.toISOString(),
  };

  if (modified) course.modified = modified.toISOString();
  if (typeof readmeData.published === 'boolean') course.published = readmeData.published;

  const tags = asOptionalStringArray(readmeData.tags);
  if (tags) course.tags = tags;

  const lessonFiles = markdownFiles
    .filter((file) => file !== README_FILE && file !== CONTENTS_FILE)
    .sort((a, b) => a.localeCompare(b));

  const lessons = await Promise.all(lessonFiles.map((file) => buildLessonEntry(file)));

  const manifest: CourseManifest = {
    meta: {
      generatedAt: new Date().toISOString(),
      hash,
    },
    course,
    lessons,
  };

  const contentsPath = path.resolve(process.cwd(), CONTENTS_FILE);
  if (markdownFiles.includes(CONTENTS_FILE)) {
    manifest.course.contentsFile = normalizePath(path.relative(REPO_ROOT, contentsPath));
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote course manifest to ${normalizePath(path.relative(process.cwd(), OUTPUT_PATH))}.`,
  );
};

await main();
