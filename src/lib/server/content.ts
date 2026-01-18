import type { PostWithSlug } from '$lib/posts';
import contentIndex from './content-index.json';

export type CourseIndexEntry = {
  title: string;
  description: string;
  date: string;
  modified?: string;
  slug: string;
};

type ContentIndex = {
  posts: PostWithSlug[];
  courses: CourseIndexEntry[];
};

const { posts, courses } = contentIndex as ContentIndex;

export const getPostIndex = (): PostWithSlug[] => posts;
export const getCourseIndex = (): CourseIndexEntry[] => courses;
