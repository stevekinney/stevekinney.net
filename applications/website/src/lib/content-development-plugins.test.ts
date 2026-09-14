import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { EventEmitter, once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLAYGROUND_CONTENT_SECURITY_POLICY } from '@stevekinney/utilities/tailwind-playground-policy';
import { contentDevelopmentPlugins } from '../../plugins/vite/content-development-plugins.ts';
import { regenerateGeneratedContent } from '../../plugins/vite/regenerate-generated-content.ts';

type Middleware = (
  request: { url?: string },
  response: {
    setHeader: (name: string, value: number | string) => void;
    end: (content: Buffer) => void;
  },
  next: () => void,
) => void | Promise<void>;

type PluginWithServerHook = {
  name: string;
  configureServer: (server: {
    middlewares: { use: (middleware: Middleware) => void };
    watcher?: { add: (watchedPath: string) => void };
  }) => void;
};

type PluginWithGenerateBundle = {
  name: string;
  generateBundle: () => Promise<void>;
};

const isPluginWithServerHook = (
  candidate: unknown,
  name: string,
): candidate is PluginWithServerHook => {
  if (!candidate || typeof candidate !== 'object') return false;

  const plugin = candidate as { configureServer?: unknown; name?: unknown };
  return plugin.name === name && typeof plugin.configureServer === 'function';
};

const isPluginWithGenerateBundle = (
  candidate: unknown,
  name: string,
): candidate is PluginWithGenerateBundle => {
  if (!candidate || typeof candidate !== 'object') return false;

  const plugin = candidate as { generateBundle?: unknown; name?: unknown };
  return plugin.name === name && typeof plugin.generateBundle === 'function';
};

type PluginOptions = {
  contentDirectory?: string;
  contentDependencyPath?: string;
  enhancementSourceDirectory?: string;
  enhancementDependencyPath?: string;
  playgroundDependencyPath?: string;
  sharedBuildDependencyPath?: string;
  generatedEnhancementsDirectory: string;
  generatedPlaygroundsDirectory: string;
  playgroundManifestPath: string;
};

const makePlugins = (options: PluginOptions): unknown[] =>
  contentDevelopmentPlugins({
    workspaceRoot: '/',
    contentDirectories: options.contentDirectory ? [options.contentDirectory] : [],
    contentAssetPathPrefixes: ['/courses/', '/writing/'],
    enhancementSourceDirectories: options.enhancementSourceDirectory
      ? [options.enhancementSourceDirectory]
      : [],
    contentDependencyPaths: options.contentDependencyPath ? [options.contentDependencyPath] : [],
    enhancementDependencyPaths: options.enhancementDependencyPath
      ? [options.enhancementDependencyPath]
      : [],
    playgroundDependencyPaths: options.playgroundDependencyPath
      ? [options.playgroundDependencyPath]
      : [],
    sharedBuildDependencyPaths: options.sharedBuildDependencyPath
      ? [options.sharedBuildDependencyPath]
      : [],
    contentBuildScriptPath: '/content-build.ts',
    playgroundsBuildScriptPath: '/playgrounds-build.ts',
    contentEnhancementsBuildScriptPath: '/content-enhancements-build.ts',
    contentBuildWorkingDirectory: temporaryDirectory,
    generatedEnhancementsDirectory: options.generatedEnhancementsDirectory,
    generatedEnhancementsUrlPrefix: '/generated/content-enhancements/',
    generatedPlaygroundsDirectory: options.generatedPlaygroundsDirectory,
    playgroundManifestPath: options.playgroundManifestPath,
  }) as unknown[];

const findPlugin = (name: string, options: PluginOptions): PluginWithServerHook => {
  const plugin = makePlugins(options).find((candidate) => isPluginWithServerHook(candidate, name));
  if (!plugin) throw new Error(`Expected to find Vite plugin '${name}'.`);
  return plugin;
};

const findBuildPlugin = (name: string, options: PluginOptions): PluginWithGenerateBundle => {
  const plugin = makePlugins(options).find((candidate) =>
    isPluginWithGenerateBundle(candidate, name),
  );
  if (!plugin) throw new Error(`Expected to find Vite plugin '${name}'.`);
  return plugin;
};

const digest = (content: string): string => createHash('sha256').update(content).digest('hex');

