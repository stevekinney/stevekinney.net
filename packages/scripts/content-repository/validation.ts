import { existsSync } from 'node:fs';
import path from 'node:path';

import { toDateString } from '@stevekinney/utilities/frontmatter';
import { normalizeRoutePath } from '@stevekinney/utilities/routes';
import type {
  ContentRoute,
  CourseContentsData,
  WritingIndexEntry,
} from '@stevekinney/utilities/content-types';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

import {
  coursesRoot,
  resolveRepositoryPath,
  websiteStaticRoot,
  writingRoot,
} from '../content-paths.ts';

import { courseReservedSlugs, staticRoutes, writingReservedSlugs } from './constants.ts';
import { fileExists, isExternalUrl, stripQueryAndHash } from './markdown.ts';
import type { ContentValidationIssue, CourseRecord, MarkdownReferenceNode } from './types.ts';

export const safeDateString = (
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

export const requiredString = (
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

export const validateMarkdownLinks = async (
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

export const validateCourseContents = (
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

export const validateRouteCollisions = (
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

  for (const routePath of Object.keys(routes)) {
    if (staticRoutes.has(routePath)) {
      issues.push({
        file: routes[routePath].sourcePath,
        message: `Route '${routePath}' collides with an existing static route.`,
      });
    }
  }
};
