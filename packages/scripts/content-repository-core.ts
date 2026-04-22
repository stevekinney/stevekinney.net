import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import type { Root } from 'mdast';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

import {
  buildTailwindPlaygroundSource,
  sanitizeTailwindPlaygroundHtml,
} from '@stevekinney/utilities/tailwind-playground';
import { normalizeRoutePath } from '@stevekinney/utilities/routes';
import {
  type CourseContentsData,
  type CourseIndexEntry,
  type ContentRoute,
  type GeneratedContent,
  type LessonIndexEntry,
  type SiteContentIndex,
  type WritingIndexEntry,
} from '@stevekinney/utilities/content-types';
import { normalizePath, parseFrontmatter, toDateString } from '@stevekinney/utilities/frontmatter';

import {
  coursesRoot,
  repositoryRoot,
  resolveRepositoryPath,
  websiteStaticRoot,
  writingRoot,
} from './content-paths.ts';

type ContentValidationIssue = {
  file: string;
  message: string;
};

type MarkdownReferenceNode = {
  url?: string;
};

type ParsedFrontmatter = ReturnType<typeof parseFrontmatter>;

type MarkdownSource = {
  absolutePath: string;
  sourcePath: string;
  sourceHash: string;
  data: ParsedFrontmatter['data'];
  content: string;
  tree: Root;
  headingAnchors: Set<string>;
  tailwindPlaygrounds: string[];
};

type CourseContentsSource = {
  sourcePath: string;
  sourceHash: string;
  contents?: CourseContentsData;
};

type LessonRecord = LessonIndexEntry & {
  source: MarkdownSource;
};

type CourseRecord = CourseIndexEntry & {
  source: MarkdownSource;
  contentsSource?: CourseContentsSource;
  lessons: LessonRecord[];
};

export type ContentRepository = GeneratedContent & {
  validationIssues: ContentValidationIssue[];
  tailwindPlaygroundSource: string;
  sourceFiles: string[];
};

const markdownParser = unified().use(remarkParse);
const externalPrefixes = ['http://', 'https://', 'mailto:', 'tel:', 'data:', 'ftp:'];
const writingReservedSlugs = new Set(['page', 'rss', 'open-graph.jpg', 'llms.txt']);
const courseReservedSlugs = new Set(['open-graph.jpg', 'llms.txt']);
const lessonReservedSlugs = new Set(['open-graph.jpg', 'llms.txt']);
const staticRoutes = new Set([
  '/',
  '/courses',
  '/courses/open-graph.jpg',
  '/llms-full.txt',
  '/llms.txt',
  '/open-graph.jpg',
  '/sitemap.xml',
  '/writing',
  '/writing/open-graph.jpg',
  '/writing/rss',
]);

const hashContents = (value: string): string => createHash('sha256').update(value).digest('hex');

const isExternalUrl = (value: string): boolean => {
  if (!value) return true;
  if (value.startsWith('#')) return true;
  if (value.startsWith('//')) return true;
  return externalPrefixes.some((prefix) => value.startsWith(prefix));
};

