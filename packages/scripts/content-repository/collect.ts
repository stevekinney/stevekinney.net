import fg from 'fast-glob';

import { coursesRoot, projectsRoot, writingRoot } from '../content-paths.ts';
import { auditContentMetadata } from '../content-metadata.ts';

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

const collectSourceArtifacts = (
  source: MarkdownSource,
  routePaths: Set<string>,
  courseDirectorySlugs: Set<string>,
  sourceHashes: Map<string, string>,
  tailwindPlaygrounds: import('@stevekinney/utilities/tailwind-playground-types').PlaygroundDefinition[],
  siteTailwindCandidates: string[],
  validationIssues: ContentValidationIssue[],
): void => {
  sourceHashes.set(source.sourcePath, source.sourceHash);
  tailwindPlaygrounds.push(...source.tailwindPlaygrounds);
  siteTailwindCandidates.push(...source.siteTailwindCandidates);

  validateMarkdownLinks(
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
  const metadataAudit = await auditContentMetadata();
  const validationIssues: ContentValidationIssue[] = [...metadataAudit.issues];
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
    writingFiles.sort().map((file) => loadMarkdownSource(file, validationIssues)),
  );
  const projectSources = await Promise.all(
    projectFiles.sort().map((file) => loadMarkdownSource(file)),
  );

  const writingEntries = await Promise.all(
    writingSources.map((source) =>
      buildWritingEntry(source, validationIssues, metadataAudit.history),
    ),
  );
  const projectEntries = await Promise.all(
    projectSources.map((source) => buildProjectEntry(source, validationIssues)),
  );
  const courseEntries = (
    await Promise.all(
      courseDirectories
        .sort()
        .map((directory) => buildCourseEntry(directory, validationIssues, metadataAudit.history)),
    )
  ).filter((entry): entry is CourseRecord => entry !== null);

  const routes = buildRoutes(writingEntries, courseEntries, projectEntries);
  validateRouteCollisions(writingEntries, courseEntries, projectEntries, routes, validationIssues);

  const routePaths = new Set(Object.keys(routes));
  const courseDirectorySlugs = new Set(courseEntries.map((entry) => entry.slug));
  const tailwindPlaygrounds: import('@stevekinney/utilities/tailwind-playground-types').PlaygroundDefinition[] =
    [];
  const siteTailwindCandidates: string[] = [];
  const sourceHashes = new Map<string, string>();

  for (const writingSource of writingSources) {
    collectSourceArtifacts(
      writingSource,
      routePaths,
      courseDirectorySlugs,
      sourceHashes,
      tailwindPlaygrounds,
      siteTailwindCandidates,
      validationIssues,
    );
  }

  for (const projectSource of projectSources) {
    collectSourceArtifacts(
      projectSource,
      routePaths,
      courseDirectorySlugs,
      sourceHashes,
      tailwindPlaygrounds,
      siteTailwindCandidates,
      validationIssues,
    );
  }

  for (const course of courseEntries) {
    collectSourceArtifacts(
      course.source,
      routePaths,
      courseDirectorySlugs,
      sourceHashes,
      tailwindPlaygrounds,
      siteTailwindCandidates,
      validationIssues,
    );

    if (course.contentsSource) {
      sourceHashes.set(course.contentsSource.sourcePath, course.contentsSource.sourceHash);
    }

    for (const lesson of course.lessons) {
      collectSourceArtifacts(
        lesson.source,
        routePaths,
        courseDirectorySlugs,
        sourceHashes,
        tailwindPlaygrounds,
        siteTailwindCandidates,
        validationIssues,
      );
    }
  }

  validateProjectFrontmatterLinks(projectEntries, routePaths, validationIssues);

  const sourceFiles = [...sourceHashes.keys()].sort();
  const repositoryHash = buildRepositoryHash(sourceHashes, metadataAudit.history);
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
    playgrounds: tailwindPlaygrounds,
    siteTailwindCandidates: [...new Set(siteTailwindCandidates)].sort(),
    sourceFiles,
  };
};
