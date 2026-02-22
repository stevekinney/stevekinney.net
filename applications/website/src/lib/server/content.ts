import type { SiteContentIndex } from '@stevekinney/content-types';
import type { PostWithSlug } from '$lib/posts';
import contentIndex from './content-index.json';

export type CourseIndexEntry = {
  title: string;
  description: string;
  date: string;
  modified?: string;
  slug: string;
};

const { posts, courses } = contentIndex as SiteContentIndex;

export const getPostIndex = (): PostWithSlug[] => posts;
export const getCourseIndex = (): CourseIndexEntry[] => courses;
