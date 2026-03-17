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

const computeHash = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex').slice(0, 16);

// Load manifest
let manifest: ImageManifest;
try {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  manifest = JSON.parse(raw) as ImageManifest;
} catch {
  console.error('image-manifest.json not found at repository root.');
  console.error('Run `bun images:sync` and commit the updated manifest.');
  process.exit(1);
}

// Discover all image references
const allImages = await discoverAllImages(MARKDOWN_PATTERNS, REPO_ROOT);

const missing: string[] = [];
const staleHash: string[] = [];

for (const [key, source] of allImages) {
  const entry = manifest.images[key];
  if (!entry) {
    missing.push(key);
    continue;
  }

  // Verify hash matches
  const bytes = await readFile(source.resolvedPath);
  const currentHash = computeHash(bytes);
  if (entry.hash !== currentHash) {
    staleHash.push(`${key} (manifest: ${entry.hash}, actual: ${currentHash})`);
  }
}

if (missing.length > 0 || staleHash.length > 0) {
  if (missing.length > 0) {
    console.error(`\n${missing.length} image(s) missing from manifest:`);
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
  }

  if (staleHash.length > 0) {
    console.error(`\n${staleHash.length} image(s) with stale hashes:`);
    for (const entry of staleHash) {
      console.error(`  - ${entry}`);
    }
  }

  console.error('\nRun `bun images:sync` and commit the updated manifest.');
  process.exit(1);
}

console.log(`Image manifest check passed: ${allImages.size} images verified.`);
