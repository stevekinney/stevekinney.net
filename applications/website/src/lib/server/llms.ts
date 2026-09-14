import { author, language, url } from '$lib/metadata';
import { getGeneratedContent, getLessonRoute } from '$lib/server/content';
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

const documentHeader = (metadata: DocumentMetadata, extra: string[] = []): string[] => [
  `# ${metadata.title}`,
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

const courseLessonPath = (courseSlug: string, href: string): string => {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href) || href.startsWith('/')) {
    return href;
  }

  return `/courses/${courseSlug}/${href.split('/').pop()?.replace(/\.md$/i, '') ?? href}`;
};

const toPublicUrl = (path: string): string =>
  /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path) ? path : `${url}${path}`;

export const renderWritingExport = async (post: WritingIndexEntry): Promise<string> =>
  [
    ...documentHeader(post),
    ...separator,
    await loadRawWritingContent(post.path.split('/').pop() ?? ''),
  ].join('\n');

export const renderCourseExport = async (course: CourseIndexEntry): Promise<string> => {
  const listedPaths = new Set<string>();
  const listedLessonPaths: string[] = [];
  const indexLines = (course.contents?.section ?? []).flatMap((section) => [
    ...(section.title ? [`### ${section.title}`, ''] : []),
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
        '### Additional lessons',
        '',
        ...additionalLessons.map((lesson) => `- [${lesson.title}](${url}${lesson.path})`),
      ]
    : [];
  const body = await loadRawCourseReadme(course.slug);
  const lessonBodies = await Promise.all(
    lessons.map(async (lesson) =>
      [
        `### ${lesson.title}`,
        '',
        ...documentHeader(
          {
            title: lesson.title,
            description: lesson.description,
            path: lesson.path,
            modified: lesson.modified,
          },
          [`Course: ${course.title}`, `Course URL: ${url}${course.path}`],
        ).slice(2),
        '',
        await loadRawCourseLesson(course.slug, lesson.slug),
        '',
      ].join('\n'),
    ),
  );
  return [
    ...documentHeader(course),
    '',
    '## Course contents',
    '',
    ...indexLines,
    ...lessonLines,
    ...separator,
    body,
    ...separator,
    ...lessonBodies.flatMap((lesson) => [lesson, ...separator]),
  ].join('\n');
};

export const renderProjectExport = async (project: ProjectIndexEntry): Promise<string> => {
  const links = [
    `GitHub: ${project.githubUrl}`,
    ...(project.productionUrl ? [`Production: ${project.productionUrl}`] : []),
    ...(project.writingPath ? [`Related writing: ${url}${project.writingPath}`] : []),
    ...(project.youtubeUrl ? [`YouTube: ${project.youtubeUrl}`] : []),
  ];
  return [
    ...documentHeader({ ...project, title: project.name }, links),
    ...separator,
    await loadRawProjectContent(project.path.split('/').pop() ?? ''),
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