const stripQueryAndHash = (value: string): string => value.split(/[?#]/)[0] ?? '';

const compareByDate = (left: { date: string }, right: { date: string }): number =>
  new Date(right.date).getTime() - new Date(left.date).getTime();

const unique = <T>(values: T[]): T[] => [...new Set(values)];

const relativeSourcePath = (absolutePath: string): string =>
  normalizePath(path.relative(repositoryRoot, absolutePath));

const readText = async (absolutePath: string): Promise<string> => readFile(absolutePath, 'utf8');

const fileExists = async (absolutePath: string): Promise<boolean> => {
  try {
    await stat(absolutePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
};

const collectHeadingAnchors = (tree: Root): Set<string> => {
  const headingAnchors = new Set<string>();
  const slugger = new GithubSlugger();

  visit(tree, 'heading', (node) => {
    const anchor = slugger.slug(toString(node));
    if (anchor) {
      headingAnchors.add(anchor);
    }
  });

  return headingAnchors;
};

const extractTailwindPlaygrounds = (tree: Root): string[] => {
  const playgrounds: string[] = [];

  visit(tree, 'code', (node) => {
    if (node.lang !== 'html') return;
    if (!node.meta || !node.meta.includes('tailwind')) return;

    const sanitized = sanitizeTailwindPlaygroundHtml(node.value ?? '');
    if (sanitized.trim().length > 0) {
      playgrounds.push(sanitized);
    }
  });

  return playgrounds;
};

const loadMarkdownSource = async (absolutePath: string): Promise<MarkdownSource> => {
  const raw = await readText(absolutePath);
  const { data, content } = parseFrontmatter(raw);
  const tree = markdownParser.parse(content);

  return {
    absolutePath,
    sourcePath: relativeSourcePath(absolutePath),
    sourceHash: hashContents(raw),
    data,
    content,
    tree,
    headingAnchors: collectHeadingAnchors(tree),
    tailwindPlaygrounds: extractTailwindPlaygrounds(tree),
  };
};

const safeDateString = (
  file: string,
  value: unknown,
  field: 'date' | 'modified',
  issues: ContentValidationIssue[],
): string => {
  const date = toDateString(value);
  if (!date) {
    issues.push({
      file,
      message: `Missing or invalid '${field}' frontmatter.`,
    });

    return '';
  }

  return date;
};

const requiredString = (
  file: string,
  value: unknown,
  field: 'title' | 'description',
  issues: ContentValidationIssue[],
): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  issues.push({
    file,
    message: `Missing required '${field}' frontmatter.`,
  });

  return '';
};

const validateHeadingAnchor = (
  file: string,
  urlPath: string,
  headingAnchors: Set<string>,
  issues: ContentValidationIssue[],
): void => {
  const anchor = urlPath.slice(1);
  if (!anchor) return;

  if (!headingAnchors.has(anchor)) {
    issues.push({
      file,
      message: `Unknown heading anchor '${urlPath}'.`,
    });
  }
};

const validateRootLink = (
  file: string,
  urlPath: string,
  routePaths: Set<string>,
  courseDirectories: Set<string>,
  issues: ContentValidationIssue[],
): void => {
  const normalized = normalizeRoutePath(urlPath);

  if (staticRoutes.has(normalized)) return;
  if (normalized.startsWith('/_app/')) return;
  if (normalized.startsWith('/open-graph')) return;
  if (normalized.startsWith('/llms')) return;

  if (routePaths.has(normalized)) return;

  if (normalized.startsWith('/writing/')) {
    issues.push({
      file,
      message: `Unknown writing route '${urlPath}'.`,
    });
    return;
  }

  if (normalized.startsWith('/courses/')) {
    const [, courseSlug] = normalized.split('/').filter(Boolean);
    if (!courseSlug) {
      issues.push({
        file,
        message: `Missing course slug for link '${urlPath}'.`,
      });
      return;
    }

    if (!courseDirectories.has(courseSlug)) {
      issues.push({
        file,
        message: `Unknown course '${courseSlug}' for link '${urlPath}'.`,
      });
      return;
    }

    issues.push({
      file,
      message: `Unknown course route '${urlPath}'.`,
    });
    return;
  }

  const staticAssetPath = path.join(websiteStaticRoot, normalized.slice(1));
  if (!existsSync(staticAssetPath)) {
    issues.push({
      file,
      message: `Missing static asset for link '${urlPath}'.`,
    });
  }
};

const validateRelativeLink = async (
  file: string,
  urlPath: string,
  issues: ContentValidationIssue[],
): Promise<void> => {
  const resolvedPath = path.resolve(path.dirname(resolveRepositoryPath(file)), urlPath);

  if (!resolvedPath.startsWith(writingRoot) && !resolvedPath.startsWith(coursesRoot)) {
    issues.push({
      file,
      message: `Relative link escapes content roots: '${urlPath}'.`,
    });
    return;
  }

  if (!(await fileExists(resolvedPath))) {
    issues.push({
      file,
      message: `Missing asset or file for link '${urlPath}'.`,
    });
  }
};

const validateMarkdownLinks = async (
  file: string,
  tree: Root,
  headingAnchors: Set<string>,
  routePaths: Set<string>,
  courseDirectories: Set<string>,
  issues: ContentValidationIssue[],
): Promise<void> => {
  const tasks: Promise<void>[] = [];

  visit(tree, ['link', 'image', 'definition'], (node) => {
    const url = String((node as MarkdownReferenceNode).url ?? '').trim();
    if (!url) return;
    if (url.startsWith('#')) {
      validateHeadingAnchor(file, url, headingAnchors, issues);
      return;
    }
    if (isExternalUrl(url)) return;

    const normalizedUrl = stripQueryAndHash(url);
    if (!normalizedUrl) return;

    if (normalizedUrl.startsWith('/')) {
      validateRootLink(file, normalizedUrl, routePaths, courseDirectories, issues);
      return;
    }

    tasks.push(validateRelativeLink(file, normalizedUrl, issues));
  });

  await Promise.all(tasks);
};

const loadCourseContentsSource = async (
  absolutePath: string,
  issues: ContentValidationIssue[],
): Promise<CourseContentsSource | undefined> => {
  if (!(await fileExists(absolutePath))) {
    return undefined;
  }

  const sourcePath = relativeSourcePath(absolutePath);
  const raw = await readText(absolutePath);

  try {
    return {
      sourcePath,
      sourceHash: hashContents(raw),
      contents: Bun.TOML.parse(raw) as CourseContentsData,
    };
  } catch (error) {
    issues.push({
      file: sourcePath,
      message: `Failed to parse index.toml: ${(error as Error).message}`,
    });

    return {
      sourcePath,
      sourceHash: hashContents(raw),
    };
  }
};

const validateCourseContents = (
  file: string,
  contents: CourseContentsData | undefined,
  lessonSlugs: Set<string>,
  issues: ContentValidationIssue[],
): void => {
  if (!contents) return;

  for (const section of contents.section ?? []) {
    for (const item of section.item ?? []) {
      const href = item.href?.replace(/\.md$/i, '');
      if (href && !isExternalUrl(href) && !lessonSlugs.has(href)) {
        issues.push({
          file,
          message: `index.toml references missing lesson '${item.href}'.`,
        });
      }

      for (const related of item.related ?? []) {
        const relatedHref = related.href?.replace(/\.md$/i, '');
        if (relatedHref && !isExternalUrl(relatedHref) && !lessonSlugs.has(relatedHref)) {
          issues.push({
            file,
            message: `index.toml references missing related lesson '${related.href}'.`,
          });
        }
      }
    }
  }
};

const buildWritingEntry = async (
  source: MarkdownSource,
  issues: ContentValidationIssue[],
): Promise<WritingIndexEntry> => {
  const { data, sourceHash, sourcePath } = source;
  const slug = path.basename(source.absolutePath, '.md');

  return {
    title: requiredString(sourcePath, data.title, 'title', issues),
    description: requiredString(sourcePath, data.description, 'description', issues),
    date: safeDateString(sourcePath, data.date, 'date', issues),
    modified: safeDateString(sourcePath, data.modified, 'modified', issues),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    slug,
    sourcePath,
    sourceHash,
    path: `/writing/${slug}`,
  };
};

const buildCourseEntry = async (
  courseDirectory: string,
  issues: ContentValidationIssue[],
): Promise<CourseRecord | null> => {
  const courseSlug = path.basename(courseDirectory);
  const readmePath = path.join(courseDirectory, 'README.md');
  const contentsPath = path.join(courseDirectory, 'index.toml');

  if (!(await fileExists(readmePath))) {
    issues.push({
      file: normalizePath(path.relative(repositoryRoot, readmePath)),
      message: 'Missing course README.md.',
    });

    return null;
  }

  const readmeSource = await loadMarkdownSource(readmePath);
  const { data } = readmeSource;
  const lessons: LessonRecord[] = [];
  const courseTitle = requiredString(readmeSource.sourcePath, data.title, 'title', issues);

  const lessonFiles = await fg('*.md', {
    cwd: courseDirectory,
    absolute: true,
    onlyFiles: true,
  });

  const lessonSlugSet = new Set<string>();

  for (const lessonPath of lessonFiles.sort()) {
    if (path.basename(lessonPath) === 'README.md') continue;

    const lessonSlug = path.basename(lessonPath, '.md');
    if (lessonReservedSlugs.has(lessonSlug)) {
      issues.push({
        file: relativeSourcePath(lessonPath),
        message: `Lesson slug '${lessonSlug}' collides with a reserved route.`,
      });
    }

    if (lessonSlugSet.has(lessonSlug)) {
      issues.push({
        file: relativeSourcePath(lessonPath),
        message: `Duplicate lesson slug '${lessonSlug}' in course '${courseSlug}'.`,
      });
      continue;
    }

    lessonSlugSet.add(lessonSlug);

    const lessonSource = await loadMarkdownSource(lessonPath);
    const sourcePath = lessonSource.sourcePath;

    lessons.push({
      title: requiredString(sourcePath, lessonSource.data.title, 'title', issues),
      description: requiredString(sourcePath, lessonSource.data.description, 'description', issues),
      date: safeDateString(sourcePath, lessonSource.data.date, 'date', issues),
      modified: safeDateString(sourcePath, lessonSource.data.modified, 'modified', issues),
      slug: lessonSlug,
      courseSlug,
      courseTitle,
      tags: Array.isArray(lessonSource.data.tags) ? lessonSource.data.tags.map(String) : [],
      sourcePath,
      sourceHash: lessonSource.sourceHash,
      path: `/courses/${courseSlug}/${lessonSlug}`,
      source: lessonSource,
    });
  }

  const courseContentsSource = await loadCourseContentsSource(contentsPath, issues);
  validateCourseContents(
    courseContentsSource?.sourcePath ?? relativeSourcePath(contentsPath),
    courseContentsSource?.contents,
    lessonSlugSet,
    issues,
  );

  return {
    title: courseTitle,
    description: requiredString(readmeSource.sourcePath, data.description, 'description', issues),
    date: safeDateString(readmeSource.sourcePath, data.date, 'date', issues),
    modified: safeDateString(readmeSource.sourcePath, data.modified, 'modified', issues),
    slug: courseSlug,
    sourcePath: readmeSource.sourcePath,
    sourceHash: readmeSource.sourceHash,
    path: `/courses/${courseSlug}`,
    contents: courseContentsSource?.contents,
    source: readmeSource,
    contentsSource: courseContentsSource,
    lessons,
  };
};

const buildRoutes = (
  writingEntries: WritingIndexEntry[],
  courseEntries: CourseRecord[],
): Record<string, ContentRoute> => {
  const routes = new Map<string, ContentRoute>();

  for (const entry of writingEntries) {
    routes.set(entry.path, {
      ...entry,
      llmsPath: `${entry.path}/llms.txt`,
      openGraphPath: `${entry.path}/open-graph.jpg`,
      contentType: 'writing',
    });
  }

  for (const course of courseEntries) {
    routes.set(course.path, {
      path: course.path,
      title: course.title,
      description: course.description,
      date: course.date,
      modified: course.modified,
      sourcePath: course.sourcePath,
      sourceHash: course.sourceHash,
      llmsPath: `${course.path}/llms.txt`,
      openGraphPath: `${course.path}/open-graph.jpg`,
      contentType: 'course',
      courseSlug: course.slug,
      contents: course.contents,
    });

    for (const lesson of course.lessons) {
      routes.set(lesson.path, {
        path: lesson.path,
        title: lesson.title,
        description: lesson.description,
        date: lesson.date,
        modified: lesson.modified,
        sourcePath: lesson.sourcePath,
        sourceHash: lesson.sourceHash,
        llmsPath: `${lesson.path}/llms.txt`,
        openGraphPath: `${lesson.path}/open-graph.jpg`,
        contentType: 'lesson',
        courseSlug: lesson.courseSlug,
        courseTitle: lesson.courseTitle,
        lessonSlug: lesson.slug,
        tags: lesson.tags,
      });
    }
  }

  return Object.fromEntries(
    [...routes.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
};

const validateRouteCollisions = (
  writingEntries: WritingIndexEntry[],
  courseEntries: CourseRecord[],
  routes: Record<string, ContentRoute>,
  issues: ContentValidationIssue[],
): void => {
  for (const entry of writingEntries) {
    if (writingReservedSlugs.has(entry.slug)) {
      issues.push({
        file: entry.sourcePath,
        message: `Writing slug '${entry.slug}' collides with a reserved route.`,
      });
    }
  }

  for (const course of courseEntries) {
    if (courseReservedSlugs.has(course.slug)) {
      issues.push({
        file: course.sourcePath,
        message: `Course slug '${course.slug}' collides with a reserved route.`,
      });
    }
  }

  const seenPaths = new Set<string>();
  for (const routePath of Object.keys(routes)) {
    if (staticRoutes.has(routePath)) {
      issues.push({
        file: routes[routePath].sourcePath,
        message: `Route '${routePath}' collides with an existing static route.`,
      });
    }

    if (seenPaths.has(routePath)) {
      issues.push({
        file: routes[routePath].sourcePath,
        message: `Duplicate generated route '${routePath}'.`,
      });
    }

    seenPaths.add(routePath);
  }
};

const buildRepositoryHash = (sourceHashes: Map<string, string>): string =>
  createHash('sha256')
    .update(
      [...sourceHashes.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([sourceFile, sourceHash]) => `${sourceFile}:${sourceHash}`)
        .join('|'),
    )
    .digest('hex');

export const collectContentRepository = async (): Promise<ContentRepository> => {
  const validationIssues: ContentValidationIssue[] = [];
  const writingFiles = await fg('*.md', {
    cwd: writingRoot,
    absolute: true,
    onlyFiles: true,
  });
  const courseDirectories = await fg('*', {
    cwd: coursesRoot,
    absolute: true,
    onlyDirectories: true,
  });
  const writingSources = await Promise.all(
    writingFiles.sort().map((file) => loadMarkdownSource(file)),
  );

  const writingEntries = await Promise.all(
    writingSources.map((source) => buildWritingEntry(source, validationIssues)),
  );
  const courseEntries = (
    await Promise.all(
      courseDirectories.sort().map((directory) => buildCourseEntry(directory, validationIssues)),
    )
  ).filter((entry): entry is CourseRecord => entry !== null);

  const routes = buildRoutes(writingEntries, courseEntries);
  validateRouteCollisions(writingEntries, courseEntries, routes, validationIssues);

  const routePaths = new Set(Object.keys(routes));
  const courseDirectorySlugs = new Set(courseEntries.map((entry) => entry.slug));

  const tailwindPlaygrounds: string[] = [];
  const sourceHashes = new Map<string, string>();

  for (const writingSource of writingSources) {
    sourceHashes.set(writingSource.sourcePath, writingSource.sourceHash);
    tailwindPlaygrounds.push(...writingSource.tailwindPlaygrounds);
    await validateMarkdownLinks(
      writingSource.sourcePath,
      writingSource.tree,
      writingSource.headingAnchors,
      routePaths,
      courseDirectorySlugs,
      validationIssues,
    );
  }

  for (const course of courseEntries) {
    sourceHashes.set(course.source.sourcePath, course.source.sourceHash);
    tailwindPlaygrounds.push(...course.source.tailwindPlaygrounds);
    await validateMarkdownLinks(
      course.sourcePath,
      course.source.tree,
      course.source.headingAnchors,
      routePaths,
      courseDirectorySlugs,
      validationIssues,
    );

    if (course.contentsSource) {
      sourceHashes.set(course.contentsSource.sourcePath, course.contentsSource.sourceHash);
    }

    for (const lesson of course.lessons) {
      sourceHashes.set(lesson.source.sourcePath, lesson.source.sourceHash);
      tailwindPlaygrounds.push(...lesson.source.tailwindPlaygrounds);
      await validateMarkdownLinks(
        lesson.source.sourcePath,
        lesson.source.tree,
        lesson.source.headingAnchors,
        routePaths,
        courseDirectorySlugs,
        validationIssues,
      );
    }
  }

  const sourceFiles = [...sourceHashes.keys()].sort();
  const repositoryHash = buildRepositoryHash(sourceHashes);
  const lessonEntries = courseEntries
    .flatMap((course) => course.lessons)
    .map(({ source: _source, ...lesson }) => lesson)
    .sort(compareByDate);
  const siteIndex: SiteContentIndex = {
    posts: [...writingEntries].sort(compareByDate),
    courses: [...courseEntries]
      .map(
        ({ lessons: _lessons, source: _source, contentsSource: _contentsSource, ...course }) =>
          course,
      )
      .sort(compareByDate),
  };

  const uniqueLessonRedirectSlugs = lessonEntries
    .reduce<Map<string, string | null>>((map, lesson) => {
      const existing = map.get(lesson.slug);
      if (existing && existing !== lesson.courseSlug) {
        map.set(lesson.slug, null);
      } else if (!map.has(lesson.slug)) {
        map.set(lesson.slug, lesson.courseSlug);
      }

      return map;
    }, new Map<string, string | null>())
    .entries();
  const legacyCourseRedirectEntries = unique([
    ...courseEntries.map((entry) => `${entry.slug}.md`),
    ...[...uniqueLessonRedirectSlugs]
      .filter(([, courseSlug]) => courseSlug !== null)
      .map(([lessonSlug]) => `${lessonSlug}.md`),
  ]).map((course) => ({ course }));

  return {
    meta: {
      hash: repositoryHash,
      sourceFileCount: sourceFiles.length,
      routeCount: Object.keys(routes).length,
      playgroundCount: tailwindPlaygrounds.length,
    },
    siteIndex,
    routes,
    writing: siteIndex.posts,
    courses: siteIndex.courses,
    lessons: lessonEntries,
    prerenderEntries: {
      writing: [
        ...writingEntries.map((entry) => ({ slug: entry.slug })),
        ...writingEntries.map((entry) => ({ slug: `${entry.slug}.md` })),
      ],
      courses: [
        ...courseEntries.map((entry) => ({ course: entry.slug })),
        ...legacyCourseRedirectEntries,
      ],
      lessons: [
        ...lessonEntries.map((entry) => ({ course: entry.courseSlug, lesson: entry.slug })),
        ...lessonEntries.map((entry) => ({ course: entry.courseSlug, lesson: `${entry.slug}.md` })),
      ],
    },
    validationIssues,
    tailwindPlaygroundSource: buildTailwindPlaygroundSource(tailwindPlaygrounds),
    sourceFiles,
  };
};
