import { z } from 'zod';

export type CourseMarkdown = z.infer<typeof CourseMarkdownSchema>;
export type CourseMetadata = z.infer<typeof CourseMetadataSchema>;

export const CourseMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  modified: z.string().optional(),
  published: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([]),
});

export const CourseMarkdownSchema = z.object({
  metadata: CourseMetadataSchema,
  default: z.any().refine((value) => value !== undefined, {
    message: 'Markdown content is required',
  }),
});
