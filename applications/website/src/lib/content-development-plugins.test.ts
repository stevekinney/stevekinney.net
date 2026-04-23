import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { contentDevelopmentPlugins } from '../../plugins/vite/content-development-plugins';

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
    await rm(temporaryDirectory, { recursive: true, force: true });
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
});
