import { access, readFile, realpath } from 'node:fs/promises';
import { tokenizer } from 'acorn';
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

type MissingImage = {
  markdownFile: string;
  imageUrl: string;
  resolvedPath: string;
};

type DiscoveryResult = {
  images: Map<string, SourceImage>;
  missing: MissingImage[];
};

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogv']);
export const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac']);
export const PDF_EXTENSIONS = new Set(['.pdf']);
const ALL_ASSET_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...PDF_EXTENSIONS,
]);
const EXTERNAL_PREFIXES = ['http://', 'https://', 'mailto:', 'tel:', 'data:', 'ftp://'];

const normalizePath = (value: string): string => value.split(path.sep).join('/');

const stripQueryHash = (value: string): string => value.split(/[?#]/)[0] ?? '';

const isExternalReference = (value: string): boolean => {
  if (!value || value.startsWith('#') || value.startsWith('//')) return true;
  return EXTERNAL_PREFIXES.some((prefix) => value.startsWith(prefix));
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Mask Svelte expressions with a JavaScript-aware scan, preserving markup and source offsets. */
const maskSvelteExpressions = (source: string): string => {
  const characters = source.split('');
  const mask = (start: number, end: number): void => {
    for (let index = start; index < end; index++) {
      if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' ';
    }
  };

  for (let index = 0; index < source.length; index++) {
    if (source[index] !== '{' || source[index - 1] === '\\') continue;
    const directive = /^[#/:@][A-Za-z]+\b/u.exec(source.slice(index + 1));
    const expressionStart = index + 1 + (directive?.[0].length ?? 0);
    const tokens = tokenizer(source.slice(expressionStart), {
      ecmaVersion: 'latest',
      allowAwaitOutsideFunction: true,
    });
    let depth = 1;
    try {
      while (depth) {
        const token = tokens.getToken();
        if (token.type.label === 'eof') break;
        if (token.type.label === '{' || token.type.label === '${') depth++;
        if (token.type.label === '}') depth--;
        if (!depth) {
          const end = expressionStart + token.end;
          mask(index, end);
          index = end - 1;
        }
      }
    } catch {
      /* Invalid expressions stay visible; Svelte reports them during compilation. */
    }
  }
  return characters.join('');
};

/** Mask Markdown regions where Obsidian embeds are literal text rather than references. */
const maskProtectedMarkdown = (markdown: string): string => {
  const masked = markdown.split('');
  const mask = (start: number, end: number): void => {
    for (let index = start; index < end; index++) {
      if (masked[index] !== '\n' && masked[index] !== '\r') masked[index] = ' ';
    }
  };

  const tree = unified().use(remarkParse).parse(markdown);
  visit(tree, (node) => {
    if (node.type !== 'code' && node.type !== 'inlineCode' && node.type !== 'html') return;
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) mask(start, end);
  });

  // Obsidian comments can span lines and may contain fenced Markdown. Scan the
  // original source while using the mask to ignore comment markers inside code.
  for (let index = 0; index < markdown.length - 1; index++) {
    if (masked[index] !== '%' || masked[index + 1] !== '%') continue;
    const endMarker = markdown.indexOf('%%', index + 2);
    const end = endMarker === -1 ? markdown.length : endMarker + 2;
    mask(index, end);
    index = end - 1;
  }

  return masked.join('');
};

/** Whether the character at `index` is escaped by an odd run of backslashes. */
const isEscaped = (text: string, index: number): boolean => {
  let backslashes = 0;
  while (text[index - 1 - backslashes] === '\\') backslashes++;
  return backslashes % 2 === 1;
};

/** Collect all image/video URLs from markdown content (both `![](url)` and `<img src="url">`). */
const collectImageUrls = (markdown: string): string[] => {
  const expressionMasked = maskSvelteExpressions(markdown);
  const tree = unified().use(remarkParse).parse(expressionMasked);
  const urls = new Set<string>();

  visit(tree, 'image', (node) => {
    const url = String((node as { url?: string }).url ?? '').trim();
    if (url) urls.add(url);
  });

  visit(tree, 'embed', (node) => {
    const url = String((node as { value?: string }).value ?? '').trim();
    if (url) urls.add(url);
  });

  const visibleMarkdown = maskProtectedMarkdown(expressionMasked);
  for (const match of visibleMarkdown.matchAll(/!\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|[^\]]*)?\]\]/g)) {
    if (isEscaped(visibleMarkdown, match.index + 1)) continue;
    const url = match[1]?.trim();
    if (url) urls.add(url);
  }

  // Plain wiki links to supported attachments (`[[assets/manual.pdf|Manual]]`) must be published too.
  for (const match of visibleMarkdown.matchAll(
    /(?<!!)\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|[^\]]*)?\]\]/g,
  )) {
    if (isEscaped(visibleMarkdown, match.index)) continue;
    const url = match[1]?.trim();
    if (url && ALL_ASSET_EXTENSIONS.has(path.extname(url).toLowerCase())) urls.add(url);
  }

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
const resolveImagePath = (markdownFile: string, imageUrl: string, staticRoot: string): string => {
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

      // Strip the query and fragment first so encoded reserved characters such as %23 survive.
      const normalized = safeDecode(stripQueryHash(rawUrl)).trim();
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

      // Never publish files outside the repository, including through symlinks.
      const [realRoot, realResolved] = await Promise.all([
        realpath(repositoryRoot),
        realpath(resolvedPath),
      ]);
      const relativeToRoot = path.relative(realRoot, realResolved);
      if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
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
