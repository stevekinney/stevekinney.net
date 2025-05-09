import { dev } from '$app/environment';
import { z } from 'zod';

// Type declarations
export type PostMetadata = z.infer<typeof PostMetadataSchema>;
export type Post = z.infer<typeof PostSchema>;
export type PostWithSlug = z.infer<typeof PostWithSlugSchema>;
export type IndividualPost = z.infer<typeof IndividualPostSchema>;

// Schema definitions
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

/**
 * Fetches all blog posts and sorts them by date (newest first)
 * In development mode, shows all posts; in production, only published posts
 */
export const getPosts = async (): Promise<PostWithSlug[]> => {
  const paths = import.meta.glob('/content/writing/*.md');

  const postsPromises = Object.entries(paths).map(async ([path, importFile]) => {
    try {
      const file = await importFile();
      const slug = path.split('/').at(-1)?.replace('.md', '');
      
      if (!slug) {
        console.error(`Could not extract slug from path: ${path}`);
        return undefined;
      }
      
      const { metadata } = PostSchema.parse(file);

      if (dev || metadata.published) {
        return PostWithSlugSchema.parse({ ...metadata, slug });
      }
      
      return undefined;
    } catch (error) {
      console.error(`Error processing post at ${path}:`, error);
      return undefined;
    }
  });
  
  const posts = await Promise.all(postsPromises);

  return posts
    .filter((post): post is PostWithSlug => post !== undefined)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

/**
 * Fetches a single blog post by slug
 */
export const getPost = async (slug: string): Promise<IndividualPost> => {
  try {
    const { default: content, metadata: meta } = await import(`../../content/writing/${slug}.md`);
    
    return IndividualPostSchema.parse({
      content,
      meta,
      slug,
    });
  } catch (error) {
    console.error(`Error loading post with slug ${slug}:`, error);
    throw new Error(`Failed to load post: ${slug}`);
  }
};