import FastGlob from 'fast-glob';
import matter from 'gray-matter';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

type PostWithSlug = z.infer<typeof PostWithSlugSchema>;

const PostWithSlugSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.date(),
  modified: z.date().optional(),
  published: z.boolean(),
  tags: z.array(z.string()).optional().default([]),
  slug: z.string(),
});

function getPostMetadata(file: string): PostWithSlug {
  const content = readFileSync(file);
  const { data } = matter(content);
  return PostWithSlugSchema.parse({
    ...data,
    slug: path.basename(file, '.md'),
  });
}

function sortDescending(first: PostWithSlug, second: PostWithSlug) {
  return Number(second.date) - Number(first.date);
}

const posts = FastGlob.sync('./content/writing/**/*.md').map(getPostMetadata).sort(sortDescending);

writeFileSync('./content/writing/posts.json', JSON.stringify(posts, null, 2));
