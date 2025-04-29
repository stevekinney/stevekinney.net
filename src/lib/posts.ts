import { dev } from '$app/environment';
import { z } from 'zod';

const PostMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.string().datetime(),
  modified: z.string().datetime(),
  tags: z.array(z.string()).optional(),
  published: z.boolean(),
});

const PostSchema = z.object({
  content: z.any(),
  metadata: PostMetadataSchema,
});

const PostWithSlugSchema = PostMetadataSchema.extend({
  slug: z.string(),
});

const IndividualPostSchema = z.object({
  content: z.any(),
  meta: PostMetadataSchema,
  slug: z.string(),
});

export const getPosts = async () => {
  const paths = import.meta.glob('/content/writing/*.md');

  const posts = await Promise.all(
    Object.entries(paths).map(async ([path, importFile]) => {
      const file = await importFile();
      const slug = path.split('/').at(-1)?.replace('.md', '');
      const { metadata } = PostSchema.parse(file);

      if (dev || metadata.published) {
        return PostWithSlugSchema.parse({ ...metadata, slug });
      }
    }),
  );

  return posts
    .filter((post) => post !== undefined)
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime());
};

export const getPost = async (slug: string) => {
  const { default: content, metadata: meta } = await import(`../../content/writing/${slug}.md`);

  return IndividualPostSchema.parse({
    content,
    meta,
    slug,
  });
};
