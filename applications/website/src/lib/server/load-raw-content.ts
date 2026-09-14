import { statSync } from 'node:fs';
import path from 'node:path';
import {
  readGeneratedObsidianContent,
  type GeneratedObsidianContent,
} from '@stevekinney/markdown/obsidian-preprocessor';

import {
  getCourseRoute,
  getLessonRoute,
  getProjectRoute,
  getWritingRoute,
} from '$lib/server/content';

const root = path.resolve(process.cwd(), '..', '..');
const artifactPath = path.join(root, 'applications/website/.generated/obsidian-content.json');
let cached: GeneratedObsidianContent | undefined;
let cachedRevision = '';

const loadPublishedSource = (sourcePath: string): string => {
  const status = statSync(artifactPath);
  const revision = `${status.mtimeMs}:${status.ctimeMs}:${status.size}`;
  if (!cached || cachedRevision !== revision) {
    cached = readGeneratedObsidianContent(artifactPath);
    cachedRevision = revision;
  }
  const document = cached.documents[sourcePath];
  if (!document || document.diagnostics.length)
    throw new Error(`No valid published content for '${sourcePath}'.`);
  // Machine-readable endpoints retain readable TeX instead of the HTML transport marker.
  return document.markdown
    .replace(
      /<(span|div) data-obsidian-footnote="([A-Za-z0-9_-]+)"><\/\1>/g,
      (_marker, _tag: string, encoded: string) =>
        Buffer.from(encoded, 'base64url').toString('utf8'),
    )
    .replace(
      /<(span|div) data-obsidian-math="([A-Za-z0-9_-]+)" data-display="(inline|block)"><\/\1>/g,
      (_marker, _tag: string, encoded: string, display: string) => {
        const value = Buffer.from(encoded, 'base64url').toString('utf8');
        return display === 'block' ? `$$\n${value}\n$$` : `$${value}$`;
      },
    );
};

export function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

export async function loadRawWritingContent(slug: string): Promise<string> {
  const route = getWritingRoute(slug);
  if (!route) {
    throw new Error(`Writing route not found for '${slug}'.`);
  }

  const raw = loadPublishedSource(route.sourcePath);
  return stripFrontmatter(raw);
}

export async function loadRawCourseReadme(courseSlug: string): Promise<string> {
  const route = getCourseRoute(courseSlug);
  if (!route) {
    throw new Error(`Course route not found for '${courseSlug}'.`);
  }

  const raw = loadPublishedSource(route.sourcePath);
  return stripFrontmatter(raw);
}

export async function loadRawCourseLesson(courseSlug: string, lessonSlug: string): Promise<string> {
  const route = getLessonRoute(courseSlug, lessonSlug);
  if (!route) {
    throw new Error(`Lesson route not found for '${courseSlug}/${lessonSlug}'.`);
  }

  const raw = loadPublishedSource(route.sourcePath);
  return stripFrontmatter(raw);
}

export async function loadRawProjectContent(projectSlug: string): Promise<string> {
  const route = getProjectRoute(projectSlug);
  if (!route) {
    throw new Error(`Project route not found for '${projectSlug}'.`);
  }

  const raw = loadPublishedSource(route.sourcePath);
  return stripFrontmatter(raw);
}
