#!/usr/bin/env bun
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { discoverAllImages } from '@stevekinney/utilities/image-discovery';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');

const MARKDOWN_PATTERNS = ['writing/**/*.md', 'courses/**/*.md'];
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogg']);
const NON_TRANSFORMED_EXTENSIONS = new Set(['.webp', '.avif', '.gif', '.svg']);

type ValidationIssue = {
  file: string;
  message: string;
};

const normalizePath = (value: string): string => value.split(path.sep).join('/');
const toRepositoryPath = (absolutePath: string): string =>
  normalizePath(path.relative(REPOSITORY_ROOT, absolutePath));

const issues: ValidationIssue[] = [];

const { images: imageSources, missing } = await discoverAllImages(
  MARKDOWN_PATTERNS,
  REPOSITORY_ROOT,
);

for (const entry of missing) {
  issues.push({
    file: toRepositoryPath(entry.markdownFile),
    message: `Missing image '${entry.imageUrl}' (${toRepositoryPath(entry.resolvedPath)}).`,
  });
}

let checkedCount = 0;

for (const source of imageSources.values()) {
  const extension = path.extname(source.resolvedPath).toLowerCase();
  if (VIDEO_EXTENSIONS.has(extension)) continue;
  if (NON_TRANSFORMED_EXTENSIONS.has(extension)) continue;

  checkedCount++;

  const fileLabel = toRepositoryPath(source.resolvedPath);

  try {
    await sharp(source.resolvedPath).metadata();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    issues.push({
      file: fileLabel,
      message: `sharp metadata read failed: ${reason}`,
    });
    continue;
  }

  try {
    await sharp(source.resolvedPath)
      .resize({ width: 64, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    await sharp(source.resolvedPath)
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

console.log(
  `Image compatibility validation passed: ${checkedCount} raster images checked, ${imageSources.size - checkedCount} passthrough/video skipped.`,
);
