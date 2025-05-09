import { z } from 'zod';

export type CourseMarkdown = z.infer<typeof CourseMarkdownSchema>;
export type CourseMetadata = z.infer<typeof CourseMetadataSchema>;

export const CourseMetadataSchema = z.object(
  {
    title: z.string({
      required_error: 'Title is required',
      invalid_type_error: 'Title must be a string',
    }),
    description: z.string({
      required_error: 'Description is required',
      invalid_type_error: 'Description must be a string',
    }),
    modified: z.string().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
  },
  {
    invalid_type_error: 'Metadata must be an object',
    required_error: 'Metadata is required',
  },
);

export const CourseMarkdownSchema = z.object({
  metadata: CourseMetadataSchema,
  default: z.any({
    required_error: 'Markdown content is required',
  }),
});
