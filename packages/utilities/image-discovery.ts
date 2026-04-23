import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

export type SourceImage = {
  /** Absolute path to the markdown file that references this image */
  markdownFile: string;
  /** The raw URL from the markdown source */
  imageUrl: string;
  /** Absolute path to the resolved image file */
  resolvedPath: string;
  /** Repository-relative path (used as manifest key) */
  repositoryRelativePath: string;
};

export type MissingImage = {
  markdownFile: string;
  imageUrl: string;
  resolvedPath: string;
};

export type DiscoveryResult = {
  images: Map<string, SourceImage>;
  missing: MissingImage[];
};

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogg']);
const ALL_ASSET_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);
const EXTERNAL_PREFIXES = ['http://', 'https://', 'mailto:', 'tel:', 'data:', 'ftp://'];

const normalizePath = (value: string): string => value.split(path.sep).join('/');

export const stripQueryHash = (value: string): string => value.split(/[?#]/)[0] ?? '';

export const isExternalReference = (value: string): boolean => {
  if (!value || value.startsWith('#') || value.startsWith('//')) return true;
  return EXTERNAL_PREFIXES.some((prefix) => value.startsWith(prefix));
};

const safeDecode = (value: string): string => {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
};

/** Collect all image/video URLs from markdown content (both `![](url)` and `<img src="url">`). */
export const collectImageUrls = (markdown: string): string[] => {
  const tree = unified().use(remarkParse).parse(markdown);
  const urls = new Set<string>();

  visit(tree, 'image', (node) => {
    const url = String((node as { url?: string }).url ?? '').trim();
    if (url) urls.add(url);
  });

  visit(tree, 'html', (node) => {
    const raw = String((node as { value?: string }).value ?? '');
    const imgTagPattern = /<img\b[^>]*\bsrc=(['"])(.*?)\1/gi;
    for (const match of raw.matchAll(imgTagPattern)) {
      const url = (match[2] ?? '').trim();
      if (url) urls.add(url);
    }
  });

  return [...urls];
};

/** Resolve a markdown-relative or root-relative image URL to an absolute file path. */
export const resolveImagePath = (
  markdownFile: string,
  imageUrl: string,
  staticRoot: string,
): string => {
  if (imageUrl.startsWith('/')) {
    return path.resolve(staticRoot, imageUrl.slice(1));
  }
  return path.resolve(path.dirname(markdownFile), imageUrl);
};

/**
 * Discover all image and video references across markdown files.
 *
 * Returns a Map keyed by repository-relative path to the resolved asset file.
 * Each value includes the first markdown file that references it and the resolved absolute path.
 */
export const discoverAllImages = async (
  patterns: string[],
  repositoryRoot: string,
  staticRoot?: string,
): Promise<DiscoveryResult> => {
  const resolvedStaticRoot =
    staticRoot ?? path.resolve(repositoryRoot, 'applications/website/static');
  const images = new Map<string, SourceImage>();
  const missing: MissingImage[] = [];

  const markdownFiles = await fg(patterns, {
    cwd: repositoryRoot,
    absolute: true,
    onlyFiles: true,
  });

  for (const markdownFile of markdownFiles) {
    const source = await readFile(markdownFile, 'utf8');
    const { content } = matter(source);
    const urls = collectImageUrls(content);

    for (const rawUrl of urls) {
      if (isExternalReference(rawUrl)) continue;

      const decoded = safeDecode(rawUrl);
      const normalized = stripQueryHash(decoded).trim();
      if (!normalized) continue;

      const extension = path.extname(normalized).toLowerCase();
      if (!ALL_ASSET_EXTENSIONS.has(extension)) continue;

      const resolvedPath = resolveImagePath(markdownFile, normalized, resolvedStaticRoot);

      // Verify the file exists
      try {
        await access(resolvedPath);
      } catch {
        missing.push({ markdownFile, imageUrl: normalized, resolvedPath });
        continue;
      }

      const repositoryRelativePath = normalizePath(path.relative(repositoryRoot, resolvedPath));

      if (!images.has(repositoryRelativePath)) {
        images.set(repositoryRelativePath, {
          markdownFile,
          imageUrl: normalized,
          resolvedPath,
          repositoryRelativePath,
        });
      }
    }
  }

  return { images, missing };
};
