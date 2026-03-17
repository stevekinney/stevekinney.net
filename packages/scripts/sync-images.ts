import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, list, del } from '@vercel/blob';
import sharp from 'sharp';
import { discoverAllImages, type SourceImage } from '@stevekinney/utilities/image-discovery';
import type { ImageManifest, ImageManifestEntry } from '@stevekinney/utilities/image-manifest';
import { writeFormattedJson } from '@stevekinney/utilities/write-formatted-json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST_PATH = path.resolve(REPO_ROOT, 'image-manifest.json');

const MARKDOWN_PATTERNS = ['writing/**/*.md', 'courses/**/*.md'];
const TARGET_WIDTHS = [480, 1024, 1600];
const MAIN_WIDTH = 1600;
const CONCURRENCY = 10;

const RASTERIZABLE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const PASSTHROUGH_IMAGE_EXTENSIONS = new Set(['.svg', '.gif', '.webp', '.avif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogg']);

const VIDEO_MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
};

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const pruneBlobs = args.includes('--prune-blobs');

// ---------------------------------------------------------------------------
// Token check
// ---------------------------------------------------------------------------

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(
    'BLOB_READ_WRITE_TOKEN is not set. Set it in your environment or .env file.\n' +
      'You can create a blob store at https://vercel.com/dashboard/stores and generate a token there.',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const computeHash = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex').slice(0, 16);

const getExtension = (filePath: string): string => path.extname(filePath).toLowerCase();

/** Run an async function with a concurrency limiter. */
const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  let index = 0;

  const next = async (): Promise<void> => {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
};

/** List all blobs under a prefix. Handles pagination. */
const listAllBlobs = async (prefix: string): Promise<Set<string>> => {
  const paths = new Set<string>();
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await list({ prefix, cursor, limit: 1000 });
    for (const blob of response.blobs) {
      paths.add(blob.pathname);
    }
    cursor = response.cursor;
    hasMore = response.hasMore;
  }

  return paths;
};

/** Upload bytes to blob storage if the pathname doesn't already exist. */
const uploadIfMissing = async (
  pathname: string,
  bytes: Buffer,
  contentType: string,
  existingBlobs: Set<string>,
): Promise<string> => {
  if (existingBlobs.has(pathname)) {
    return `https://placeholder-already-exists/${pathname}`;
  }

  if (dryRun) {
    console.log(`  [dry-run] Would upload: ${pathname}`);
    return `https://dry-run/${pathname}`;
  }

  const blob = await put(pathname, bytes, {
    access: 'public',
    addRandomSuffix: false,
    contentType,
  });

  return blob.url;
};

// ---------------------------------------------------------------------------
// Load existing manifest
// ---------------------------------------------------------------------------

const loadExistingManifest = async (): Promise<ImageManifest> => {
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw) as ImageManifest;
  } catch {
    return { version: 1, images: {} };
  }
};

// ---------------------------------------------------------------------------
// Process a single image
// ---------------------------------------------------------------------------

type ProcessResult = {
  key: string;
  entry: ImageManifestEntry;
  uploaded: number;
  skipped: boolean;
};

