import { readFile } from 'fs/promises';
import path from 'path';

import glob from 'fast-glob';
import matter from 'gray-matter';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

const schema = await readFile(path.resolve('content/schema.json'), 'utf8').then(JSON.parse);
const validate = ajv.compile(schema);

const patterns = [
  'content/**/*.md',
  '!content/**/meta-*.md',
  '!content/**/README.md',
  '!content/**/_index.md',
];

for (const filePath of glob.sync(patterns)) {
  const content = await readFile(filePath, 'utf8');
  const { data } = matter(content);

  if (data.modified instanceof Date) {
    data.modified = data.modified.toISOString();
  }

  if (data.date instanceof Date) {
    data.date = data.date.toISOString();
  }

  if (!validate(data)) {
    console.error('Validation errors:', filePath, validate.errors);
  }
}
