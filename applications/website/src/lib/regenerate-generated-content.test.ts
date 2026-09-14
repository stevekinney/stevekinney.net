import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
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

type RegenerateGeneratedContentPlugin = {
  configureServer: (server: FakeServer) => void;
  hotUpdate: {
    handler: (context: { file: string }) => [] | undefined;
    order: 'pre';
  };
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

const waitForDebounce = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 60);
  });

const makeServer = (events: string[] = []): FakeServer => {
  const watcher = new EventEmitter() as FakeServer['watcher'];
  watcher.add = () => {};

  return {
    config: { logger: { error: () => {} } },
    watcher,
    httpServer: new EventEmitter(),
    moduleGraph: { invalidateAll: () => events.push('invalidate') },
    ws: { send: () => events.push('reload') },
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
    debounceMs?: number;
    spawnProcess?: (command: string, args: readonly string[]) => FakeChildProcess;
  },
  server: FakeServer,
): RegenerateGeneratedContentPlugin => {
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
    debounceMs: options.debounceMs ?? 1,
    ...(options.spawnProcess
      ? {
          spawnProcess:
            options.spawnProcess as unknown as typeof import('node:child_process').spawn,
        }
      : {}),
  }) as unknown as RegenerateGeneratedContentPlugin;

  plugin.configureServer(server);
  return plugin;
};

