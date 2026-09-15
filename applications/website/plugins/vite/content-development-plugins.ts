import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PluginOption } from 'vite';

import {
  PLAYGROUND_URL_PREFIX,
  playgroundResponseHeaders,
} from '@stevekinney/utilities/tailwind-playground-policy';
import type { PlaygroundManifest } from '@stevekinney/utilities/tailwind-playground-types';
import { regenerateGeneratedContent } from './regenerate-generated-content.ts';
import { serveStaticDirectory } from './serve-static-directory.ts';
import { watchContentDirectories } from './watch-content-directories.ts';

const IMAGE_ASSET_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.pdf': 'application/pdf',
};

const GENERATED_ASSET_MIME_TYPES: Record<string, string> = {
  ...IMAGE_ASSET_MIME_TYPES,
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

const PLAYGROUND_ASSET_MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

type ContentDevelopmentPluginsOptions = {
  additionalDependencies?: readonly string[];
  workspaceRoot: string;
  contentDirectories: readonly string[];
  contentAssetPathPrefixes: readonly string[];
  enhancementSourceDirectories: readonly string[];
  contentDependencyPaths: readonly string[];
  enhancementDependencyPaths: readonly string[];
  playgroundDependencyPaths: readonly string[];
  sharedBuildDependencyPaths: readonly string[];
  contentBuildScriptPath: string;
  playgroundsBuildScriptPath: string;
  contentEnhancementsBuildScriptPath: string;
  contentBuildWorkingDirectory: string;
  generatedEnhancementsDirectory: string;
  generatedEnhancementsUrlPrefix: string;
  generatedPlaygroundsDirectory: string;
  playgroundManifestPath: string;
};

const playgroundFilePattern = /^[a-f0-9]{64}\.(?:css|html)$/;
const digestPattern = /^[a-f0-9]{64}$/;

const hashContent = (content: Uint8Array): string =>
  createHash('sha256').update(content).digest('hex');

const assertPublicPlaygroundFile = (filePath: string, digest: string): string => {
  if (!playgroundFilePattern.test(filePath)) {
    throw new Error(`Invalid playground manifest file path: ${filePath}`);
  }
  if (!digestPattern.test(digest)) {
    throw new Error(`Invalid playground manifest digest for ${filePath}`);
  }
  return filePath;
};

const readPlaygroundManifest = (manifestPath: string): PlaygroundManifest =>
  JSON.parse(readFileSync(manifestPath, 'utf8')) as PlaygroundManifest;

const getManifestFiles = (manifestPath: string): Set<string> => {
  try {
    return new Set(
      Object.entries(readPlaygroundManifest(manifestPath).files).map(([filePath, digest]) =>
        assertPublicPlaygroundFile(filePath, digest),
      ),
    );
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return new Set();
    }
    throw error;
  }
};

const playgroundHeaders = (relativeFilePath: string): Record<string, string> => {
  const headers = playgroundResponseHeaders(false);
  if (!relativeFilePath.endsWith('.css')) return headers;

  return {
    'X-Content-Type-Options': headers['X-Content-Type-Options'],
    'Referrer-Policy': headers['Referrer-Policy'],
    'Cache-Control': headers['Cache-Control'],
  };
};

const emitReachablePlaygroundAssets = (
  playgroundManifestPath: string,
  generatedPlaygroundsDirectory: string,
): PluginOption => ({
  name: 'emit-generated-tailwind-playgrounds',
  apply: (_config, environment) => environment.command === 'build' && !environment.isSsrBuild,
  async generateBundle() {
    const manifest = readPlaygroundManifest(playgroundManifestPath);
    const files = Object.entries(manifest.files).map(([filePath, digest]) =>
      assertPublicPlaygroundFile(filePath, digest),
    );

    await Promise.all(
      files.map(async (fileName) => {
        const source = await readFile(path.join(generatedPlaygroundsDirectory, fileName));
        const expectedDigest = manifest.files[fileName];
        if (!expectedDigest || hashContent(source) !== expectedDigest) {
          throw new Error(`Playground asset digest mismatch for ${fileName}.`);
        }
        this.emitFile({
          type: 'asset',
          fileName: `${PLAYGROUND_URL_PREFIX.slice(1)}${fileName}`,
          source,
        });
      }),
    );
  },
});

