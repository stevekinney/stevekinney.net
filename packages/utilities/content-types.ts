export type CourseContentsRelatedLink = {
  title: string;
  href: string;
};

export type CourseContentsItem = {
  title: string;
  href: string;
  related?: CourseContentsRelatedLink[];
};

export type CourseContentsSection = {
  title?: string;
  item: CourseContentsItem[];
};

export type CourseContentsData = {
  section: CourseContentsSection[];
};

export type ContentType = 'writing' | 'course' | 'lesson';

export type WritingIndexEntry = {
  title: string;
  description: string;
  date: string;
  modified: string;
  tags: string[];
  slug: string;
  sourcePath: string;
  sourceHash: string;
  path: string;
};

export type CourseIndexEntry = {
  title: string;
  description: string;
  date: string;
  modified: string;
  slug: string;
  sourcePath: string;
  sourceHash: string;
  path: string;
  contents?: CourseContentsData;
};

export type LessonIndexEntry = {
  title: string;
  description: string;
  date: string;
  modified: string;
  slug: string;
  courseSlug: string;
  courseTitle: string;
  tags: string[];
  sourcePath: string;
  sourceHash: string;
  path: string;
};

export type SiteContentIndex = {
  posts: WritingIndexEntry[];
  courses: CourseIndexEntry[];
};

export type ContentRouteBase = {
  path: string;
  title: string;
  description: string;
  date: string;
  modified: string;
  sourcePath: string;
  sourceHash: string;
  llmsPath: string;
  openGraphPath: string;
  contentType: ContentType;
};

export type WritingContentRoute = ContentRouteBase & {
  contentType: 'writing';
  slug: string;
  tags: string[];
};

export type CourseContentRoute = ContentRouteBase & {
  contentType: 'course';
  courseSlug: string;
  contents?: CourseContentsData;
};

export type LessonContentRoute = ContentRouteBase & {
  contentType: 'lesson';
  courseSlug: string;
  courseTitle: string;
  lessonSlug: string;
  tags: string[];
};

export type ContentRoute = WritingContentRoute | CourseContentRoute | LessonContentRoute;

export type GeneratedContentPrerenderEntries = {
  writing: Array<{ slug: string }>;
  courses: Array<{ course: string }>;
  lessons: Array<{ course: string; lesson: string }>;
};

export type GeneratedContentMeta = {
  hash: string;
  sourceFileCount: number;
  routeCount: number;
  playgroundCount: number;
};

export type GeneratedContent = {
  meta: GeneratedContentMeta;
  siteIndex: SiteContentIndex;
  routes: Record<string, ContentRoute>;
  writing: WritingIndexEntry[];
  courses: CourseIndexEntry[];
  lessons: LessonIndexEntry[];
  prerenderEntries: GeneratedContentPrerenderEntries;
};
