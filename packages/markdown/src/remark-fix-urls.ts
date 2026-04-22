import { dirname, posix as pathPosix } from 'path';
import { visit } from 'unist-util-visit';
import type { Transformer } from 'unified';
import type { Root, Link, Definition } from 'mdast';
import type { VFile } from 'vfile';

/**
 * Constants for URL processing
 */
const URL_PATTERNS = {
  EXTERNAL_SCHEME: /^[a-zA-Z][a-zA-Z+.-]*:/,
  PROTOCOL_RELATIVE: /^\/\//,
  WINDOWS_DRIVE: /^[a-zA-Z]:[\\/]/,
};

const MARKDOWN_EXTENSIONS = ['.mdx', '.markdown', '.md'];

const DEFAULT_CONTENT_PATHS = ['content'];

const FRONTEND_MASTERS_ORIGIN = 'https://frontendmasters.com';
const FRONTEND_MASTERS_UTM = 'utm_source=kinney&utm_medium=social&code=kinney';

type VFileWithFilename = VFile & { filename?: string };

interface SplitUrl {
  path: string;
  query: string;
  hash: string;
}

interface FileData {
  filename: string;
  cwd: string;
}

interface ContentPathCandidate {
  absoluteRoot: string;
  routeRoot: string;
}

const isWindowsAbsolutePath = (value: string): boolean => /^[a-zA-Z]:\//.test(value);

const isExternalUrl = (url: string): boolean =>
  URL_PATTERNS.PROTOCOL_RELATIVE.test(url) ||
  URL_PATTERNS.EXTERNAL_SCHEME.test(url) ||
  URL_PATTERNS.WINDOWS_DRIVE.test(url);

const normalizePathSeparators = (value: string): string => value.replace(/\\/g, '/');
const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');
const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, '');

const splitUrl = (url: string): SplitUrl => {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const end = Math.min(
    hashIndex === -1 ? url.length : hashIndex,
    queryIndex === -1 ? url.length : queryIndex,
  );
  const path = url.slice(0, end);
  const query =
    queryIndex === -1 ? '' : url.slice(queryIndex, hashIndex === -1 ? url.length : hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);

  return { path, query, hash };
};

const findMarkdownExtension = (pathname: string): string | undefined => {
  const lower = pathname.toLowerCase();
  return MARKDOWN_EXTENSIONS.find((ext) => lower.endsWith(ext));
};

const stripMarkdownExtension = (pathname: string): string => {
  const ext = findMarkdownExtension(pathname);
  return ext ? pathname.slice(0, -ext.length) : pathname;
};

const normalizeRoutePath = (pathname: string): string => {
  let normalized = pathname.replace(/\/(README|_index|index)$/i, '/');
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, '/');
  return normalized;
};

const transformInternalUrl = (url: string, baseUrl: string): string => {
  const { path, query, hash } = splitUrl(url);
  const normalizedPath = trimTrailingSlashes(normalizePathSeparators(path));
  const isAbsolute = normalizedPath.startsWith('/');

  const joined = isAbsolute
    ? pathPosix.normalize(normalizedPath)
    : pathPosix.normalize(pathPosix.join(baseUrl || '/', normalizedPath));

  const withoutExt = stripMarkdownExtension(joined);
  const normalizedRoute = normalizeRoutePath(withoutExt);

  return `${normalizedRoute}${query}${hash}`;
};

const toAbsolutePosix = (value: string, cwd: string = process.cwd()): string => {
  const normalized = normalizePathSeparators(value || '');
  if (!normalized) return '';
  if (normalized.startsWith('//')) return pathPosix.normalize(normalized);
  if (isWindowsAbsolutePath(normalized)) return pathPosix.normalize(normalized);
  if (normalized.startsWith('/')) return pathPosix.normalize(normalized);
  return pathPosix.normalize(pathPosix.join(normalizePathSeparators(cwd), normalized));
};

