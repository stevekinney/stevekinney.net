import { readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

type FrontmatterError = {
  file: string;
  message: string;
};

const files = process.argv.slice(2);

if (files.length === 0) {
  console.log('No course files provided; skipping frontmatter audit.');
  process.exit(0);
}

const shouldSkipFile = (filePath: string, data: Record<string, unknown>): boolean => {
  if (path.basename(filePath) === '_index.md') return true;
  if (data.layout === 'contents') return true;
  return false;
};

const errors: FrontmatterError[] = [];

for (const file of files) {
  let contents = '';

  try {
    contents = await readFile(file, 'utf8');
  } catch (error) {
    errors.push({
      file,
      message: `Could not read file (${error instanceof Error ? error.message : 'unknown error'}).`,
    });
    continue;
  }

  if (!contents.startsWith('---')) {
    errors.push({ file, message: 'Missing frontmatter delimiter (expected starting ---).' });
    continue;
  }

  const { data } = matter(contents);

  if (shouldSkipFile(file, data)) {
    continue;
  }

  const title = data.title;
  const description = data.description;

  if (typeof title !== 'string' || title.trim() === '') {
    errors.push({ file, message: 'Missing required title in frontmatter.' });
  }

  if (typeof description !== 'string' || description.trim() === '') {
    errors.push({ file, message: 'Missing required description in frontmatter.' });
  }
}

if (errors.length > 0) {
  console.error('Course frontmatter audit failed:');
  for (const error of errors) {
    console.error(`- ${error.file}: ${error.message}`);
  }
  process.exit(1);
}

console.log('Course frontmatter audit passed.');
