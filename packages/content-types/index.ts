export type ManifestMeta = {
  generatedAt: string;
  hash: string;
};

export type PostManifestEntry = {
  title: string;
  description: string;
  date: string;
  modified: string;
  published: boolean;
  tags: string[];
  slug: string;
  file: string;
};

export type WritingManifest = {
  meta: ManifestMeta;
  posts: PostManifestEntry[];
};

export type CourseManifestEntry = {
  slug: string;
  title: string;
  description: string;
  date: string;
  modified?: string;
  published?: boolean;
  tags?: string[];
  file: string;
};

export type CourseManifest = {
  meta: ManifestMeta;
  course: {
    slug: string;
    title: string;
    description: string;
    date: string;
    modified?: string;
    published?: boolean;
    tags?: string[];
    contentsFile?: string;
  };
  lessons: CourseManifestEntry[];
};

export type SiteContentIndex = {
  meta: ManifestMeta;
  posts: Array<{
    title: string;
    description: string;
    date: string;
    modified: string;
    published: boolean;
    tags: string[];
    slug: string;
  }>;
  courses: Array<{
    title: string;
    description: string;
    date: string;
    modified?: string;
    slug: string;
  }>;
};
