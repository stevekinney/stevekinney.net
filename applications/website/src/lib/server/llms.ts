import { author, language, url } from '$lib/metadata';
import { getGeneratedContent, getLessonRoute } from '$lib/server/content';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type {
  CourseIndexEntry,
  ProjectIndexEntry,
  WritingIndexEntry,
} from '@stevekinney/utilities/content-types';
import {
  loadRawCourseLesson,
  loadRawCourseReadme,
  loadRawProjectContent,
  loadRawWritingContent,
} from '$lib/server/load-raw-content';

type DocumentMetadata = {
  title: string;
  description: string;
  path: string;
  date?: string;
  modified?: string;
};

type ExportOptions = {
  headingLevel?: number;
};

const documentHeader = (
  metadata: DocumentMetadata,
  extra: string[] = [],
  headingLevel = 1,
): string[] => [
  `${'#'.repeat(headingLevel)} ${metadata.title}`,
  '',
  `URL: ${url}${metadata.path}`,
  `Canonical: ${url}${metadata.path}`,
  `Author: ${author}`,
  `Language: ${language}`,
  ...(metadata.date ? [`Date: ${metadata.date}`] : []),
  ...(metadata.modified ? [`Modified: ${metadata.modified}`] : []),
  `Description: ${metadata.description}`,
  ...extra,
];

const separator = ['', '---', ''];
const markdownParser = unified().use(remarkParse);
const generatedHeading = (documentLevel: number, relativeLevel: number, title: string): string =>
  `${'#'.repeat(Math.min(6, documentLevel + relativeLevel))} ${title}`;

const normalizeEmbeddedHeadings = (source: string, minimumLevel: number): string => {
  const tree = markdownParser.parse(source);
  const edits: Array<{ start: number; end: number; replacement: string }> = [];

  visit(tree, 'heading', (heading) => {
    const start = heading.position?.start.offset;
    const end = heading.position?.end.offset;
    if (start === undefined || end === undefined) return;

    const lineEnd = source.indexOf('\n', start);
    const line = source.slice(start, lineEnd === -1 ? source.length : lineEnd);
    const level = Math.min(6, heading.depth + minimumLevel - 1);
    const match = /^( {0,3})(#{1,6})(?=\s|$)/.exec(line);
    if (match) {
      edits.push({
        start: start + match[1].length,
        end: start + match[1].length + match[2].length,
        replacement: '#'.repeat(level),
      });
      return;
    }

    const lines = source.slice(start, end).split('\n');
    if (lines.length >= 2 && /^\s*(?:=+|-+)\s*$/.test(lines.at(-1) ?? '')) {
      edits.push({
        start,
        end,
        replacement: `${'#'.repeat(level)} ${lines.slice(0, -1).join(' ').trim()}`,
      });
    }
  });

  return edits
    .sort((left, right) => right.start - left.start)
    .reduce(
      (result, edit) => result.slice(0, edit.start) + edit.replacement + result.slice(edit.end),
      source,
    );
};

const courseLessonPath = (courseSlug: string, href: string): string => {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href) || href.startsWith('/')) {
    return href;
  }

  return `/courses/${courseSlug}/${href.split('/').pop()?.replace(/\.md$/i, '') ?? href}`;
};

const toPublicUrl = (path: string): string =>
  /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path) ? path : `${url}${path}`;

export const renderWritingExport = async (
  post: WritingIndexEntry,
  options: ExportOptions = {},
): Promise<string> =>
  [
    ...documentHeader(post, [], options.headingLevel),
    ...separator,
    options.headingLevel
      ? normalizeEmbeddedHeadings(
          await loadRawWritingContent(post.path.split('/').pop() ?? ''),
          options.headingLevel + 1,
        )
      : await loadRawWritingContent(post.path.split('/').pop() ?? ''),
  ].join('\n');