const getRouteRoot = (contentPath: string): string => {
  const trimmed = trimSlashes(normalizePathSeparators(contentPath));
  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  if (parts.at(-1) === 'content') return '/';
  if (parts.length >= 2 && parts.at(-2) === 'content') return `/${parts.at(-1)}`;
  return `/${parts.at(-1)}`;
};

const getBaseUrl = (fileData: FileData, contentPaths: string[]): string | null => {
  const filePath = toAbsolutePosix(fileData.filename || '', fileData.cwd);
  if (!filePath) return null;

  const candidates: ContentPathCandidate[] = contentPaths
    .flatMap((contentPath) => {
      const normalizedContentPath = normalizePathSeparators(contentPath);
      const trimmedContentPath = trimSlashes(normalizedContentPath);
      const pathVariants = [
        ...new Set([normalizedContentPath, trimmedContentPath].filter(Boolean)),
      ];

      return pathVariants.map((pathVariant) => {
        const absoluteRoot = toAbsolutePosix(pathVariant, fileData.cwd);
        const routeRoot = getRouteRoot(trimmedContentPath || normalizedContentPath);
        return {
          absoluteRoot,
          routeRoot,
        };
      });
    })
    .filter((candidate) => candidate.absoluteRoot)
    .sort((a, b) => b.absoluteRoot.length - a.absoluteRoot.length);

  for (const candidate of candidates) {
    const { absoluteRoot, routeRoot } = candidate;
    if (filePath === absoluteRoot || filePath.startsWith(`${absoluteRoot}/`)) {
      const rel = filePath === absoluteRoot ? '' : filePath.slice(absoluteRoot.length + 1);
      const dir = normalizePathSeparators(dirname(rel));
      if (!dir || dir === '.') return routeRoot;
      const routePrefix = routeRoot === '/' ? '' : routeRoot;
      return `${routePrefix}/${trimSlashes(dir)}`;
    }
  }

  return null;
};

/**
 * Appends UTM tracking parameters to Frontend Masters URLs.
 */
const appendFrontendMastersUtm = (node: Link | Definition): void => {
  const { url } = node;
  if (!url || !url.startsWith(FRONTEND_MASTERS_ORIGIN)) return;
  if (url.includes(FRONTEND_MASTERS_UTM)) return;

  const { path, query, hash } = splitUrl(url);
  const newQuery = query ? `${query}&${FRONTEND_MASTERS_UTM}` : `?${FRONTEND_MASTERS_UTM}`;
  node.url = `${path}${newQuery}${hash}`;
};

/**
 * A remark plugin that rewrites internal markdown links to route paths.
 */
export function fixMarkdownUrls(
  contentPaths: string | string[] = DEFAULT_CONTENT_PATHS,
): Transformer<Root> {
  const normalizedContentPaths = Array.isArray(contentPaths)
    ? contentPaths.filter(Boolean)
    : [contentPaths];

  return function transformer(tree: Root, file: VFile): void {
    const anyFile = file as VFileWithFilename;
    const fileData: FileData = {
      filename: anyFile?.filename ?? anyFile?.path ?? '',
      cwd: anyFile?.cwd ?? process.cwd(),
    };

    visit(tree, 'link', (node) => appendFrontendMastersUtm(node));
    visit(tree, 'definition', (node) => appendFrontendMastersUtm(node));

    if (!fileData.filename) return;

    const baseUrl = getBaseUrl(fileData, normalizedContentPaths);
    if (!baseUrl) return;

    const rewriteUrl = (node: Link | Definition): void => {
      const { url } = node;

      if (!url || isExternalUrl(url)) return;

      const { path } = splitUrl(url);
      if (!path) return;

      const normalizedPath = trimTrailingSlashes(normalizePathSeparators(path));
      if (!normalizedPath) return;
      if (!findMarkdownExtension(normalizedPath)) return;

      node.url = transformInternalUrl(url, baseUrl);
    };

    visit(tree, 'link', (node) => rewriteUrl(node));
    visit(tree, 'definition', (node) => rewriteUrl(node));
  };
}
