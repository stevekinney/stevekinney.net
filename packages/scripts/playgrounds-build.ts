#!/usr/bin/env bun
import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { z } from 'zod';

import {
  PLAYGROUND_URL_PREFIX,
  playgroundResponseHeaders,
} from '@stevekinney/utilities/tailwind-playground-policy';
import type {
  PlaygroundDefinition,
  PlaygroundManifest,
} from '@stevekinney/utilities/tailwind-playground-types';
import { hashArtifact, readCache, verifyArtifact, writeArtifact } from './build-artifacts.ts';
import { compilerDependencyFingerprint } from './build-dependencies.ts';
import { generatedContentDirectory, repositoryRoot } from './content-paths.ts';
import { renderPlaygroundDocument } from './playground-document.ts';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const cacheEntrySchema = z.object({
  filename: z.string().regex(/^[a-f0-9]{64}\.css$/),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
});
const definitionSchema = z.object({
  sourcePath: z.string(),
  ordinal: z.number().int().nonnegative(),
  line: z.number().int().positive(),
  sourceFingerprint: z.string(),
  html: z.string(),
  htmlAttributes: z.record(z.string(), z.string()),
  bodyAttributes: z.record(z.string(), z.string()),
  candidates: z.array(z.string()),
  height: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  theme: z.enum(['light', 'dark', 'system']),
  title: z.string(),
  css: z.string(),
  cssName: z.string().optional(),
  cssAnchor: z.string().optional(),
});

export type PlaygroundBuildMetrics = {
  compilations: number;
  writes: number;
  configurationCount: number;
  documentCount: number;
  cssBytes: number;
  cssGzipBytes: number;
  durationMilliseconds: number;
};

type BuildOptions = {
  outputDirectory: string;
  cacheDirectory: string;
  baseStylesheetPath?: string;
  retainPreviousAssets?: boolean;
};

