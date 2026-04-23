import fs from 'node:fs/promises';
import path from 'node:path';

import { getCourseRoute, getLessonRoute, getWritingRoute } from '$lib/server/content';

const root = path.resolve(process.cwd(), '..', '..');

export function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

export async function loadRawWritingContent(slug: string): Promise<string> {
  const route = getWritingRoute(slug);
  if (!route) {
    throw new Error(`Writing route not found for '${slug}'.`);
  }

  const filePath = path.join(root, route.sourcePath);
  const raw = await fs.readFile(filePath, 'utf-8');
  return stripFrontmatter(raw);
}

export async function loadRawCourseReadme(courseSlug: string): Promise<string> {
  const route = getCourseRoute(courseSlug);
  if (!route) {
    throw new Error(`Course route not found for '${courseSlug}'.`);
  }

  const filePath = path.join(root, route.sourcePath);
  const raw = await fs.readFile(filePath, 'utf-8');
  return stripFrontmatter(raw);
}

export async function loadRawCourseLesson(courseSlug: string, lessonSlug: string): Promise<string> {
  const route = getLessonRoute(courseSlug, lessonSlug);
  if (!route) {
    throw new Error(`Lesson route not found for '${courseSlug}/${lessonSlug}'.`);
  }

  const filePath = path.join(root, route.sourcePath);
  const raw = await fs.readFile(filePath, 'utf-8');
  return stripFrontmatter(raw);
}
