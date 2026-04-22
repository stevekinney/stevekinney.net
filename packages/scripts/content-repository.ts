import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

import {
  buildTailwindPlaygroundSource,
  sanitizeTailwindPlaygroundHtml,
} from '@stevekinney/utilities/tailwind-playground';
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

type CourseRecord = CourseIndexEntry & {
  lessons: LessonIndexEntry[];
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

const normalizeRoutePath = (value: string): string => {
  if (!value) return '/';
  const normalized = value === '/' ? value : value.replace(/\/$/, '');
  return normalized || '/';
};

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
  markdownBody: string,
  routePaths: Set<string>,
  courseDirectories: Set<string>,
  issues: ContentValidationIssue[],
): Promise<void> => {
  const tree = markdownParser.parse(markdownBody);
  const tasks: Promise<void>[] = [];

  visit(tree, ['link', 'image', 'definition'], (node) => {
    const url = String((node as MarkdownReferenceNode).url ?? '').trim();
    if (!url || isExternalUrl(url)) return;

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

const parseCourseContents = async (
  absolutePath: string,
  issues: ContentValidationIssue[],
): Promise<CourseContentsData | undefined> => {
  if (!(await fileExists(absolutePath))) {
    return undefined;
  }

  try {
    const contents = await readText(absolutePath);
    const parsed = Bun.TOML.parse(contents) as CourseContentsData;
    return parsed;
  } catch (error) {
    issues.push({
      file: relativeSourcePath(absolutePath),
      message: `Failed to parse index.toml: ${(error as Error).message}`,
    });
    return undefined;
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

const extractTailwindPlaygrounds = (markdownBody: string): string[] => {
  const tree = markdownParser.parse(markdownBody);
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

const buildWritingEntry = async (
  absolutePath: string,
  issues: ContentValidationIssue[],
): Promise<WritingIndexEntry> => {
  const sourcePath = relativeSourcePath(absolutePath);
  const slug = path.basename(absolutePath, '.md');
  const raw = await readText(absolutePath);
  const { data } = parseFrontmatter(raw);

  return {
    title: requiredString(sourcePath, data.title, 'title', issues),
    description: requiredString(sourcePath, data.description, 'description', issues),
    date: safeDateString(sourcePath, data.date, 'date', issues),
    modified: safeDateString(sourcePath, data.modified, 'modified', issues),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    slug,
    sourcePath,
    sourceHash: hashContents(raw),
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

  const rawReadme = await readText(readmePath);
  const { data } = parseFrontmatter(rawReadme);
  const lessons: LessonIndexEntry[] = [];

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

    const rawLesson = await readText(lessonPath);
    const parsedLesson = parseFrontmatter(rawLesson);
    const sourcePath = relativeSourcePath(lessonPath);

    lessons.push({
      title: requiredString(sourcePath, parsedLesson.data.title, 'title', issues),
      description: requiredString(sourcePath, parsedLesson.data.description, 'description', issues),
      date: safeDateString(sourcePath, parsedLesson.data.date, 'date', issues),
      modified: safeDateString(sourcePath, parsedLesson.data.modified, 'modified', issues),
      slug: lessonSlug,
      courseSlug,
      courseTitle: requiredString(relativeSourcePath(readmePath), data.title, 'title', issues),
      tags: Array.isArray(parsedLesson.data.tags) ? parsedLesson.data.tags.map(String) : [],
      sourcePath,
      sourceHash: hashContents(rawLesson),
      path: `/courses/${courseSlug}/${lessonSlug}`,
    });
  }

  const courseContents = await parseCourseContents(contentsPath, issues);
  validateCourseContents(relativeSourcePath(contentsPath), courseContents, lessonSlugSet, issues);

  return {
    title: requiredString(relativeSourcePath(readmePath), data.title, 'title', issues),
    description: requiredString(
      relativeSourcePath(readmePath),
      data.description,
      'description',
      issues,
    ),
    date: safeDateString(relativeSourcePath(readmePath), data.date, 'date', issues),
    modified: safeDateString(relativeSourcePath(readmePath), data.modified, 'modified', issues),
    slug: courseSlug,
    sourcePath: relativeSourcePath(readmePath),
    sourceHash: hashContents(rawReadme),
    path: `/courses/${courseSlug}`,
    contents: courseContents,
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

const buildRepositoryHash = async (sourceFiles: string[]): Promise<string> => {
  const signatures = await Promise.all(
    sourceFiles.map(async (sourceFile) => {
      const absolutePath = resolveRepositoryPath(sourceFile);
      const contents = await readFile(absolutePath);
      return `${sourceFile}:${createHash('sha256').update(contents).digest('hex')}`;
    }),
  );

  return createHash('sha256').update(signatures.sort().join('|')).digest('hex');
};

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

  const writingEntries = await Promise.all(
    writingFiles.sort().map((file) => buildWritingEntry(file, validationIssues)),
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
  const sourceFiles = new Set<string>();

  for (const writingFile of writingFiles) {
    const sourcePath = relativeSourcePath(writingFile);
    sourceFiles.add(sourcePath);
    const raw = await readText(writingFile);
    const parsed = parseFrontmatter(raw);
    tailwindPlaygrounds.push(...extractTailwindPlaygrounds(parsed.content));
    await validateMarkdownLinks(
      sourcePath,
      parsed.content,
      routePaths,
      courseDirectorySlugs,
      validationIssues,
    );
  }

  for (const course of courseEntries) {
    sourceFiles.add(course.sourcePath);

    const readmeRaw = await readText(resolveRepositoryPath(course.sourcePath));
    const parsedReadme = parseFrontmatter(readmeRaw);
    tailwindPlaygrounds.push(...extractTailwindPlaygrounds(parsedReadme.content));
    await validateMarkdownLinks(
      course.sourcePath,
      parsedReadme.content,
      routePaths,
      courseDirectorySlugs,
      validationIssues,
    );

    if (course.contents) {
      sourceFiles.add(normalizePath(path.join('courses', course.slug, 'index.toml')));
    }

    for (const lesson of course.lessons) {
      sourceFiles.add(lesson.sourcePath);
      const lessonRaw = await readText(resolveRepositoryPath(lesson.sourcePath));
      const parsedLesson = parseFrontmatter(lessonRaw);
      tailwindPlaygrounds.push(...extractTailwindPlaygrounds(parsedLesson.content));
      await validateMarkdownLinks(
        lesson.sourcePath,
        parsedLesson.content,
        routePaths,
        courseDirectorySlugs,
        validationIssues,
      );
    }
  }

  const repositoryHash = await buildRepositoryHash([...sourceFiles]);
  const siteIndex: SiteContentIndex = {
    posts: [...writingEntries].sort(compareByDate),
    courses: [...courseEntries]
      .map(({ lessons: _lessons, ...course }) => course)
      .sort(compareByDate),
  };

  const lessons = courseEntries.flatMap((course) => course.lessons).sort(compareByDate);
  const uniqueLessonRedirectSlugs = lessons
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
      sourceFileCount: sourceFiles.size,
      routeCount: Object.keys(routes).length,
      playgroundCount: tailwindPlaygrounds.length,
    },
    siteIndex,
    routes,
    writing: siteIndex.posts,
    courses: siteIndex.courses,
    lessons,
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
        ...lessons.map((entry) => ({ course: entry.courseSlug, lesson: entry.slug })),
        ...lessons.map((entry) => ({ course: entry.courseSlug, lesson: `${entry.slug}.md` })),
      ],
    },
    validationIssues,
    tailwindPlaygroundSource: buildTailwindPlaygroundSource(tailwindPlaygrounds),
    sourceFiles: [...sourceFiles].sort(),
  };
};