const createPlaygroundMiddleware = (
  options: ContentDevelopmentPluginsOptions,
  rootDirectory: string,
  allowRetainedHashes: boolean,
) =>
  serveStaticDirectory({
    rootDirectory,
    mimeTypes: PLAYGROUND_ASSET_MIME_TYPES,
    headers: playgroundHeaders,
    matchRequest: (pathname) => {
      if (!pathname.startsWith(PLAYGROUND_URL_PREFIX)) return null;
      const relativeFilePath = pathname.slice(PLAYGROUND_URL_PREFIX.length);
      if (getManifestFiles(options.playgroundManifestPath).has(relativeFilePath))
        return relativeFilePath;
      return allowRetainedHashes && playgroundFilePattern.test(relativeFilePath)
        ? relativeFilePath
        : null;
    },
  });

/** Returns the ordered Vite plugins that keep generated content fresh in dev and reachable in builds. */
export function contentDevelopmentPlugins(
  options: ContentDevelopmentPluginsOptions,
): PluginOption[] {
  return [
    watchContentDirectories([
      ...options.contentDirectories,
      ...(options.additionalDependencies ?? []),
      ...options.contentDependencyPaths,
      ...options.enhancementSourceDirectories,
      ...options.enhancementDependencyPaths,
      ...options.playgroundDependencyPaths,
      ...options.sharedBuildDependencyPaths,
    ]),
    regenerateGeneratedContent({
      contentBuildScriptPath: options.contentBuildScriptPath,
      playgroundsBuildScriptPath: options.playgroundsBuildScriptPath,
      contentEnhancementsBuildScriptPath: options.contentEnhancementsBuildScriptPath,
      workingDirectory: options.contentBuildWorkingDirectory,
      contentDirectories: options.contentDirectories,
      enhancementSourceDirectories: options.enhancementSourceDirectories,
      contentDependencyPaths: options.contentDependencyPaths,
      enhancementDependencyPaths: options.enhancementDependencyPaths,
      playgroundDependencyPaths: options.playgroundDependencyPaths,
      sharedBuildDependencyPaths: options.sharedBuildDependencyPaths,
      additionalDependencies: options.additionalDependencies,
    }),
    emitReachablePlaygroundAssets(
      options.playgroundManifestPath,
      options.generatedPlaygroundsDirectory,
    ),
    {
      name: 'serve-generated-content-enhancements',
      configureServer(server) {
        server.middlewares.use(
          serveStaticDirectory({
            rootDirectory: options.generatedEnhancementsDirectory,
            mimeTypes: GENERATED_ASSET_MIME_TYPES,
            matchRequest: (pathname) =>
              pathname.startsWith(options.generatedEnhancementsUrlPrefix)
                ? pathname.slice(options.generatedEnhancementsUrlPrefix.length)
                : null,
          }),
        );
      },
    },
    {
      name: 'serve-generated-tailwind-playgrounds',
      configureServer(server) {
        server.middlewares.use(
          createPlaygroundMiddleware(options, options.generatedPlaygroundsDirectory, true),
        );
      },
      configurePreviewServer(server) {
        server.middlewares.use(
          createPlaygroundMiddleware(
            options,
            path.resolve(
              options.contentBuildWorkingDirectory,
              '.svelte-kit',
              'output',
              'client',
              'generated',
              'playgrounds',
            ),
            false,
          ),
        );
      },
    },
    {
      name: 'serve-content-assets',
      configureServer(server) {
        server.middlewares.use(
          serveStaticDirectory({
            rootDirectory: options.workspaceRoot,
            mimeTypes: IMAGE_ASSET_MIME_TYPES,
            matchRequest: (pathname) =>
              options.contentAssetPathPrefixes.some((prefix) => pathname.startsWith(prefix))
                ? pathname.slice(1)
                : null,
          }),
        );
      },
    },
  ];
}
