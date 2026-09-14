import type { Root } from 'mdast';
import type { PublicationIndex, NormalizedMarkdown } from '@stevekinney/markdown/obsidian-types';

import type {
  CourseContentsData,
  CourseIndexEntry,
  GeneratedContent,
  LessonIndexEntry,
  ProjectIndexEntry,
} from '@stevekinney/utilities/content-types';
import { parseFrontmatter } from '@stevekinney/utilities/frontmatter';

export type ContentValidationIssue = {
  file: string;
  message: string;
  line?: number;
  /** Defaults to `'error'` when absent. Warnings are surfaced but do not break the build. */
  severity?: 'error' | 'warning';
  field?: string;
  fixable?: boolean;
};

export type MarkdownReferenceNode = {
  url?: string;
};

type ParsedFrontmatter = ReturnType<typeof parseFrontmatter>;

export type MarkdownSource = {
  rawSource: string;
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

export type ProjectRecord = ProjectIndexEntry & {
  source: MarkdownSource;
};

export type ContentRepository = GeneratedContent & {
  publicationIndex: PublicationIndex;
  normalizedDocuments: Record<string, NormalizedMarkdown>;
  validationIssues: ContentValidationIssue[];
  tailwindPlaygroundSource: string;
  sourceFiles: string[];
};