let temporaryDirectory: string;
let generatedEnhancementsDirectory: string;
let generatedPlaygroundsDirectory: string;
let playgroundManifestPath: string;

describe('contentDevelopmentPlugins', () => {
  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'content-development-plugins-'));
    generatedEnhancementsDirectory = path.join(temporaryDirectory, 'content-enhancements');
    generatedPlaygroundsDirectory = path.join(temporaryDirectory, 'playgrounds');
    playgroundManifestPath = path.join(generatedPlaygroundsDirectory, 'manifest.json');
    await mkdir(generatedEnhancementsDirectory, { recursive: true });
    await mkdir(generatedPlaygroundsDirectory, { recursive: true });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  const pluginOptions = (): PluginOptions => ({
    generatedEnhancementsDirectory,
    generatedPlaygroundsDirectory,
    playgroundManifestPath,
  });

  it('registers every selected content, enhancement, playground, and shared dependency path', () => {
    const contentDirectory = path.join(temporaryDirectory, 'courses');
    const contentDependencyPath = path.join(temporaryDirectory, 'content-repository.ts');
    const enhancementSourceDirectory = path.join(temporaryDirectory, 'content-enhancements');
    const enhancementDependencyPath = path.join(
      temporaryDirectory,
      'content-enhancements-build.ts',
    );
    const playgroundDependencyPath = path.join(temporaryDirectory, 'tailwind-playground.css');
    const sharedBuildDependencyPath = path.join(temporaryDirectory, 'build-artifacts.ts');
    const addedPaths: string[] = [];

    findPlugin('watch-content-directories', {
      ...pluginOptions(),
      contentDirectory,
      contentDependencyPath,
      enhancementSourceDirectory,
      enhancementDependencyPath,
      playgroundDependencyPath,
      sharedBuildDependencyPath,
    }).configureServer({
      middlewares: { use: () => {} },
      watcher: { add: (watchedPath: string) => addedPaths.push(watchedPath) },
    });

    expect(addedPaths).toEqual([
      path.join(contentDirectory, '**', '*'),
      contentDependencyPath,
      path.join(enhancementSourceDirectory, '**', '*'),
      enhancementDependencyPath,
      playgroundDependencyPath,
      sharedBuildDependencyPath,
    ]);
  });

  it('refreshes committed history on later rebuilds without changing the parent revision', async () => {
    const git = (argumentsList: string[], date?: string): string =>
      execFileSync('git', argumentsList, {
        cwd: temporaryDirectory,
        encoding: 'utf8',
        env: {
          ...process.env,
          ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}),
        },
      }).trim();
    git(['init', '-q']);
    git(['config', 'user.email', 'tests@example.com']);
    git(['config', 'user.name', 'Tests']);
    const contentDirectory = path.join(temporaryDirectory, 'writing');
    const contentFile = path.join(contentDirectory, 'post.md');
    await mkdir(contentDirectory);
    const frontmatter = '---\ntitle: Post\ndescription: A post.\ndate: 2024-01-01\n---\n';
    await writeFile(contentFile, `${frontmatter}\nOriginal body.\n`);
    git(['add', 'writing']);
    git(['commit', '-qm', 'initial'], '2024-01-01T00:00:00Z');
    const initialRevision = git(['rev-parse', 'HEAD']);
    vi.stubEnv('CONTENT_GIT_REVISION', initialRevision);

    const historyModule = fileURLToPath(
      new URL('../../../../packages/scripts/content-repository/git-history.ts', import.meta.url),
    );
    const resultFile = path.join(temporaryDirectory, 'history.json');
    const buildScript = path.join(temporaryDirectory, 'build-history.ts');
    const playgroundsBuildScript = path.join(temporaryDirectory, 'build-playgrounds.ts');
    await writeFile(
      buildScript,
      [
        `import { collectContentHistory } from ${JSON.stringify(historyModule)};`,
        'const history = await collectContentHistory(process.cwd());',
        `await Bun.write(${JSON.stringify(resultFile)}, JSON.stringify({revision: history.revision, modified: history.modified.get('writing/post.md')}));`,
        'process.exit(0);',
      ].join('\n'),
    );
    await writeFile(playgroundsBuildScript, 'process.exit(0);\n');

    const plugin = regenerateGeneratedContent({
      contentBuildScriptPath: buildScript,
      playgroundsBuildScriptPath: playgroundsBuildScript,
      contentEnhancementsBuildScriptPath: playgroundsBuildScript,
      workingDirectory: temporaryDirectory,
      contentDirectories: [contentDirectory],
      contentDependencyPaths: [],
      enhancementSourceDirectories: [],
      enhancementDependencyPaths: [],
      playgroundDependencyPaths: [],
      sharedBuildDependencyPaths: [],
      debounceMs: 0,
    });
    if (
      !plugin ||
      typeof plugin !== 'object' ||
      !('configureServer' in plugin) ||
      typeof plugin.configureServer !== 'function'
    ) {
      throw new Error('Expected a content regeneration server hook.');
    }
    const watcher = new EventEmitter();
    const events = new EventEmitter();
    Reflect.apply(plugin.configureServer, undefined, [
      {
        watcher,
        moduleGraph: { invalidateAll: () => {} },
        ws: { send: () => events.emit('reload') },
        config: {
          logger: { error: (message: string) => events.emit('error', new Error(message)) },
        },
      },
    ]);
    const rebuild = async (): Promise<{ revision: string; modified: string }> => {
      const completed = once(events, 'reload');
      watcher.emit('change', contentFile);
      await completed;
      return JSON.parse(await readFile(resultFile, 'utf8'));
    };
    expect(await rebuild()).toEqual({
      revision: initialRevision,
      modified: '2024-01-01T00:00:00.000Z',
    });

    await writeFile(contentFile, `${frontmatter}\nUpdated body.\n`);
    git(['add', 'writing']);
    git(['commit', '-qm', 'update body'], '2024-01-02T00:00:00Z');
    expect(await rebuild()).toEqual({
      revision: git(['rev-parse', 'HEAD']),
      modified: '2024-01-02T00:00:00.000Z',
    });
    expect(process.env.CONTENT_GIT_REVISION).toBe(initialRevision);
  });

  it('serves generated CSS enhancement assets during development', async () => {
    await writeFile(path.join(generatedEnhancementsDirectory, 'enhancements.css'), 'body {}\n');

    const middlewares: Middleware[] = [];
    findPlugin('serve-generated-content-enhancements', pluginOptions()).configureServer({
      middlewares: { use: (middleware: Middleware) => middlewares.push(middleware) },
    });

    const headers = new Map<string, number | string>();
    let body = '';
    const middleware = middlewares[0];
    if (!middleware) throw new Error('Expected plugin to register middleware.');

    await middleware(
      { url: '/generated/content-enhancements/enhancements.css' },
      {
        setHeader: (name, value) => headers.set(name, value),
        end: (content) => {
          body = content.toString('utf8');
        },
      },
      () => {
        throw new Error('Expected middleware to serve the generated CSS asset.');
      },
    );

    expect(headers.get('Content-Type')).toBe('text/css; charset=utf-8');
    expect(body).toBe('body {}\n');
  });

  it('serves manifest-listed playground documents with the shared policy', async () => {
    const htmlFile = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.html';
    const html = '<!doctype html>\n';
    await writeFile(path.join(generatedPlaygroundsDirectory, htmlFile), html);
    await writeFile(
      playgroundManifestPath,
      JSON.stringify({
        version: 1,
        examples: [],
        files: { [htmlFile]: digest(html) },
        configurationCount: 1,
      }),
    );

    const middlewares: Middleware[] = [];
    findPlugin('serve-generated-tailwind-playgrounds', pluginOptions()).configureServer({
      middlewares: { use: (middleware: Middleware) => middlewares.push(middleware) },
    });

    const headers = new Map<string, number | string>();
    let body = '';
    const middleware = middlewares[0];
    if (!middleware) throw new Error('Expected plugin to register middleware.');

    await middleware(
      { url: `/generated/playgrounds/${htmlFile}` },
      {
        setHeader: (name, value) => headers.set(name, value),
        end: (content) => {
          body = content.toString('utf8');
        },
      },
      () => {
        throw new Error('Expected middleware to serve the playground document.');
      },
    );

    expect(headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(headers.get('Content-Security-Policy')).toBe(PLAYGROUND_CONTENT_SECURITY_POLICY);
    expect(headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(headers.get('Cache-Control')).toBe('no-cache');
    expect(body).toBe(html);
  });

  it('serves retained dev playground hashes without requiring current manifest membership', async () => {
    const htmlFile = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.html';
    await writeFile(path.join(generatedPlaygroundsDirectory, htmlFile), '<!doctype html>\n');
    await writeFile(
      playgroundManifestPath,
      JSON.stringify({ version: 1, examples: [], files: {}, configurationCount: 0 }),
    );

    const middlewares: Middleware[] = [];
    findPlugin('serve-generated-tailwind-playgrounds', pluginOptions()).configureServer({
      middlewares: { use: (middleware: Middleware) => middlewares.push(middleware) },
    });

    let served = false;
    const middleware = middlewares[0];
    if (!middleware) throw new Error('Expected plugin to register middleware.');

    await middleware(
      { url: `/generated/playgrounds/${htmlFile}` },
      {
        setHeader: () => {},
        end: () => {
          served = true;
        },
      },
      () => {
        throw new Error('Expected retained hash to be served in dev.');
      },
    );

    expect(served).toBe(true);
  });

  it('serves playground CSS without the document sandbox policy', async () => {
    const cssFile = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.css';
    const css = 'body {}\n';
    await writeFile(path.join(generatedPlaygroundsDirectory, cssFile), css);
    await writeFile(
      playgroundManifestPath,
      JSON.stringify({
        version: 1,
        examples: [],
        files: { [cssFile]: digest(css) },
        configurationCount: 1,
      }),
    );

    const middlewares: Middleware[] = [];
    findPlugin('serve-generated-tailwind-playgrounds', pluginOptions()).configureServer({
      middlewares: { use: (middleware: Middleware) => middlewares.push(middleware) },
    });

    const headers = new Map<string, number | string>();
    const middleware = middlewares[0];
    if (!middleware) throw new Error('Expected plugin to register middleware.');

    await middleware(
      { url: `/generated/playgrounds/${cssFile}` },
      { setHeader: (name, value) => headers.set(name, value), end: () => {} },
      () => {
        throw new Error('Expected middleware to serve the playground CSS asset.');
      },
    );

    expect(headers.get('Content-Type')).toBe('text/css; charset=utf-8');
    expect(headers.has('Content-Security-Policy')).toBe(false);
    expect(headers.has('X-Frame-Options')).toBe(false);
    expect(headers.get('Cache-Control')).toBe('no-cache');
  });

  it('emits only manifest-listed playground files whose bytes match their digests', async () => {
    const htmlFile = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.html';
    const cssFile = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.css';
    const html = '<!doctype html>\n';
    const css = 'body {}\n';
    await writeFile(path.join(generatedPlaygroundsDirectory, htmlFile), html);
    await writeFile(path.join(generatedPlaygroundsDirectory, cssFile), css);
    await writeFile(
      playgroundManifestPath,
      JSON.stringify({
        version: 1,
        examples: [],
        files: { [htmlFile]: digest(html), [cssFile]: digest(css) },
        configurationCount: 1,
      }),
    );

    const emitted: Array<{ fileName: string; source: Uint8Array | string }> = [];
    const plugin = findBuildPlugin('emit-generated-tailwind-playgrounds', pluginOptions());
    await plugin.generateBundle.call({
      emitFile: (asset: { fileName: string; source: Uint8Array | string }) => emitted.push(asset),
    });

    expect(emitted.map((asset) => asset.fileName).sort()).toEqual(
      [`generated/playgrounds/${htmlFile}`, `generated/playgrounds/${cssFile}`].sort(),
    );
  });

  it('rejects emitted playground files when the manifest digest is stale', async () => {
    const htmlFile = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.html';
    await writeFile(path.join(generatedPlaygroundsDirectory, htmlFile), '<!doctype html>\n');
    await writeFile(
      playgroundManifestPath,
      JSON.stringify({
        version: 1,
        examples: [],
        files: { [htmlFile]: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
        configurationCount: 1,
      }),
    );

    const plugin = findBuildPlugin('emit-generated-tailwind-playgrounds', pluginOptions());
    await expect(plugin.generateBundle.call({ emitFile: () => undefined })).rejects.toThrow(
      /digest mismatch/,
    );
  });
});
