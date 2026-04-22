#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverAllImages } from '@stevekinney/utilities/image-discovery';
import type { ImageManifest } from '@stevekinney/utilities/image-manifest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST_PATH = path.resolve(REPO_ROOT, 'image-manifest.json');

const MARKDOWN_PATTERNS = ['writing/**/*.md', 'courses/**/*.md'];

const normalizePath = (value: string): string => value.split(path.sep).join('/');
const toRepoPath = (absolutePath: string): string =>
  normalizePath(path.relative(REPO_ROOT, absolutePath));

const computeHash = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex').slice(0, 16);

// Load manifest
let manifest: ImageManifest;
try {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  manifest = JSON.parse(raw) as ImageManifest;
} catch {
  console.error('image-manifest.json not found at repository root.');
  console.error('Run `bun run images:sync` and commit the updated manifest.');
  process.exit(1);
}

// Discover all image references
const { images: allImages, missing: missingFiles } = await discoverAllImages(
  MARKDOWN_PATTERNS,
  REPO_ROOT,
);

const notOnDisk: string[] = [];
const notInManifest: string[] = [];
const staleHash: string[] = [];

// Files referenced in markdown but not found on disk
for (const entry of missingFiles) {
  notOnDisk.push(
    `${toRepoPath(entry.resolvedPath)} (referenced from ${toRepoPath(entry.markdownFile)})`,
  );
}

// Files on disk but not in manifest, or with stale hashes
for (const [key, source] of allImages) {
  const entry = manifest.images[key];
  if (!entry) {
    notInManifest.push(key);
    continue;
  }

  const bytes = await readFile(source.resolvedPath);
  const currentHash = computeHash(bytes);
  if (entry.hash !== currentHash) {
    staleHash.push(`${key} (manifest: ${entry.hash}, actual: ${currentHash})`);
  }
}

const hasErrors = notOnDisk.length > 0 || notInManifest.length > 0 || staleHash.length > 0;

if (hasErrors) {
  if (notOnDisk.length > 0) {
    console.error(`\n${notOnDisk.length} image(s) not found on disk:`);
    for (const entry of notOnDisk) {
      console.error(`  - ${entry}`);
    }
  }

  if (notInManifest.length > 0) {
    console.error(`\n${notInManifest.length} image(s) not in manifest:`);
    for (const key of notInManifest) {
      console.error(`  - ${key}`);
    }
  }

  if (staleHash.length > 0) {
    console.error(`\n${staleHash.length} image(s) with stale hashes:`);
    for (const entry of staleHash) {
      console.error(`  - ${entry}`);
    }
  }

  console.error('\nRun `bun run images:sync` and commit the updated manifest.');
  process.exit(1);
}

console.log(`Image manifest check passed: ${allImages.size} images verified.`);
