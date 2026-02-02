import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';

import type { CourseIndexEntry } from '../src/lib/server/content';
import type { PostWithSlug } from '../src/lib/posts';

type ContentIndex = {
  meta: {
    generatedAt: string;
    hash: string;
  };
  posts: PostWithSlug[];
  courses: CourseIndexEntry[];
};

const OUTPUT_PATH = path.resolve('src/lib/server/content-index.json');
const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const getFileSignature = async (file: string): Promise<string> => {
  const fileStat = await stat(file);
  return `${file}:${fileStat.size}:${fileStat.mtimeMs}`;
};

const readExistingIndex = async (): Promise<ContentIndex | null> => {
  try {
    const contents = await readFile(OUTPUT_PATH, 'utf8');
    return JSON.parse(contents) as ContentIndex;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

const writeIndex = async (index: ContentIndex): Promise<void> => {
  await writeFile(OUTPUT_PATH, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
};

const buildPosts = async (files: string[]): Promise<PostWithSlug[]> => {
  const posts = await Promise.all(
    files.map(async (file) => {
      const contents = await readFile(file, 'utf8');
      const { data } = matter(contents);
      const date = toDate(data.date) ?? new Date(0);
      const modified = toDate(data.modified) ?? date;
      const slug = path.basename(file, '.md');

      return {
        title: String(data.title ?? ''),
        description: data.description ? String(data.description) : '',
        date: date.toISOString(),
        modified: modified.toISOString(),
        published: Boolean(data.published),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        slug,
      };
    }),
  );

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const buildCourses = async (files: string[]): Promise<CourseIndexEntry[]> => {
  const courses = await Promise.all(
    files.map(async (file) => {
      const contents = await readFile(file, 'utf8');
      const { data } = matter(contents);
      const date = toDate(data.date) ?? new Date(0);
      const modified = toDate(data.modified);
      const slug = path.basename(path.dirname(file));

      return {
        title: String(data.title ?? ''),
        description: data.description ? String(data.description) : '',
        date: date.toISOString(),
        ...(modified ? { modified: modified.toISOString() } : {}),
        slug,
      };
    }),
  );

  return courses;
};

const main = async () => {
  const writingFiles = await fg('content/writing/*.md');
  const courseFiles = await fg('content/courses/**/README.md');
  const allFiles = [...writingFiles, ...courseFiles].sort();

  const signatures = await Promise.all(allFiles.map((file) => getFileSignature(file)));
  const hash = createHash('sha256').update(signatures.sort().join('|')).digest('hex');

  const existing = await readExistingIndex();
  if (existing?.meta?.hash === hash) {
    console.log('Content index is already up to date.');
    return;
  }

  const [posts, courses] = await Promise.all([
    buildPosts(writingFiles),
    buildCourses(courseFiles.sort()),
  ]);

  const index: ContentIndex = {
    meta: {
      generatedAt: new Date().toISOString(),
      hash,
    },
    posts,
    courses,
  };

  await writeIndex(index);
  console.log(`Wrote content index to ${path.relative(process.cwd(), OUTPUT_PATH)}.`);
};

await main();
