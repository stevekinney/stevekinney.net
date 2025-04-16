import { z } from 'zod';

export type CourseMetadata = z.infer<typeof CourseMetadataSchema>;
export type LessonMetadata = z.infer<typeof LessonMetadataSchema>;

export const CourseMetadataSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  modified: z.string().optional(),
  published: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

export const LessonMetadataSchema = CourseMetadataSchema.omit({
  slug: true,
});
