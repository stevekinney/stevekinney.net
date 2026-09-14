import { execFileSync } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { contentDevelopmentPlugins } from '../../plugins/vite/content-development-plugins';
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
  configureServer: (server: { middlewares: { use: (middleware: Middleware) => void } }) => void;
};

const isPluginWithServerHook = (
  candidate: unknown,
  name: string,
): candidate is PluginWithServerHook => {
  if (!candidate || typeof candidate !== 'object') return false;

  const plugin = candidate as { configureServer?: unknown; name?: unknown };
  return plugin.name === name && typeof plugin.configureServer === 'function';
};

const findPlugin = (name: string, generatedEnhancementsDirectory: string): PluginWithServerHook => {
  const plugin = (
    contentDevelopmentPlugins({
      workspaceRoot: '/',
      contentDirectories: [],
      contentAssetPathPrefixes: ['/courses/', '/writing/'],
      enhancementSourceDirectories: [],
      contentBuildScriptPath: '/content-build.ts',
      contentBuildWorkingDirectory: '/',
      generatedEnhancementsDirectory,
      generatedEnhancementsUrlPrefix: '/generated/content-enhancements/',
    }) as unknown[]
  ).find((candidate) => isPluginWithServerHook(candidate, name));

  if (!plugin) {
    throw new Error(`Expected to find Vite plugin '${name}'.`);
  }

  return plugin;
};

let temporaryDirectory: string;
let generatedEnhancementsDirectory: string;

describe('contentDevelopmentPlugins', () => {
  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'content-development-plugins-'));
    generatedEnhancementsDirectory = path.join(temporaryDirectory, 'content-enhancements');
    await mkdir(generatedEnhancementsDirectory, { recursive: true });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(temporaryDirectory, { recursive: true, force: true });
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
    await writeFile(
      buildScript,
      [
        `import { collectContentHistory } from ${JSON.stringify(historyModule)};`,
        'const history = await collectContentHistory(process.cwd());',
        `await Bun.write(${JSON.stringify(resultFile)}, JSON.stringify({revision: history.revision, modified: history.modified.get('writing/post.md')}));`,
        'process.exit(0);',
      ].join('\n'),
    );
    const plugin = regenerateGeneratedContent({
      contentBuildScriptPath: buildScript,
      workingDirectory: temporaryDirectory,
      contentDirectories: [contentDirectory],
      enhancementSourceDirectories: [],
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
    findPlugin(
      'serve-generated-content-enhancements',
      generatedEnhancementsDirectory,
    ).configureServer({
      middlewares: { use: (middleware: Middleware) => middlewares.push(middleware) },
    });

    const headers = new Map<string, number | string>();
    let body = '';
    const middleware = middlewares[0];
    if (!middleware) {
      throw new Error('Expected plugin to register middleware.');
    }

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

  it('registers content globs and additional files or directories with the watcher', () => {
    const watcher = { add: vi.fn() };
    const plugins = contentDevelopmentPlugins({
      workspaceRoot: '/',
      contentDirectories: ['/workspace/writing'],
      additionalDependencies: [
        '/workspace/image-manifest.json',
        '/workspace/packages/markdown/src',
      ],
      contentAssetPathPrefixes: ['/courses/', '/writing/'],
      enhancementSourceDirectories: [],
      contentBuildScriptPath: '/content-build.ts',
      contentBuildWorkingDirectory: '/',
      generatedEnhancementsDirectory,
      generatedEnhancementsUrlPrefix: '/generated/content-enhancements/',
    });
    const watcherPlugin = plugins[0];
    if (
      !watcherPlugin ||
      typeof watcherPlugin !== 'object' ||
      Array.isArray(watcherPlugin) ||
      !('configureServer' in watcherPlugin) ||
      typeof watcherPlugin.configureServer !== 'function'
    )
      throw new Error('Expected a content watcher plugin.');

    watcherPlugin.configureServer.call({} as never, { watcher } as never);

    expect(watcher.add).toHaveBeenCalledWith('/workspace/writing/**/*.{md,toml}');
    expect(watcher.add).toHaveBeenCalledWith('/workspace/image-manifest.json');
    expect(watcher.add).toHaveBeenCalledWith('/workspace/packages/markdown/src');
  });
});