const processImage = async (
  source: SourceImage,
  existingManifest: ImageManifest,
  existingBlobs: Set<string>,
): Promise<ProcessResult> => {
  const key = source.repoRelativePath;
  const bytes = await readFile(source.resolvedPath);
  const hash = computeHash(bytes);
  const extension = getExtension(source.resolvedPath);

  // Check if manifest entry exists with matching hash
  const existingEntry = existingManifest.images[key];
  if (existingEntry && existingEntry.hash === hash) {
    return { key, entry: existingEntry, uploaded: 0, skipped: true };
  }

  let uploaded = 0;

  // --- Video ---
  if (VIDEO_EXTENSIONS.has(extension)) {
    const pathname = `images/${hash}/original${extension}`;
    const mimeType = VIDEO_MIME_TYPES[extension] ?? 'application/octet-stream';
    const url = await uploadIfMissing(pathname, bytes, mimeType, existingBlobs);
    if (!existingBlobs.has(pathname)) uploaded++;

    return {
      key,
      entry: {
        hash,
        width: 0,
        height: 0,
        original: url,
        avif: [],
        lqip: null,
        videoMimeType: mimeType,
      },
      uploaded,
      skipped: false,
    };
  }

  // --- SVG ---
  if (extension === '.svg') {
    const pathname = `images/${hash}/original.svg`;
    const url = await uploadIfMissing(pathname, bytes, 'image/svg+xml', existingBlobs);
    if (!existingBlobs.has(pathname)) uploaded++;

    // SVG metadata can fail — use 0,0 as fallback
    let width = 0;
    let height = 0;
    try {
      const meta = await sharp(source.resolvedPath).metadata();
      width = meta.width ?? 0;
      height = meta.height ?? 0;
    } catch {
      // SVGs may not have intrinsic dimensions
    }

    return {
      key,
      entry: { hash, width, height, original: url, avif: [], lqip: null, videoMimeType: null },
      uploaded,
      skipped: false,
    };
  }

  // --- GIF / WebP / AVIF (passthrough — upload original, read metadata, no AVIF variants) ---
  if (PASSTHROUGH_IMAGE_EXTENSIONS.has(extension)) {
    const mimeMap: Record<string, string> = {
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
    };
    const contentType = mimeMap[extension] ?? 'application/octet-stream';
    const pathname = `images/${hash}/original${extension}`;
    const url = await uploadIfMissing(pathname, bytes, contentType, existingBlobs);
    if (!existingBlobs.has(pathname)) uploaded++;

    const meta = await sharp(source.resolvedPath).metadata();

    return {
      key,
      entry: {
        hash,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        original: url,
        avif: [],
        lqip: null,
        videoMimeType: null,
      },
      uploaded,
      skipped: false,
    };
  }

  // --- Rasterizable (PNG, JPG, JPEG) ---
  if (RASTERIZABLE_EXTENSIONS.has(extension)) {
    const meta = await sharp(source.resolvedPath).metadata();
    const sourceWidth = meta.width ?? MAIN_WIDTH;
    const sourceHeight = meta.height ?? 0;

    // Upload resized original
    const originalPathname = `images/${hash}/original${extension}`;
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };
    const originalContentType = mimeMap[extension] ?? 'image/png';

    let originalUrl: string;
    if (existingBlobs.has(originalPathname)) {
      originalUrl = await uploadIfMissing(
        originalPathname,
        bytes,
        originalContentType,
        existingBlobs,
      );
    } else {
      const resizedOriginal = await sharp(source.resolvedPath)
        .resize({ width: MAIN_WIDTH, withoutEnlargement: true })
        .toBuffer();

      originalUrl = await uploadIfMissing(
        originalPathname,
        resizedOriginal,
        originalContentType,
        existingBlobs,
      );
      uploaded++;
    }

    // Generate and upload AVIF variants
    const avifVariants: { width: number; url: string }[] = [];
    for (const targetWidth of TARGET_WIDTHS) {
      if (targetWidth > sourceWidth) continue;

      const avifPathname = `images/${hash}/avif-${targetWidth}w.avif`;

      if (existingBlobs.has(avifPathname)) {
        // Already uploaded — we still need the URL though. Since we can't get it from the
        // list API easily and re-uploading with addRandomSuffix: false is idempotent,
        // just re-put to get the URL.
        if (dryRun) {
          avifVariants.push({ width: targetWidth, url: `https://dry-run/${avifPathname}` });
        } else {
          const avifBuffer = await sharp(source.resolvedPath)
            .resize({ width: targetWidth, withoutEnlargement: true })
            .avif({ quality: 60 })
            .toBuffer();
          const blob = await put(avifPathname, avifBuffer, {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'image/avif',
          });
          avifVariants.push({ width: targetWidth, url: blob.url });
        }
      } else {
        const avifBuffer = await sharp(source.resolvedPath)
          .resize({ width: targetWidth, withoutEnlargement: true })
          .avif({ quality: 60 })
          .toBuffer();

        if (dryRun) {
          console.log(`  [dry-run] Would upload: ${avifPathname}`);
          avifVariants.push({ width: targetWidth, url: `https://dry-run/${avifPathname}` });
        } else {
          const blob = await put(avifPathname, avifBuffer, {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'image/avif',
          });
          avifVariants.push({ width: targetWidth, url: blob.url });
        }
        uploaded++;
      }
    }

    // Generate LQIP
    const lqipBuffer = await sharp(source.resolvedPath)
      .resize({ width: 24, withoutEnlargement: true })
      .webp({ quality: 30 })
      .blur(10)
      .toBuffer();
    const lqip = `data:image/webp;base64,${lqipBuffer.toString('base64')}`;

    // Compute effective dimensions (after resize to MAIN_WIDTH)
    const effectiveWidth = Math.min(sourceWidth, MAIN_WIDTH);
    const aspectRatio = sourceHeight / sourceWidth;
    const effectiveHeight = Math.round(effectiveWidth * aspectRatio);

    return {
      key,
      entry: {
        hash,
        width: effectiveWidth,
        height: effectiveHeight,
        original: originalUrl,
        avif: avifVariants,
        lqip,
        videoMimeType: null,
      },
      uploaded,
      skipped: false,
    };
  }

  // Fallback: upload original as-is
  const pathname = `images/${hash}/original${extension}`;
  const url = await uploadIfMissing(pathname, bytes, 'application/octet-stream', existingBlobs);
  if (!existingBlobs.has(pathname)) uploaded++;

  return {
    key,
    entry: {
      hash,
      width: 0,
      height: 0,
      original: url,
      avif: [],
      lqip: null,
      videoMimeType: null,
    },
    uploaded,
    skipped: false,
  };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('Discovering image references...');
