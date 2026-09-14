import fg from 'fast-glob';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { normalizeObsidianMarkdown } from '@stevekinney/markdown/obsidian-normalization';
import type { NormalizedMarkdown } from '@stevekinney/markdown/obsidian-types';

import { buildTailwindPlaygroundSource } from '@stevekinney/utilities/tailwind-playground';

import { coursesRoot, projectsRoot, writingRoot, repositoryRoot } from '../content-paths.ts';
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
import { loadMarkdownSource, updateMarkdownSource, hashContents } from './markdown.ts';
import { buildPublicationIndex, normalizeListProperty } from './publication.ts';
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
  tailwindPlaygrounds: string[],
  validationIssues: ContentValidationIssue[],
): void => {
  sourceHashes.set(source.sourcePath, source.sourceHash);
  tailwindPlaygrounds.push(...source.tailwindPlaygrounds);

  validateMarkdownLinks(
    source.sourcePath,
    source.tree,
    source.headingAnchors,
    routePaths,
    courseDirectorySlugs,
    validationIssues,
  );
};

const hashDependency = async (filename: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filename);
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.once('error', reject);
    stream.once('end', () => resolve(hash.digest('hex')));
  });

export type { ContentRepository } from './types.ts';

export const collectContentRepository = async (): Promise<ContentRepository> => {
  const metadataAudit = await auditContentMetadata();
  const [writingFiles, courseDirectories, projectFiles] = await Promise.all([
    fg('*.md', { cwd: writingRoot, absolute: true, onlyFiles: true }),
    fg('*', { cwd: coursesRoot, absolute: true, onlyDirectories: true }),
    fg('*.md', { cwd: projectsRoot, absolute: true, onlyFiles: true }),
  ]);
  const sourceValidationIssues: ContentValidationIssue[] = [];
  const [writingSources, projectSources] = await Promise.all([
    Promise.all(
      writingFiles.sort().map((file) => loadMarkdownSource(file, sourceValidationIssues)),
    ),
    Promise.all(projectFiles.sort().map((file) => loadMarkdownSource(file))),
  ]);
  const validationIssues: ContentValidationIssue[] = [
    ...metadataAudit.issues,
    ...sourceValidationIssues,
  ];

  const writingEntries = await Promise.all(
    writingSources.map((source) => {
      source.data.tags = normalizeListProperty(source, 'tags', validationIssues);
      return buildWritingEntry(source, validationIssues, metadataAudit.history);
    }),
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

  const sources = [
    ...writingSources,
    ...projectSources,
    ...courseEntries.flatMap((course) => [
      course.source,
      ...course.lessons.map((lesson) => lesson.source),
    ]),
  ];
  const publicationIndex = await buildPublicationIndex(sources, routes, validationIssues);
  const normalizedDocuments: Record<string, NormalizedMarkdown> = {};
  const dependencyHashes = new Map(sources.map((source) => [source.sourcePath, source.sourceHash]));
  for (const source of sources) {
    const normalized = normalizeObsidianMarkdown(source.rawSource, {
      sourcePath: source.sourcePath,
      publicationIndex,
      markdownTree: source.tree,
    });
    normalizedDocuments[source.sourcePath] = normalized;
    validationIssues.push(...normalized.diagnostics);
    if (normalized.markdown !== source.rawSource) updateMarkdownSource(source, normalized.markdown);
    for (const dependency of normalized.dependencies) {
      if (dependencyHashes.has(dependency)) continue;
      dependencyHashes.set(
        dependency,
        await hashDependency(path.resolve(repositoryRoot, dependency)),
      );
    }
    source.sourceHash = hashContents(
      source.rawSource +
        normalized.markdown +
        normalized.dependencies
          .slice()
          .sort()
          .map((dependency) => `${dependency}:${dependencyHashes.get(dependency)}`)
          .join('\n'),
    );
  }
  const normalizedHashes = new Map(sources.map((source) => [source.sourcePath, source.sourceHash]));
  for (const record of [
    ...writingEntries,
    ...projectEntries,
    ...courseEntries,
    ...courseEntries.flatMap((course) => course.lessons),
    ...Object.values(routes),
  ]) {
    record.sourceHash = normalizedHashes.get(record.sourcePath) ?? record.sourceHash;
  }

  const routePaths = new Set(Object.keys(routes));
  const courseDirectorySlugs = new Set(courseEntries.map((entry) => entry.slug));
  const tailwindPlaygrounds: string[] = [];
  const sourceHashes = new Map<string, string>();

  for (const writingSource of writingSources) {
    collectSourceArtifacts(
      writingSource,
      routePaths,
      courseDirectorySlugs,
      sourceHashes,
      tailwindPlaygrounds,
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
        validationIssues,
      );
    }
  }

  validateProjectFrontmatterLinks(projectEntries, routePaths, validationIssues);

  const sourceFiles = [...sourceHashes.keys()].sort();
  const repositoryHash = buildRepositoryHash(sourceHashes, metadataAudit.history);
  const { lessons, siteIndex } = buildSiteIndex(writingEntries, courseEntries, projectEntries);

  return {
    publicationIndex,
    normalizedDocuments,
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
