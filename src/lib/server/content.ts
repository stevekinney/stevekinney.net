import type { PostWithSlug } from '$lib/posts';

type FrontmatterData = {
  title?: string;
  description?: string;
  date?: string | Date;
  modified?: string | Date;
  published?: boolean;
  tags?: unknown;
};

export type CourseIndexEntry = {
  title: string;
  description: string;
  date: string;
  modified?: string;
  slug: string;
};

type MdsvexModule = {
  metadata?: FrontmatterData;
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const postModules = import.meta.glob<MdsvexModule>('/content/writing/*.md', { eager: true });
const courseModules = import.meta.glob<MdsvexModule>('/content/courses/**/README.md', {
  eager: true,
});

const posts: PostWithSlug[] = Object.entries(postModules)
  .map(([file, module]) => {
    const metadata = module.metadata ?? {};
    const date = toDate(metadata.date) ?? new Date(0);
    const modified = toDate(metadata.modified) ?? date;
    const slug = file.split('/').pop()?.replace(/\.md$/, '') ?? file;

    return {
      title: String(metadata.title ?? ''),
      description: metadata.description ? String(metadata.description) : '',
      date: date.toISOString(),
      modified: modified.toISOString(),
      published: Boolean(metadata.published),
      tags: Array.isArray(metadata.tags) ? metadata.tags.map(String) : [],
      slug,
    };
  })
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const courses: CourseIndexEntry[] = Object.entries(courseModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([file, module]) => {
    const metadata = module.metadata ?? {};
    const date = toDate(metadata.date) ?? new Date(0);
    const modified = toDate(metadata.modified);
    const slug =
      file
        .replace(/\/README\.md$/, '')
        .split('/')
        .pop() ?? file;

    return {
      title: String(metadata.title ?? ''),
      description: metadata.description ? String(metadata.description) : '',
      date: date.toISOString(),
      ...(modified ? { modified: modified.toISOString() } : {}),
      slug,
    };
  });

export const getPostIndex = (): PostWithSlug[] => posts;
export const getCourseIndex = (): CourseIndexEntry[] => courses;
