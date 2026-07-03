import fg from 'fast-glob';

import { buildTailwindPlaygroundSource } from '@stevekinney/utilities/tailwind-playground';

import { coursesRoot, projectsRoot, writingRoot } from '../content-paths.ts';

import {
  buildCourseEntry,
  buildPrerenderEntries,
  buildProjectEntry,
  buildRepositoryHash,
  buildRoutes,
  buildSiteIndex,
  buildWritingEntry,
} from './builders.ts';
import { loadMarkdownSource } from './markdown.ts';
import type {
  ContentRepository,
  ContentValidationIssue,
  CourseRecord,
  MarkdownSource,
} from './types.ts';
import {
  validateMarkdownLinks,
  validateProjectFrontmatterLinks,
  validateRouteCollisions,
} from './validation.ts';

const collectSourceArtifacts = async (
  source: MarkdownSource,
  routePaths: Set<string>,
  courseDirectorySlugs: Set<string>,
  sourceHashes: Map<string, string>,
  tailwindPlaygrounds: string[],
  validationIssues: ContentValidationIssue[],
): Promise<void> => {
  sourceHashes.set(source.sourcePath, source.sourceHash);
  tailwindPlaygrounds.push(...source.tailwindPlaygrounds);

  await validateMarkdownLinks(
    source.sourcePath,
    source.tree,
    source.headingAnchors,
    routePaths,
    courseDirectorySlugs,
    validationIssues,
  );
};

export type { ContentRepository } from './types.ts';

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
  const projectFiles = await fg('*.md', {
    cwd: projectsRoot,
    absolute: true,
    onlyFiles: true,
  });
  const writingSources = await Promise.all(
    writingFiles.sort().map((file) => loadMarkdownSource(file)),
  );
  const projectSources = await Promise.all(
    projectFiles.sort().map((file) => loadMarkdownSource(file)),
  );

  const writingEntries = await Promise.all(
    writingSources.map((source) => buildWritingEntry(source, validationIssues)),
  );
  const projectEntries = await Promise.all(
    projectSources.map((source) => buildProjectEntry(source, validationIssues)),
  );
  const courseEntries = (
    await Promise.all(
      courseDirectories.sort().map((directory) => buildCourseEntry(directory, validationIssues)),
    )
  ).filter((entry): entry is CourseRecord => entry !== null);

  const routes = buildRoutes(writingEntries, courseEntries, projectEntries);
  validateRouteCollisions(writingEntries, courseEntries, projectEntries, routes, validationIssues);

  const routePaths = new Set(Object.keys(routes));
  const courseDirectorySlugs = new Set(courseEntries.map((entry) => entry.slug));
  const tailwindPlaygrounds: string[] = [];
  const sourceHashes = new Map<string, string>();

  for (const writingSource of writingSources) {
    await collectSourceArtifacts(
      writingSource,
      routePaths,
      courseDirectorySlugs,
      sourceHashes,
      tailwindPlaygrounds,
      validationIssues,
    );
  }

  for (const projectSource of projectSources) {
    await collectSourceArtifacts(
      projectSource,
      routePaths,
      courseDirectorySlugs,
      sourceHashes,
      tailwindPlaygrounds,
      validationIssues,
    );
  }

  for (const course of courseEntries) {
    await collectSourceArtifacts(
      course.source,
      routePaths,
      courseDirectorySlugs,
      sourceHashes,
      tailwindPlaygrounds,
      validationIssues,
    );

    if (course.contentsSource) {
      sourceHashes.set(course.contentsSource.sourcePath, course.contentsSource.sourceHash);
    }

    for (const lesson of course.lessons) {
      await collectSourceArtifacts(
        lesson.source,
        routePaths,
        courseDirectorySlugs,
        sourceHashes,
        tailwindPlaygrounds,
        validationIssues,
      );
    }
  }

  validateProjectFrontmatterLinks(projectEntries, routePaths, validationIssues);

  const sourceFiles = [...sourceHashes.keys()].sort();
  const repositoryHash = buildRepositoryHash(sourceHashes);
  const { lessons, siteIndex } = buildSiteIndex(writingEntries, courseEntries, projectEntries);

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
    lessons,
    projects: siteIndex.projects,
    prerenderEntries: buildPrerenderEntries(
      writingEntries,
      courseEntries,
      lessons,
      siteIndex.projects,
    ),
    validationIssues,
    tailwindPlaygroundSource: buildTailwindPlaygroundSource(tailwindPlaygrounds),
    sourceFiles,
  };
};
