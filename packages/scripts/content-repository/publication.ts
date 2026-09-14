import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

import type { PublicationIndex, PublicationAttachment } from '@stevekinney/markdown/obsidian-types';
import type { ContentRoute } from '@stevekinney/utilities/content-types';
import { repositoryRoot, websiteStaticRoot } from '../content-paths.ts';
import type { ContentValidationIssue, MarkdownSource } from './types.ts';

const mimeTypes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.pdf': 'application/pdf',
};

/** Normalize Obsidian list properties without changing publication eligibility. */
export const normalizeListProperty = (
  source: MarkdownSource,
  field: 'aliases' | 'tags',
  issues: ContentValidationIssue[],
): string[] => {
  const value: unknown = source.data[field];
  if (value == null) return [];
  const values =
    typeof value === 'string' ? (field === 'tags' ? value.split(/[\s,]+/) : [value]) : value;
  if (!Array.isArray(values) || values.some((item) => typeof item !== 'string' || !item.trim())) {
    issues.push({
      file: source.sourcePath,
      message: `Property '${field}' must contain non-empty strings.`,
    });
    return [];
  }
  return [...new Set(values.map((item: string) => item.trim()))];
};

const inside = (root: string, filename: string): boolean => {
  const relative = path.relative(root, filename);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
};

/** Build a closed reference index from collected routes and already-published assets. */
export const buildPublicationIndex = async (
  sources: readonly MarkdownSource[],
  routes: Record<string, ContentRoute>,
  issues: ContentValidationIssue[],
): Promise<PublicationIndex> => {
  const sourceRoutes = new Map(
    Object.values(routes).map((route) => [route.sourcePath, route.path]),
  );
  const attachments: PublicationAttachment[] = [];
  const manifest: unknown = JSON.parse(
    await readFile(path.join(repositoryRoot, 'image-manifest.json'), 'utf8'),
  );
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !('images' in manifest) ||
    !manifest.images ||
    typeof manifest.images !== 'object'
  ) {
    throw new Error('Invalid image manifest while collecting published attachments.');
  }
  const repositoryRealPath = await realpath(repositoryRoot);
  for (const [sourcePath, entry] of Object.entries(manifest.images)) {
    const mimeType = mimeTypes[path.extname(sourcePath).toLowerCase()];
    if (
      !mimeType ||
      !entry ||
      typeof entry !== 'object' ||
      !('original' in entry) ||
      typeof entry.original !== 'string'
    )
      continue;
    const filename = path.resolve(repositoryRoot, sourcePath);
    if (!inside(repositoryRoot, filename))
      throw new Error(`Manifest attachment escapes repository: ${sourcePath}`);
    try {
      if (!inside(repositoryRealPath, await realpath(filename)))
        throw new Error(`Manifest attachment escapes repository: ${sourcePath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    attachments.push({ sourcePath, url: entry.original, mimeType });
  }
  const staticRealPath = await realpath(websiteStaticRoot);
  for (const filename of (
    await fg('**/*', { cwd: websiteStaticRoot, onlyFiles: true, absolute: true })
  ).sort()) {
    const mimeType = mimeTypes[path.extname(filename).toLowerCase()];
    if (!mimeType) continue;
    if (!inside(staticRealPath, await realpath(filename)))
      throw new Error(`Static attachment escapes published root: ${filename}`);
    const sourcePath = path.relative(repositoryRoot, filename).split(path.sep).join('/');
    if (attachments.some((attachment) => attachment.sourcePath === sourcePath)) continue;
    attachments.push({
      sourcePath,
      url: `/${path.relative(websiteStaticRoot, filename).split(path.sep).map(encodeURIComponent).join('/')}`,
      mimeType,
    });
  }
  return {
    documents: sources.flatMap((source) => {
      const route = sourceRoutes.get(source.sourcePath);
      return route
        ? [
            {
              sourcePath: source.sourcePath,
              route,
              source: source.rawSource,
              aliases: normalizeListProperty(source, 'aliases', issues),
            },
          ]
        : [];
    }),
    attachments,
  };
};