const allImages = await discoverAllImages(MARKDOWN_PATTERNS, REPO_ROOT);
console.log(`Found ${allImages.size} unique image references.`);

console.log('Loading existing manifest...');
const existingManifest = await loadExistingManifest();
const existingCount = Object.keys(existingManifest.images).length;
console.log(`Existing manifest has ${existingCount} entries.`);

console.log('Listing existing blobs...');
const existingBlobs = await listAllBlobs('images/');
console.log(`Found ${existingBlobs.size} existing blobs.`);

console.log('Processing images...');
const sources = [...allImages.values()];
const results = await mapWithConcurrency(sources, CONCURRENCY, (source) =>
  processImage(source, existingManifest, existingBlobs),
);

// Build new manifest
const newManifest: ImageManifest = { version: 1, images: {} };
let totalUploaded = 0;
let totalSkipped = 0;
let totalProcessed = 0;

for (const result of results) {
  newManifest.images[result.key] = result.entry;
  totalUploaded += result.uploaded;
  if (result.skipped) totalSkipped++;
  else totalProcessed++;
}

// Prune stale entries
const referencedKeys = new Set(allImages.keys());
const staleKeys: string[] = [];
for (const key of Object.keys(existingManifest.images)) {
  if (!referencedKeys.has(key)) {
    staleKeys.push(key);
  }
}

if (staleKeys.length > 0) {
  console.log(`\nPruning ${staleKeys.length} stale manifest entries:`);
  for (const key of staleKeys) {
    console.log(`  - ${key}`);
  }

  if (pruneBlobs && !dryRun) {
    console.log('Deleting orphaned blobs...');
    for (const key of staleKeys) {
      const entry = existingManifest.images[key];
      if (!entry) continue;

      const urlsToDelete = [entry.original, ...entry.avif.map((v) => v.url)].filter(Boolean);

      for (const url of urlsToDelete) {
        try {
          await del(url);
          console.log(`  Deleted: ${url}`);
        } catch (error) {
          console.warn(`  Failed to delete ${url}: ${error}`);
        }
      }
    }
  } else if (pruneBlobs && dryRun) {
    console.log('[dry-run] Would delete orphaned blobs for stale entries.');
  }
}

// Write manifest
if (dryRun) {
  console.log(
    '\n[dry-run] Would write manifest with',
    Object.keys(newManifest.images).length,
    'entries.',
  );
} else {
  await writeFormattedJson(MANIFEST_PATH, newManifest);
  console.log(`\nWrote manifest with ${Object.keys(newManifest.images).length} entries.`);
}

// Summary
console.log('\n--- Summary ---');
console.log(`  Processed: ${totalProcessed}`);
console.log(`  Uploaded:  ${totalUploaded} blobs`);
console.log(`  Skipped:   ${totalSkipped} (unchanged)`);
console.log(`  Pruned:    ${staleKeys.length} stale entries`);
if (dryRun) console.log('  (dry run — no changes made)');
