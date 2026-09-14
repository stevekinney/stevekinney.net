import { EventEmitter } from 'node:events';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  __testing,
  regenerateGeneratedContent,
} from '../../plugins/vite/regenerate-generated-content';

type BuildTask = 'content' | 'enhancements' | 'playgrounds';

type CommandRecord = { command: string; arguments: readonly string[] };

type FakeChildProcess = EventEmitter & { kill: () => void };

type ServerEventName = 'add' | 'change' | 'unlink';

type FakeServer = {
  config: { logger: { error: (message: string) => void } };
  watcher: EventEmitter & { add: (path: string) => void };
  httpServer: EventEmitter;
  moduleGraph: { invalidateAll: () => void };
  ws: { send: (message: { type: string }) => void };
};

const makeChild = (onKill: () => void): FakeChildProcess => {
  const child = new EventEmitter() as FakeChildProcess;
  child.kill = onKill;
  return child;
};

const waitForTimer = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 5);
  });

const makeServer = (): FakeServer => {
  const watcher = new EventEmitter() as FakeServer['watcher'];
  watcher.add = () => {};

  return {
    config: { logger: { error: () => {} } },
    watcher,
    httpServer: new EventEmitter(),
    moduleGraph: { invalidateAll: () => {} },
    ws: { send: () => {} },
  };
};

const configurePlugin = (
  options: {
    contentDirectory: string;
    contentDependencyPath: string;
    enhancementDirectory: string;
    enhancementDependencyPath: string;
    playgroundDependencyPath: string;
    sharedBuildDependencyPath: string;
    spawnProcess?: (command: string, args: readonly string[]) => FakeChildProcess;
  },
  server: FakeServer,
): void => {
  const plugin = regenerateGeneratedContent({
    contentBuildScriptPath: '/content-build.ts',
    playgroundsBuildScriptPath: '/playgrounds-build.ts',
    contentEnhancementsBuildScriptPath: '/content-enhancements-build.ts',
    workingDirectory: '/',
    contentDirectories: [options.contentDirectory],
    contentDependencyPaths: [options.contentDependencyPath],
    enhancementSourceDirectories: [options.enhancementDirectory],
    enhancementDependencyPaths: [options.enhancementDependencyPath],
    playgroundDependencyPaths: [options.playgroundDependencyPath],
    sharedBuildDependencyPaths: [options.sharedBuildDependencyPath],
    debounceMs: 1,
    ...(options.spawnProcess
      ? {
          spawnProcess:
            options.spawnProcess as unknown as typeof import('node:child_process').spawn,
        }
      : {}),
  }) as unknown as { configureServer: (server: FakeServer) => void };

  plugin.configureServer(server);
};

describe('regenerateGeneratedContent', () => {
  it('classifies source and recipe changes into the smallest affected task sets', () => {
    const root = '/workspace';
    const context = {
      contentRoots: [path.join(root, 'courses')],
      contentDependencies: [
        path.join(root, 'packages/scripts/content-repository'),
        path.join(root, 'packages/utilities/tailwind-playground-metadata.ts'),
      ],
      enhancementRoots: [path.join(root, 'packages/content-enhancements/src')],
      enhancementDependencies: [path.join(root, 'packages/scripts/content-enhancements-build.ts')],
      playgroundDependencies: [
        path.join(root, 'packages/scripts/playgrounds-build.ts'),
        path.join(root, 'packages/scripts/build-dependencies.ts'),
        path.join(root, 'packages/scripts/tailwind-playground.css'),
      ],
      sharedBuildDependencies: [
        path.join(root, 'packages/scripts/build-artifacts.ts'),
        path.join(root, 'bun.lock'),
      ],
    };

    const tasks = (filePath: string): BuildTask[] =>
      __testing.tasksForChangedPath(filePath, context) as BuildTask[];

    expect(tasks(path.join(root, 'courses/tailwind/example.md'))).toEqual([
      'content',
      'playgrounds',
    ]);
    expect(tasks(path.join(root, 'packages/content-enhancements/src/enhance-tables.ts'))).toEqual([
      'enhancements',
    ]);
    expect(tasks(path.join(root, 'packages/scripts/content-enhancements-build.ts'))).toEqual([
      'enhancements',
    ]);
    expect(tasks(path.join(root, 'packages/scripts/tailwind-playground.css'))).toEqual([
      'playgrounds',
    ]);
    expect(tasks(path.join(root, 'packages/scripts/playgrounds-build.ts'))).toEqual([
      'playgrounds',
    ]);
    expect(tasks(path.join(root, 'packages/scripts/build-dependencies.ts'))).toEqual([
      'playgrounds',
    ]);
    expect(tasks(path.join(root, 'packages/scripts/content-repository/markdown.ts'))).toEqual([
      'content',
      'playgrounds',
    ]);
    expect(tasks(path.join(root, 'packages/utilities/tailwind-playground-metadata.ts'))).toEqual([
      'content',
      'playgrounds',
    ]);
    expect(tasks(path.join(root, 'packages/scripts/build-artifacts.ts'))).toEqual([
      'playgrounds',
      'enhancements',
    ]);
    expect(tasks(path.join(root, 'bun.lock'))).toEqual(['playgrounds', 'enhancements']);
  });

  it('removes watcher handlers, clears pending work, and kills the owned child on server close', async () => {
    const server = makeServer();
    const commands: CommandRecord[] = [];
    let killed = false;
    let child: FakeChildProcess | undefined;

    configurePlugin(
      {
        contentDirectory: '/workspace/courses',
        contentDependencyPath: '/workspace/packages/scripts/content-repository',
        enhancementDirectory: '/workspace/packages/content-enhancements/src',
        enhancementDependencyPath: '/workspace/packages/scripts/content-enhancements-build.ts',
        playgroundDependencyPath: '/workspace/packages/scripts/playgrounds-build.ts',
        sharedBuildDependencyPath: '/workspace/packages/scripts/build-artifacts.ts',
        spawnProcess: (command, args) => {
          commands.push({ command, arguments: args });
          child = makeChild(() => {
            killed = true;
          });
          return child;
        },
      },
      server,
    );

    server.watcher.emit('change' satisfies ServerEventName, '/workspace/courses/example.md');
    await waitForTimer();
    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual({ command: 'bun', arguments: ['run', '/content-build.ts'] });

    server.watcher.emit(
      'change' satisfies ServerEventName,
      '/workspace/packages/scripts/build-artifacts.ts',
    );
    server.httpServer.emit('close');
    expect(killed).toBe(true);

    child?.emit('exit', 0);
    server.watcher.emit('change' satisfies ServerEventName, '/workspace/courses/another.md');
    await waitForTimer();

    expect(commands).toHaveLength(1);
    expect(server.watcher.listenerCount('change')).toBe(0);
  });
});
