import FastGlob from 'fast-glob';
import matter from 'gray-matter';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface FrontmatterData {
  title?: string;
  description?: string;
  date?: string | Date;
  modified?: string | Date;
  published?: boolean;
  tags?: unknown;
  [key: string]: unknown;
}

interface PostMetadata {
  title: string;
  description?: string;
  date: Date;
  modified?: Date;
  published: boolean;
  tags: string[];
  slug: string;
}

interface CourseMetadata {
  title: string;
  description?: string;
  date: Date;
  modified?: Date;
  slug: string;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
}

function getPostMetadata(file: string): PostMetadata {
  const content = readFileSync(file);
  const { data } = matter(content);
  const frontmatter = data as FrontmatterData;
  const date = toDate(frontmatter.date);
  const modified = toDate(frontmatter.modified);
  return {
    title: String(frontmatter.title || ''),
    description: frontmatter.description ? String(frontmatter.description) : undefined,
    date: date || new Date(0),
    modified: modified || undefined,
    published: Boolean(frontmatter.published),
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
    slug: path.basename(file, '.md'),
  };
}

function getCourseMetadata(file: string): CourseMetadata {
  const content = readFileSync(file);
  const { data } = matter(content);
  const frontmatter = data as FrontmatterData;
  const date = toDate(frontmatter.date);
  const modified = toDate(frontmatter.modified);
  return {
    title: String(frontmatter.title || ''),
    description: frontmatter.description ? String(frontmatter.description) : undefined,
    date: date || new Date(0),
    modified: modified || undefined,
    slug: path.basename(path.dirname(file)),
  };
}

function sortDescending(
  a: PostMetadata | CourseMetadata,
  b: PostMetadata | CourseMetadata,
): number {
  return Number(b.date) - Number(a.date);
}

const posts = FastGlob.sync('./content/writing/**/*.md').map(getPostMetadata).sort(sortDescending);

const courses = FastGlob.sync('./content/courses/**/README.md').map(getCourseMetadata);

writeFileSync(
  './content/writing/posts.json',
  JSON.stringify(
    posts,
    (key, value) => {
      if (value instanceof Date) return value.toISOString();
      return value;
    },
    2,
  ),
);

writeFileSync(
  './content/courses/courses.json',
  JSON.stringify(
    courses,
    (key, value) => {
      if (value instanceof Date) return value.toISOString();
      return value;
    },
    2,
  ),
);

console.log('Generated content lists: writing/posts.json and courses/courses.json');