export const renderCourseExport = async (
  course: CourseIndexEntry,
  options: ExportOptions = {},
): Promise<string> => {
  const headingLevel = options.headingLevel ?? 1;
  const listedPaths = new Set<string>();
  const listedLessonPaths: string[] = [];
  const indexLines = (course.contents?.section ?? []).flatMap((section) => [
    ...(section.title ? [generatedHeading(headingLevel, 2, section.title), ''] : []),
    ...section.item.flatMap((item) => {
      const itemPath = courseLessonPath(course.slug, item.href);
      listedPaths.add(itemPath);
      listedLessonPaths.push(itemPath);
      return [
        `- [${item.title}](${toPublicUrl(itemPath)})`,
        ...(item.related ?? []).map((related) => {
          const relatedPath = courseLessonPath(course.slug, related.href);
          listedPaths.add(relatedPath);
          listedLessonPaths.push(relatedPath);
          return `  - [${related.title}](${toPublicUrl(relatedPath)})`;
        }),
      ];
    }),
  ]);
  const allLessons = getGeneratedContent().lessons.filter(
    (lesson) => lesson.courseSlug === course.slug,
  );
  const lessonsByPath = new Map(allLessons.map((lesson) => [lesson.path, lesson]));
  const indexedLessons = [...new Set(listedLessonPaths)].flatMap((path) => {
    const lesson = lessonsByPath.get(path);
    return lesson ? [lesson] : [];
  });
  const additionalLessons = allLessons
    .filter((lesson) => !listedPaths.has(lesson.path))
    .sort((left, right) => left.slug.localeCompare(right.slug));
  const lessons = [...indexedLessons, ...additionalLessons];
  const lessonLines = additionalLessons.length
    ? [
        generatedHeading(headingLevel, 2, 'Additional lessons'),
        '',
        ...additionalLessons.map((lesson) => `- [${lesson.title}](${url}${lesson.path})`),
      ]
    : [];
  const body = await loadRawCourseReadme(course.slug);
  const lessonBodies = await Promise.all(
    lessons.map(async (lesson) =>
      [
        `${'#'.repeat(headingLevel === 1 ? 3 : headingLevel + 1)} ${lesson.title}`,
        '',
        ...documentHeader(
          {
            title: lesson.title,
            description: lesson.description,
            path: lesson.path,
            modified: lesson.modified,
          },
          [`Course: ${course.title}`, `Course URL: ${url}${course.path}`],
          headingLevel === 1 ? 3 : headingLevel + 1,
        ).slice(2),
        '',
        normalizeEmbeddedHeadings(
          await loadRawCourseLesson(course.slug, lesson.slug),
          (headingLevel === 1 ? 3 : headingLevel + 1) + 1,
        ),
        '',
      ].join('\n'),
    ),
  );
  return [
    ...documentHeader(course, [], headingLevel),
    '',
    generatedHeading(headingLevel, 1, 'Course contents'),
    '',
    ...indexLines,
    ...lessonLines,
    ...separator,
    normalizeEmbeddedHeadings(body, headingLevel + 1),
    ...separator,
    ...lessonBodies.flatMap((lesson) => [lesson, ...separator]),
  ].join('\n');
};

export const renderProjectExport = async (
  project: ProjectIndexEntry,
  options: ExportOptions = {},
): Promise<string> => {
  const links = [
    `GitHub: ${project.githubUrl}`,
    ...(project.productionUrl ? [`Production: ${project.productionUrl}`] : []),
    ...(project.writingPath ? [`Related writing: ${url}${project.writingPath}`] : []),
    ...(project.youtubeUrl ? [`YouTube: ${project.youtubeUrl}`] : []),
  ];
  return [
    ...documentHeader({ ...project, title: project.name }, links, options.headingLevel),
    ...separator,
    options.headingLevel
      ? normalizeEmbeddedHeadings(
          await loadRawProjectContent(project.path.split('/').pop() ?? ''),
          options.headingLevel + 1,
        )
      : await loadRawProjectContent(project.path.split('/').pop() ?? ''),
  ].join('\n');
};

export const renderLessonExport = async (
  courseSlug: string,
  lessonSlug: string,
): Promise<string> => {
  const content = getGeneratedContent();
  const course = content.courses.find((entry) => entry.slug === courseSlug);
  const lesson = getLessonRoute(courseSlug, lessonSlug);
  if (!course || !lesson)
    throw new Error(`Lesson route not found for '${courseSlug}/${lessonSlug}'.`);
  return [
    ...documentHeader(
      {
        title: lesson.title,
        description: lesson.description,
        path: lesson.path,
        modified: lesson.modified,
      },
      [`Course: ${course.title}`, `Course URL: ${url}${course.path}`],
    ),
    ...separator,
    await loadRawCourseLesson(courseSlug, lessonSlug),
  ].join('\n');
};
