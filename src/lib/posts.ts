import { z } from 'zod';

// Schema definitions
const PostMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.string().datetime(),
  modified: z.string().datetime(),
  tags: z.array(z.string()).optional(),
  published: z.boolean(),
});

const IndividualPostSchema = z.object({
  content: z.any(),
  meta: PostMetadataSchema,
  slug: z.string(),
});

// Type exports
export type PostMetadata = z.infer<typeof PostMetadataSchema>;
export type IndividualPost = z.infer<typeof IndividualPostSchema>;
export type PostWithSlug = {
  title: string;
  date: string;
  slug: string;
  description: string;
  modified: string;
  published: boolean;
  tags: string[];
};

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