/** Compile only changed configurations, then publish a complete manifest last. */
export const buildPlaygrounds = async (
  examples: PlaygroundDefinition[],
  options: BuildOptions,
): Promise<{ manifest: PlaygroundManifest; metrics: PlaygroundBuildMetrics }> => {
  const started = performance.now();
  const baseStylesheetPath =
    options.baseStylesheetPath ?? path.join(scriptsDirectory, 'tailwind-playground.css');
  const compiler = compilerDependencyFingerprint();
  const nodeVersion = Bun.spawnSync(['node', '--version']);
  if (nodeVersion.exitCode !== 0)
    throw new Error('Node is required to run the pinned Tailwind CLI.');
  const recipeFiles = ['playgrounds-build.ts', 'build-dependencies.ts', 'build-artifacts.ts'];
  const recipe = hashArtifact(
    JSON.stringify({
      files: await Promise.all(
        recipeFiles.map((filename) => readFile(path.join(scriptsDirectory, filename), 'utf8')),
      ),
      base: await readFile(baseStylesheetPath, 'utf8'),
      compiler: compiler.fingerprint,
      bun: Bun.version,
      node: nodeVersion.stdout.toString().trim(),
      platform: process.platform,
      architecture: process.arch,
    }),
  );
  const metrics: PlaygroundBuildMetrics = {
    compilations: 0,
    writes: 0,
    configurationCount: 0,
    documentCount: examples.length,
    cssBytes: 0,
    cssGzipBytes: 0,
    durationMilliseconds: 0,
  };
  const groups = new Map<string, { css: string; candidates: Set<string> }>();
  for (const example of examples) {
    const key = hashArtifact(example.css);
    let group = groups.get(key);
    if (!group) {
      group = { css: example.css, candidates: new Set() };
      groups.set(key, group);
    }
    for (const candidate of example.candidates) group.candidates.add(candidate);
  }
  const stylesheets = new Map<string, string>();
  const files: Record<string, string> = {};
  for (const [configuration, group] of [...groups.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const candidates = [...group.candidates].sort().join('\n');
    const key = hashArtifact(JSON.stringify({ recipe, css: group.css, candidates }));
    const cachePath = path.join(options.cacheDirectory, `${key}.json`);
    const cached = cacheEntrySchema.safeParse(await readCache(cachePath));
    let filename: string;
    let digest: string;
    if (
      cached.success &&
      (await verifyArtifact(
        path.join(options.outputDirectory, cached.data.filename),
        cached.data.digest,
      ))
    ) {
      ({ filename, digest } = cached.data);
    } else {
      const workingDirectory = path.join(options.cacheDirectory, key);
      const inputPath = path.join(workingDirectory, 'input.css');
      const outputPath = path.join(workingDirectory, 'output.css');
      const relativeBase = path
        .relative(workingDirectory, baseStylesheetPath)
        .split(path.sep)
        .join('/');
      await writeArtifact(path.join(workingDirectory, 'candidates.txt'), `${candidates}\n`);
      await writeArtifact(
        inputPath,
        `@import ${JSON.stringify(relativeBase)};\n@source "./candidates.txt";\n${group.css}\n`,
      );
      const child = Bun.spawn(
        ['node', compiler.cliPath, '-i', inputPath, '-o', outputPath, '--minify'],
        {
          cwd: scriptsDirectory,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      );
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      if (exitCode !== 0)
        throw new Error(`Tailwind configuration ${configuration} failed:\n${stdout}${stderr}`);
      const css = await readFile(outputPath);
      digest = hashArtifact(css);
      filename = `${digest}.css`;
      metrics.compilations += 1;
      if (await writeArtifact(path.join(options.outputDirectory, filename), css))
        metrics.writes += 1;
      await writeArtifact(cachePath, `${JSON.stringify({ filename, digest })}\n`);
    }
    stylesheets.set(configuration, filename);
    files[filename] = digest;
  }
  const manifest: PlaygroundManifest = {
    version: 1,
    examples: [],
    files: {},
    configurationCount: groups.size,
  };
  for (const example of examples) {
    const stylesheet = stylesheets.get(hashArtifact(example.css));
    if (!stylesheet)
      throw new Error(`Missing compiled stylesheet for ${example.sourcePath}:${example.line}`);
    const cssSrc = `${PLAYGROUND_URL_PREFIX}${stylesheet}`;
    const html = renderPlaygroundDocument(example, cssSrc);
    const digest = hashArtifact(html);
    const identity = hashArtifact(`${JSON.stringify(playgroundResponseHeaders(true))}\0${html}`);
    const filename = `${identity}.html`;
    if (await writeArtifact(path.join(options.outputDirectory, filename), html))
      metrics.writes += 1;
    files[filename] = digest;
    manifest.examples.push({
      sourcePath: example.sourcePath,
      ordinal: example.ordinal,
      sourceFingerprint: example.sourceFingerprint,
      height: example.height,
      theme: example.theme,
      title: example.title,
      ...(example.cssAnchor ? { cssAnchor: example.cssAnchor } : {}),
      src: `${PLAYGROUND_URL_PREFIX}${filename}`,
      cssSrc,
    });
  }
  manifest.examples.sort(
    (left, right) =>
      left.sourcePath.localeCompare(right.sourcePath) || left.ordinal - right.ordinal,
  );
  manifest.files = Object.fromEntries(
    Object.entries(files).sort(([left], [right]) => left.localeCompare(right)),
  );
  if (
    await writeArtifact(
      path.join(options.outputDirectory, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    )
  )
    metrics.writes += 1;
  if (!options.retainPreviousAssets) {
    for (const filename of await readdir(options.outputDirectory)) {
      if (/^[a-f0-9]{64}\.(html|css)$/.test(filename) && !(filename in manifest.files)) {
        await rm(path.join(options.outputDirectory, filename));
      }
    }
  }
  for (const filename of Object.keys(manifest.files).filter((filename) =>
    filename.endsWith('.css'),
  )) {
    const bytes = await readFile(path.join(options.outputDirectory, filename));
    metrics.cssBytes += bytes.byteLength;
    metrics.cssGzipBytes += gzipSync(bytes).byteLength;
  }
  metrics.configurationCount = groups.size;
  metrics.durationMilliseconds = performance.now() - started;
  return { manifest, metrics };
};

if (import.meta.main) {
  const inputPath = path.join(generatedContentDirectory, 'playground-inputs.json');
  const input = z
    .object({ version: z.literal(1), examples: z.array(definitionSchema) })
    .parse(JSON.parse(await readFile(inputPath, 'utf8')));
  const { metrics } = await buildPlaygrounds(input.examples, {
    outputDirectory: path.join(generatedContentDirectory, 'playgrounds'),
    cacheDirectory: path.join(generatedContentDirectory, 'playground-cache'),
    retainPreviousAssets: process.argv.includes('--development'),
  });
  await writeArtifact(
    path.join(repositoryRoot, 'tmp', 'build-report', 'playground-build-metrics.json'),
    `${JSON.stringify(metrics, null, 2)}\n`,
  );
  console.log(
    `Playgrounds: ${metrics.documentCount} examples, ${metrics.configurationCount} configurations, ${metrics.compilations} compilations, ${metrics.writes} artifact writes (${Math.round(metrics.durationMilliseconds)}ms).`,
  );
}
