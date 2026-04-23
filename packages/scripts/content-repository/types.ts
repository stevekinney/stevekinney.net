import type { Root } from 'mdast';

import type {
  CourseContentsData,
  CourseIndexEntry,
  GeneratedContent,
  LessonIndexEntry,
} from '@stevekinney/utilities/content-types';
import { parseFrontmatter } from '@stevekinney/utilities/frontmatter';

export type ContentValidationIssue = {
  file: string;
  message: string;
};

export type MarkdownReferenceNode = {
  url?: string;
};

type ParsedFrontmatter = ReturnType<typeof parseFrontmatter>;

export type MarkdownSource = {
  absolutePath: string;
  sourcePath: string;
  sourceHash: string;
  data: ParsedFrontmatter['data'];
  content: string;
  tree: Root;
  headingAnchors: Set<string>;
  tailwindPlaygrounds: string[];
};

export type CourseContentsSource = {
  sourcePath: string;
  sourceHash: string;
  contents?: CourseContentsData;
};

export type LessonRecord = LessonIndexEntry & {
  source: MarkdownSource;
};

export type CourseRecord = CourseIndexEntry & {
  source: MarkdownSource;
  contentsSource?: CourseContentsSource;
  lessons: LessonRecord[];
};

export type ContentRepository = GeneratedContent & {
  validationIssues: ContentValidationIssue[];
  tailwindPlaygroundSource: string;
  sourceFiles: string[];
};
