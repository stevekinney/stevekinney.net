#!/usr/bin/env bun
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BuildReport } from './types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..', '..');
const REPORT_PATH = path.resolve(
  REPOSITORY_ROOT,
  'tmp',
  'build-report',
  'website-build-report.json',
);

// Thresholds are set at ~40% above current actuals so routine changes don't trip them.
// Current actuals: largestClientChunk ~30 kB, mainStylesheet ~176 kB.
const LARGEST_CLIENT_CHUNK_LIMIT = 50_000; // 50 kB uncompressed
const MAIN_STYLESHEET_LIMIT = 250_000; // 250 kB uncompressed

let report: BuildReport;
try {
  const raw = await readFile(REPORT_PATH, 'utf8');
  report = JSON.parse(raw) as BuildReport;
} catch {
  console.error(`Build report not found at ${REPORT_PATH}`);
  console.error('Run `bun run build:report` after a production build.');
  process.exit(1);
}

const violations: string[] = [];

const chunkBytes = report.assets.largestClientChunk?.bytes ?? 0;
if (chunkBytes > LARGEST_CLIENT_CHUNK_LIMIT) {
  violations.push(
    `Largest client JS chunk: ${chunkBytes} bytes exceeds limit of ${LARGEST_CLIENT_CHUNK_LIMIT} bytes` +
      ` (${report.assets.largestClientChunk?.path ?? 'unknown'})`,
  );
}

const cssBytes = report.assets.mainStylesheet?.bytes ?? 0;
if (cssBytes > MAIN_STYLESHEET_LIMIT) {
  violations.push(
    `Main stylesheet: ${cssBytes} bytes exceeds limit of ${MAIN_STYLESHEET_LIMIT} bytes` +
      ` (${report.assets.mainStylesheet?.path ?? 'unknown'})`,
  );
}

if (violations.length > 0) {
  console.error('Build budget exceeded:');
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

console.log(
  `Build budget check passed: JS chunk ${chunkBytes} bytes (<= ${LARGEST_CLIENT_CHUNK_LIMIT}), CSS ${cssBytes} bytes (<= ${MAIN_STYLESHEET_LIMIT}).`,
);
