import { read } from '$app/server';
import publishedContentAsset from '../../../.generated/obsidian-content.json?url';
import type { GeneratedObsidianContent } from '@stevekinney/markdown/obsidian-preprocessor';
import type { PublicationIndex } from '@stevekinney/markdown/obsidian-types';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import {
  getCourseRoute,
  getLessonRoute,
  getProjectRoute,
  getWritingRoute,
} from '$lib/server/content';

let publishedContent: Promise<GeneratedObsidianContent> | undefined;
const markdownParser = unified().use(remarkParse);

const imageDestinationSpan = (raw: string): [number, number] | undefined => {
  const opener = raw.indexOf('](');
  if (opener < 0) return;
  let start = opener + 2;
  while (/\s/.test(raw[start] ?? '') && start < raw.length) start++;
  if (raw[start] === '<') {
    const end = raw.indexOf('>', start + 1);
    return end < 0 ? undefined : [start, end + 1];
  }
  const destinationStart = start;
  let depth = 0;
  while (start < raw.length) {
    const character = raw[start];
    if (character === '\\') {
      start += 2;
      continue;
    }
    if (character === '(') depth++;
    else if (character === ')') {
      if (!depth) break;
      depth--;
    } else if (/\s/.test(character) && !depth) break;
    start++;
  }
  return [destinationStart, start];
};

export const rewritePublishedAttachments = (
  markdown: string,
  sourcePath: string,
  publicationIndex: PublicationIndex,
): string => {
  const edits: Array<{ start: number; end: number; replacement: string }> = [];
  const attachmentUrl = (target: string): string | undefined => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target) || target.startsWith('/')) return;
    const targetWithoutQueryOrFragment = target.split(/[?#]/u, 1)[0];
    let decodedTarget: string;
    try {
      decodedTarget = decodeURIComponent(targetWithoutQueryOrFragment);
    } catch {
      return;
    }
    const normalize = (value: string): string | undefined => {
      const parts: string[] = [];
      for (const part of value.replaceAll('\\', '/').split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') {
          if (!parts.length) return;
          parts.pop();
        } else parts.push(part);
      }
      return parts.join('/');
    };
    const sourceDirectory = sourcePath.slice(0, sourcePath.lastIndexOf('/'));
    const candidates = [
      normalize(`${sourceDirectory}/${decodedTarget}`),
      normalize(decodedTarget.replace(/^\/+/, '')),
    ].filter((value): value is string => value !== undefined);
    const attachment = publicationIndex.attachments.find((item) => {
      const path = item.sourcePath.replaceAll('\\', '/');
      return (
        candidates.includes(path) ||
        candidates.some((candidate) => path.endsWith(`/static/${candidate}`))
      );
    });
    return attachment?.url;
  };

  for (const match of markdown.matchAll(/<img\b[^>]*\bdata-obsidian-attachment=""[^>]*>/gu)) {
    const start = match.index;
    const element = match[0];
    const srcMatch = element.match(/\bsrc="([^"]*)"/u);
    const url = srcMatch ? attachmentUrl(srcMatch[1]) : undefined;
    const rewritten = element
      .replace(/\sdata-obsidian-attachment=""/gu, '')
      .replace(/\sdata-obsidian-public-attachment=""/gu, '')
      .replace(srcMatch?.[0] ?? '', url ? `src="${url}"` : (srcMatch?.[0] ?? ''));
    edits.push({ start, end: start + element.length, replacement: rewritten });
  }

  visit(markdownParser.parse(markdown), 'image', (image) => {
    const start = image.position?.start.offset;
    const end = image.position?.end.offset;
    if (start === undefined || end === undefined) return;
    const url = attachmentUrl(image.url);
    if (!url) return;
    const span = imageDestinationSpan(markdown.slice(start, end));
    if (!span) return;
    edits.push({
      start: start + span[0],
      end: start + span[1],
      replacement: `<${url}>`,
    });
  });

  return edits
    .sort((left, right) => right.start - left.start)
    .reduce(
      (result, edit) => result.slice(0, edit.start) + edit.replacement + result.slice(edit.end),
      markdown,
    );
};

const loadPublishedContent = (): Promise<GeneratedObsidianContent> => {
  publishedContent ??= read(publishedContentAsset)
    .text()
    .then((source) => JSON.parse(source) as GeneratedObsidianContent);
  return publishedContent;
};

const loadPublishedSource = async (sourcePath: string): Promise<string> => {
  const published = await loadPublishedContent();
  const document = published.documents[sourcePath];
  if (!document || document.diagnostics.length)
    throw new Error(`No valid published content for '${sourcePath}'.`);
  // Machine-readable endpoints retain readable TeX instead of the HTML transport marker.
  return rewritePublishedAttachments(
    document.markdown
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
      ),
    sourcePath,
    published.publicationIndex,
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

  const raw = await loadPublishedSource(route.sourcePath);
  return stripFrontmatter(raw);
}

export async function loadRawCourseReadme(courseSlug: string): Promise<string> {
  const route = getCourseRoute(courseSlug);
  if (!route) {
    throw new Error(`Course route not found for '${courseSlug}'.`);
  }

  const raw = await loadPublishedSource(route.sourcePath);
  return stripFrontmatter(raw);
}

export async function loadRawCourseLesson(courseSlug: string, lessonSlug: string): Promise<string> {
  const route = getLessonRoute(courseSlug, lessonSlug);
  if (!route) {
    throw new Error(`Lesson route not found for '${courseSlug}/${lessonSlug}'.`);
  }

  const raw = await loadPublishedSource(route.sourcePath);
  return stripFrontmatter(raw);
}

export async function loadRawProjectContent(projectSlug: string): Promise<string> {
  const route = getProjectRoute(projectSlug);
  if (!route) {
    throw new Error(`Project route not found for '${projectSlug}'.`);
  }

  const raw = await loadPublishedSource(route.sourcePath);
  return stripFrontmatter(raw);
}
