import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..', '..');

export function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

export async function loadRawWritingContent(slug: string): Promise<string> {
  const filePath = path.join(root, 'content', 'writing', `${slug}.md`);
  const raw = await fs.readFile(filePath, 'utf-8');
  return stripFrontmatter(raw);
}

export async function loadRawCourseReadme(courseSlug: string): Promise<string> {
  const filePath = path.join(root, 'courses', courseSlug, 'README.md');
  const raw = await fs.readFile(filePath, 'utf-8');
  return stripFrontmatter(raw);
}

export async function loadRawCourseLesson(courseSlug: string, lessonSlug: string): Promise<string> {
  const filePath = path.join(root, 'courses', courseSlug, `${lessonSlug}.md`);
  const raw = await fs.readFile(filePath, 'utf-8');
  return stripFrontmatter(raw);
}
