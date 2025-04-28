import { z } from 'zod';

export type CourseMarkdown = z.infer<typeof CourseMarkdownSchema>;
export type CourseMetadata = z.infer<typeof CourseMetadataSchema>;

export const CourseMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  modified: z.string().optional(),
  published: z.boolean().default(true),
  tags: z.array(z.string()).optional().default([]),
});

export const CourseMarkdownSchema = z.object({
  metadata: CourseMetadataSchema,
  default: z.any(),
});
