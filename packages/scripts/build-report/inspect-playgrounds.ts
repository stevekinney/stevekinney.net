import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { z } from 'zod';

import { generatedContentDirectory, repositoryRoot } from '../content-paths.ts';
import { readCache } from '../build-artifacts.ts';

const manifestSchema = z.object({
  configurationCount: z.number(),
  examples: z.array(z.unknown()),
  files: z.record(z.string(), z.string()),
});
const metricsSchema = z.object({
  compilations: z.number(),
  writes: z.number(),
  durationMilliseconds: z.number(),
});
const benchmarkRunSchema = z.object({
  coldMilliseconds: z.number(),
  warmMilliseconds: z.number(),
  coldCpuMilliseconds: z.number(),
  warmCpuMilliseconds: z.number(),
  tailwindCompilations: z.number(),
  enhancementBundles: z.number(),
  artifactWrites: z.number(),
  warmGeneratedWrites: z.number(),
  warmPlaygroundCompilations: z.number(),
  warmEnhancementBundles: z.number(),
  warmWebsiteBuilds: z.number(),
  websiteCssBytes: z.number(),
  websiteCssGzipBytes: z.number(),
  playgroundCssBytes: z.number(),
  playgroundCssGzipBytes: z.number(),
});
const benchmarkSchema = z.object({
  baseCommit: z.string(),
  replacementRevision: z.string(),
  node: z.string(),
  bun: z.string(),
  procedure: z.string(),
  baseline: benchmarkRunSchema,
  replacement: benchmarkRunSchema,
});

export type PlaygroundReport = {
  documentCount: number;
  configurationCount: number;
  cssBytes: number;
  cssGzipBytes: number;
  lastLocalInvocation: z.infer<typeof metricsSchema> | null;
  benchmark: z.infer<typeof benchmarkSchema> | null;
};

/** Inspect current artifacts; timings are explicitly the last direct local invocation. */
export const inspectPlaygrounds = async (): Promise<PlaygroundReport> => {
  const directory = path.join(generatedContentDirectory, 'playgrounds');
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')),
  );
  let cssBytes = 0;
  let cssGzipBytes = 0;
  for (const filename of Object.keys(manifest.files)) {
    if (!/^[a-f0-9]{64}\.css$/.test(filename)) continue;
    const contents = await readFile(path.join(directory, filename));
    cssBytes += contents.byteLength;
    cssGzipBytes += gzipSync(contents).byteLength;
  }
  const metrics = metricsSchema.safeParse(
    await readCache(path.join(repositoryRoot, 'tmp/build-report/playground-build-metrics.json')),
  );
  const benchmark = benchmarkSchema.safeParse(
    await readCache(path.join(repositoryRoot, 'tmp/build-report/playground-benchmark.json')),
  );
  return {
    documentCount: manifest.examples.length,
    configurationCount: manifest.configurationCount,
    cssBytes,
    cssGzipBytes,
    lastLocalInvocation: metrics.success ? metrics.data : null,
    benchmark: benchmark.success ? benchmark.data : null,
  };
};
