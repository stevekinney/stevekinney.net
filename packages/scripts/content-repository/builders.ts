import { createHash } from 'node:crypto';
import path from 'node:path';

import fg from 'fast-glob';

import type {
  CourseContentsData,
  ContentRoute,
  GeneratedContent,
  SiteContentIndex,
  WritingIndexEntry,
} from '@stevekinney/utilities/content-types';
import { normalizePath } from '@stevekinney/utilities/frontmatter';

import { repositoryRoot } from '../content-paths.ts';

import { lessonReservedSlugs } from './constants.ts';
import {
  fileExists,
  hashContents,
  loadMarkdownSource,
  readText,
  relativeSourcePath,
} from './markdown.ts';
import type {
  ContentValidationIssue,
  ContentRepository,
  CourseContentsSource,
  CourseRecord,
  LessonRecord,
  MarkdownSource,
} from './types.ts';
import { requiredString, safeDateString, validateCourseContents } from './validation.ts';

const compareByDate = (left: { date: string }, right: { date: string }): number =>
  new Date(right.date).getTime() - new Date(left.date).getTime();

const unique = <T>(values: T[]): T[] => [...new Set(values)];

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

export const buildWritingEntry = async (
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

export const buildCourseEntry = async (
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

export const buildRoutes = (
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

export const buildRepositoryHash = (sourceHashes: Map<string, string>): string =>
  createHash('sha256')
    .update(
      [...sourceHashes.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([sourceFile, sourceHash]) => `${sourceFile}:${sourceHash}`)
        .join('|'),
    )
    .digest('hex');

export const buildSiteIndex = (
  writingEntries: WritingIndexEntry[],
  courseEntries: CourseRecord[],
): Pick<ContentRepository, 'lessons' | 'siteIndex'> => {
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

  return {
    lessons: lessonEntries,
    siteIndex,
  };
};

export const buildPrerenderEntries = (
  writingEntries: WritingIndexEntry[],
  courseEntries: CourseRecord[],
  lessonEntries: ContentRepository['lessons'],
): GeneratedContent['prerenderEntries'] => {
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
  };
};