describe('regenerateGeneratedContent', () => {
  it('suppresses Vite hot updates for changes owned by generated content rebuilds', () => {
    const server = makeServer();
    const plugin = configurePlugin(
      {
        contentDirectory: '/workspace/courses',
        contentDependencyPath: '/workspace/packages/scripts/content-repository',
        enhancementDirectory: '/workspace/packages/content-enhancements/src',
        enhancementDependencyPath: '/workspace/packages/scripts/content-enhancements-build.ts',
        playgroundDependencyPath: '/workspace/packages/scripts/playgrounds-build.ts',
        sharedBuildDependencyPath: '/workspace/packages/scripts/build-artifacts.ts',
      },
      server,
    );

    expect(plugin.hotUpdate.order).toBe('pre');
    expect(plugin.hotUpdate.handler({ file: '/workspace/courses/tailwind/example.md' })).toEqual(
      [],
    );
    expect(
      plugin.hotUpdate.handler({
        file: '/workspace/packages/scripts/content-repository/markdown.ts',
      }),
    ).toEqual([]);
    expect(
      plugin.hotUpdate.handler({
        file: '/workspace/packages/content-enhancements/src/enhance-tables.ts',
      }),
    ).toEqual([]);
    expect(plugin.hotUpdate.handler({ file: '/workspace/app/src/routes/+page.svelte' })).toBe(
      undefined,
    );
  });

  it('waits for pending and debounced rebuilds before reloading the browser', async () => {
    const events: string[] = [];
    const server = makeServer(events);
    const children: FakeChildProcess[] = [];

    configurePlugin(
      {
        contentDirectory: '/workspace/courses',
        contentDependencyPath: '/workspace/packages/scripts/content-repository',
        enhancementDirectory: '/workspace/packages/content-enhancements/src',
        enhancementDependencyPath: '/workspace/packages/scripts/content-enhancements-build.ts',
        playgroundDependencyPath: '/workspace/packages/scripts/playgrounds-build.ts',
        sharedBuildDependencyPath: '/workspace/packages/scripts/build-artifacts.ts',
        spawnProcess: (_command, args) => {
          events.push(args[1] ?? 'missing-script');
          const child = makeChild(() => {});
          children.push(child);
          return child;
        },
      },
      server,
    );

    server.watcher.emit('change' satisfies ServerEventName, '/workspace/courses/example.md');
    await waitForTimer();
    expect(events).toEqual(['/content-build.ts']);

    server.watcher.emit(
      'change' satisfies ServerEventName,
      '/workspace/packages/content-enhancements/src/enhance-tables.ts',
    );
    children[0]?.emit('exit', 0);
    await waitForTimer();

    expect(events).toEqual(['/content-build.ts', '/playgrounds-build.ts']);

    children[1]?.emit('exit', 0);
    expect(events).toEqual([
      '/content-build.ts',
      '/playgrounds-build.ts',
      '/content-enhancements-build.ts',
    ]);

    children[2]?.emit('exit', 0);
    expect(events).toEqual([
      '/content-build.ts',
      '/playgrounds-build.ts',
      '/content-enhancements-build.ts',
      'invalidate',
      'reload',
    ]);
  });

  it('drains still-debounced rebuilds before reloading the browser', async () => {
    const events: string[] = [];
    const server = makeServer(events);
    const children: FakeChildProcess[] = [];

    configurePlugin(
      {
        contentDirectory: '/workspace/courses',
        contentDependencyPath: '/workspace/packages/scripts/content-repository',
        debounceMs: 50,
        enhancementDirectory: '/workspace/packages/content-enhancements/src',
        enhancementDependencyPath: '/workspace/packages/scripts/content-enhancements-build.ts',
        playgroundDependencyPath: '/workspace/packages/scripts/playgrounds-build.ts',
        sharedBuildDependencyPath: '/workspace/packages/scripts/build-artifacts.ts',
        spawnProcess: (_command, args) => {
          events.push(args[1] ?? 'missing-script');
          const child = makeChild(() => {});
          children.push(child);
          return child;
        },
      },
      server,
    );

    server.watcher.emit('change' satisfies ServerEventName, '/workspace/courses/example.md');
    await waitForDebounce();
    expect(events).toEqual(['/content-build.ts']);

    server.watcher.emit(
      'change' satisfies ServerEventName,
      '/workspace/packages/content-enhancements/src/enhance-tables.ts',
    );

    children[0]?.emit('exit', 0);
    children[1]?.emit('exit', 0);

    expect(events).toEqual([
      '/content-build.ts',
      '/playgrounds-build.ts',
      '/content-enhancements-build.ts',
    ]);

    children[2]?.emit('exit', 0);
    expect(events).toEqual([
      '/content-build.ts',
      '/playgrounds-build.ts',
      '/content-enhancements-build.ts',
      'invalidate',
      'reload',
    ]);
  });

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
      'content',
      'playgrounds',
      'enhancements',
    ]);
    expect(tasks(path.join(root, 'bun.lock'))).toEqual(['content', 'playgrounds', 'enhancements']);
  });

  it('does not reload stale content after a failed prerequisite and queued enhancement', async () => {
    const events: string[] = [];
    const server = makeServer(events);
    const children: FakeChildProcess[] = [];

    configurePlugin(
      {
        contentDirectory: '/workspace/courses',
        contentDependencyPath: '/workspace/packages/scripts/content-repository',
        enhancementDirectory: '/workspace/packages/content-enhancements/src',
        enhancementDependencyPath: '/workspace/packages/scripts/content-enhancements-build.ts',
        playgroundDependencyPath: '/workspace/packages/scripts/playgrounds-build.ts',
        sharedBuildDependencyPath: '/workspace/packages/scripts/build-artifacts.ts',
        spawnProcess: (_command, args) => {
          events.push(args[1] ?? 'missing-script');
          const child = makeChild(() => {});
          children.push(child);
          return child;
        },
      },
      server,
    );

    server.watcher.emit('change' satisfies ServerEventName, '/workspace/courses/example.md');
    await waitForTimer();
    expect(events).toEqual(['/content-build.ts']);

    server.watcher.emit(
      'change' satisfies ServerEventName,
      '/workspace/packages/content-enhancements/src/enhance-tables.ts',
    );
    await waitForTimer();
    children[0]?.emit('exit', 1);
    expect(events).toEqual(['/content-build.ts', '/content-enhancements-build.ts']);

    children[1]?.emit('exit', 0);
    expect(events).toEqual(['/content-build.ts', '/content-enhancements-build.ts']);

    server.watcher.emit('change' satisfies ServerEventName, '/workspace/courses/example.md');
    await waitForTimer();
    expect(events).toEqual([
      '/content-build.ts',
      '/content-enhancements-build.ts',
      '/content-build.ts',
    ]);

    children[2]?.emit('exit', 0);
    expect(events).toEqual([
      '/content-build.ts',
      '/content-enhancements-build.ts',
      '/content-build.ts',
      '/playgrounds-build.ts',
    ]);

    children[3]?.emit('exit', 0);
    expect(events).toEqual([
      '/content-build.ts',
      '/content-enhancements-build.ts',
      '/content-build.ts',
      '/playgrounds-build.ts',
      'invalidate',
      'reload',
    ]);
  });

  it('retains skipped tasks until every stale output has successfully rebuilt', async () => {
    const events: string[] = [];
    const server = makeServer(events);
    const children: FakeChildProcess[] = [];

    configurePlugin(
      {
        contentDirectory: '/workspace/courses',
        contentDependencyPath: '/workspace/packages/scripts/content-repository',
        enhancementDirectory: '/workspace/packages/content-enhancements/src',
        enhancementDependencyPath: '/workspace/packages/scripts/content-enhancements-build.ts',
        playgroundDependencyPath: '/workspace/packages/scripts/playgrounds-build.ts',
        sharedBuildDependencyPath: '/workspace/packages/scripts/build-artifacts.ts',
        spawnProcess: (_command, args) => {
          events.push(args[1] ?? 'missing-script');
          const child = makeChild(() => {});
          children.push(child);
          return child;
        },
      },
      server,
    );

    server.watcher.emit('change', '/workspace/packages/scripts/build-artifacts.ts');
    await waitForTimer();
    children[0]?.emit('exit', 1);

    server.watcher.emit('change', '/workspace/courses/example.md');
    await waitForTimer();
    children[1]?.emit('exit', 0);
    children[2]?.emit('exit', 0);
    expect(events).toEqual(['/content-build.ts', '/content-build.ts', '/playgrounds-build.ts']);

    server.watcher.emit('change', '/workspace/packages/content-enhancements/src/enhance-tables.ts');
    await waitForTimer();
    children[3]?.emit('exit', 0);
    expect(events).toEqual([
      '/content-build.ts',
      '/content-build.ts',
      '/playgrounds-build.ts',
      '/content-enhancements-build.ts',
      'invalidate',
      'reload',
    ]);
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

  it('watches frontmatter as a content dependency for development builds', async () => {
    const viteConfiguration = await readFile(
      path.resolve(import.meta.dirname, '../../vite.config.ts'),
      'utf8',
    );

    expect(viteConfiguration).toContain("path.join(utilitiesDirectory, 'frontmatter.ts')");
    expect(viteConfiguration).toContain("path.join(scriptsDirectory, 'content-metadata.ts')");
    expect(viteConfiguration).toContain("path.join(scriptsDirectory, 'content-paths.ts')");
  });
});
