import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import matter from 'gray-matter';
import sharp from 'sharp';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const STATIC_ROOT = path.resolve(REPO_ROOT, 'applications/website/static');

const MARKDOWN_PATTERNS = ['content/writing/**/*.md', 'courses/**/*.md'];
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif']);
const NON_TRANSFORMED_EXTENSIONS = new Set(['.webp', '.avif', '.gif']);
const EXTERNAL_PREFIXES = ['http://', 'https://', 'mailto:', 'tel:', 'data:', 'ftp:'];

type SourceImage = {
  markdownFile: string;
  imageUrl: string;
  resolvedFile: string;
};

type ValidationIssue = {
  file: string;
  message: string;
};

const normalizePath = (value: string): string => value.split(path.sep).join('/');
const toRepoPath = (absolutePath: string): string =>
  normalizePath(path.relative(REPO_ROOT, absolutePath));

const stripQueryHash = (value: string): string => value.split(/[?#]/)[0] ?? '';

const isExternalReference = (value: string): boolean => {
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

const resolveImagePath = (markdownFile: string, imageUrl: string): string => {
  if (imageUrl.startsWith('/')) {
    return path.resolve(STATIC_ROOT, imageUrl.slice(1));
  }

  return path.resolve(path.dirname(markdownFile), imageUrl);
};

const collectImageUrls = (markdown: string): string[] => {
  const tree = unified().use(remarkParse).parse(markdown);
  const imageUrls = new Set<string>();

  visit(tree, 'image', (node) => {
    const url = String((node as { url?: string }).url ?? '').trim();
    if (url) imageUrls.add(url);
  });

  visit(tree, 'html', (node) => {
    const raw = String((node as { value?: string }).value ?? '');
    const imgTagPattern = /<img\b[^>]*\bsrc=(['"])(.*?)\1/gi;

    for (const match of raw.matchAll(imgTagPattern)) {
      const url = (match[2] ?? '').trim();
      if (url) imageUrls.add(url);
    }
  });

  return [...imageUrls];
};

const imageSources = new Map<string, SourceImage>();
const issues: ValidationIssue[] = [];

const markdownFiles = await fg(MARKDOWN_PATTERNS, {
  cwd: REPO_ROOT,
  absolute: true,
  onlyFiles: true,
});

for (const markdownFile of markdownFiles) {
  const source = await readFile(markdownFile, 'utf8');
  const { content } = matter(source);
  const imageUrls = collectImageUrls(content);

  for (const rawUrl of imageUrls) {
    if (isExternalReference(rawUrl)) continue;

    const decoded = safeDecode(rawUrl);
    const normalized = stripQueryHash(decoded).trim();
    if (!normalized) continue;

    const extension = path.extname(normalized).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) continue;

    const resolvedFile = resolveImagePath(markdownFile, normalized);
    const key = normalizePath(resolvedFile);

    if (!imageSources.has(key)) {
      imageSources.set(key, {
        markdownFile,
        imageUrl: normalized,
        resolvedFile,
      });
    }
  }
}

for (const source of imageSources.values()) {
  try {
    await access(source.resolvedFile);
  } catch {
    issues.push({
      file: toRepoPath(source.markdownFile),
      message: `Missing image '${source.imageUrl}' (${toRepoPath(source.resolvedFile)}).`,
    });
    continue;
  }

  const extension = path.extname(source.resolvedFile).toLowerCase();
  const fileLabel = toRepoPath(source.resolvedFile);

  try {
    await sharp(source.resolvedFile).metadata();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    issues.push({
      file: fileLabel,
      message: `sharp metadata read failed: ${reason}`,
    });
    continue;
  }

  if (NON_TRANSFORMED_EXTENSIONS.has(extension)) {
    continue;
  }

  try {
    await sharp(source.resolvedFile)
      .resize({ width: 64, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    await sharp(source.resolvedFile)
      .resize({ width: 64, withoutEnlargement: true })
      .avif({ quality: 50 })
      .toBuffer();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    issues.push({
      file: fileLabel,
      message: `sharp transform probe failed: ${reason}`,
    });
  }
}

if (issues.length > 0) {
  console.error('Image compatibility validation failed:');
  for (const issue of issues) {
    console.error(`- ${issue.file}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(`Image compatibility validation passed for ${imageSources.size} referenced assets.`);
