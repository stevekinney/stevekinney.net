import FastGlob from 'fast-glob';
import matter from 'gray-matter';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function getPostMetadata(file) {
  const content = readFileSync(file);
  const { data } = matter(content);
  const date = toDate(data.date);
  const modified = toDate(data.modified);
  return {
    title: String(data.title || ''),
    description: data.description ? String(data.description) : undefined,
    date: date || new Date(0),
    modified: modified || undefined,
    published: Boolean(data.published),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    slug: path.basename(file, '.md'),
  };
}

function getCourseMetadata(file) {
  const content = readFileSync(file);
  const { data } = matter(content);
  const date = toDate(data.date);
  const modified = toDate(data.modified);
  return {
    title: String(data.title || ''),
    description: data.description ? String(data.description) : undefined,
    date: date || new Date(0),
    modified: modified || undefined,
    slug: path.basename(path.dirname(file)),
  };
}

function sortDescending(a, b) {
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
