import { dev } from '$app/environment';
import { z } from 'zod';

export type Post = z.infer<typeof PostSchema>;

const PostMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.string().datetime(),
  modified: z.string().datetime(),
  tags: z.array(z.string()).optional(),
  published: z.boolean(),
});

const PostSchema = PostMetadataSchema.extend({
  slug: z.string(),
});

const IndividualPostSchema = z.object({
  content: z.any(),
  meta: PostMetadataSchema,
  slug: z.string(),
});

export const getPosts = async () => {
  let posts: Post[] = [];

  const paths = import.meta.glob('/content/writing/*.md');

  for (const path in paths) {
    const file = await paths[path]();
    const slug = path.split('/').at(-1)?.replace('.md', '');

    if (file && typeof file === 'object' && 'metadata' in file && slug) {
      const metadata = file.metadata as Omit<Post, 'slug'>;
      const post = PostSchema.parse({ ...metadata, slug });
      if (dev || post.published) {
        posts.push(post);
      }
    }
  }

  posts = posts.sort(
    (first, second) => new Date(second.date).getTime() - new Date(first.date).getTime(),
  );

  return posts;
};

export const getPost = async (slug: string) => {
  const { default: content, metadata: meta } = await import(`../../content/writing/${slug}.md`);

  return IndividualPostSchema.parse({
    content,
    meta,
    slug,
  });
};
