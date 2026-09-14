import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { HotUpdateOptions, PluginOption } from 'vite';

type BuildTask = 'content' | 'enhancements' | 'playgrounds';
type SpawnProcess = typeof spawn;

type RegenerateGeneratedContentOptions = {
  contentBuildScriptPath: string;
  playgroundsBuildScriptPath: string;
  contentEnhancementsBuildScriptPath: string;
  workingDirectory: string;
  contentDirectories: readonly string[];
  contentDependencyPaths: readonly string[];
  enhancementSourceDirectories: readonly string[];
  enhancementDependencyPaths: readonly string[];
  playgroundDependencyPaths: readonly string[];
  sharedBuildDependencyPaths: readonly string[];
  debounceMs?: number;
  spawnProcess?: SpawnProcess;
};

const orderedTasks: BuildTask[] = ['content', 'playgrounds', 'enhancements'];

const isInsideAny = (absolutePath: string, roots: readonly string[]): boolean =>
  roots.some((root) => absolutePath === root || absolutePath.startsWith(root + path.sep));

const orderTasks = (tasks: Iterable<BuildTask>): BuildTask[] => {
  const taskSet = new Set(tasks);
  return orderedTasks.filter((task) => taskSet.has(task));
};

const normalizePaths = (paths: readonly string[]): string[] =>
  paths.map((value) => path.resolve(value));

const hasPathMatch = (absolutePath: string, paths: readonly string[]): boolean =>
  paths.some(
    (candidate) => absolutePath === candidate || absolutePath.startsWith(candidate + path.sep),
  );

const tasksForChangedPath = (
  changedPath: string,
  options: {
    contentRoots: readonly string[];
    contentDependencies: readonly string[];
    enhancementRoots: readonly string[];
    enhancementDependencies: readonly string[];
    playgroundDependencies: readonly string[];
    sharedBuildDependencies: readonly string[];
  },
): BuildTask[] => {
  const absolutePath = path.resolve(changedPath);

  if (/\.(md|toml)$/i.test(absolutePath) && isInsideAny(absolutePath, options.contentRoots)) {
    return ['content', 'playgrounds'];
  }

  if (hasPathMatch(absolutePath, options.contentDependencies)) {
    return ['content', 'playgrounds'];
  }

  if (hasPathMatch(absolutePath, options.sharedBuildDependencies)) {
    return ['playgrounds', 'enhancements'];
  }

  if (hasPathMatch(absolutePath, options.playgroundDependencies)) {
    return ['playgrounds'];
  }

  if (
    (/\.(ts|css)$/i.test(absolutePath) && isInsideAny(absolutePath, options.enhancementRoots)) ||
    hasPathMatch(absolutePath, options.enhancementDependencies)
  ) {
    return ['enhancements'];
  }

  return [];
};

/**
 * Re-runs the smallest generated-content build chain for the changed source,
 * serialising rebuilds so rapid saves collapse into one follow-up run.
 */
export function regenerateGeneratedContent(
  options: RegenerateGeneratedContentOptions,
): PluginOption {
  const contentRoots = normalizePaths(options.contentDirectories);
  const contentDependencies = normalizePaths(options.contentDependencyPaths);
  const enhancementRoots = normalizePaths(options.enhancementSourceDirectories);
  const enhancementDependencies = normalizePaths(options.enhancementDependencyPaths);
  const playgroundDependencies = normalizePaths(options.playgroundDependencyPaths);
  const sharedBuildDependencies = normalizePaths(options.sharedBuildDependencyPaths);
  const spawnProcess = options.spawnProcess ?? spawn;

  const getTasks = (changedPath: string): BuildTask[] =>
    tasksForChangedPath(changedPath, {
      contentRoots,
      contentDependencies,
      enhancementRoots,
      enhancementDependencies,
      playgroundDependencies,
      sharedBuildDependencies,
    });

  const commandByTask: Record<BuildTask, readonly string[]> = {
    content: ['run', options.contentBuildScriptPath],
    enhancements: ['run', options.contentEnhancementsBuildScriptPath],
    playgrounds: ['run', options.playgroundsBuildScriptPath, '--development'],
  };

  return {
    name: 'regenerate-generated-content',
    hotUpdate: {
      order: 'pre',
      handler(context: HotUpdateOptions) {
        if (getTasks(context.file).length > 0) return [];
      },
    },
    configureServer(server) {
      let isRunning = false;
      let isClosed = false;
      let activeChild: ChildProcess | undefined;
      let pendingTasks = new Set<BuildTask>();
      let debounceTimer: ReturnType<typeof setTimeout> | undefined;
      let debouncedTasks = new Set<BuildTask>();

      const takeQueuedTasks = (): BuildTask[] => {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
        const queuedTasks = new Set([...pendingTasks, ...debouncedTasks]);
        pendingTasks = new Set();
        debouncedTasks = new Set();
        return orderTasks(queuedTasks);
      };

      const runTasks = (tasks: BuildTask[]): void => {
        if (isClosed || tasks.length === 0) return;
        if (isRunning) {
          for (const task of tasks) pendingTasks.add(task);
          return;
        }

        isRunning = true;
        const task = tasks[0];
        activeChild = spawnProcess('bun', commandByTask[task], {
          cwd: options.workingDirectory,
          stdio: 'inherit',
        });
        let childFinished = false;

        const finish = (success: boolean, reason?: string): void => {
          if (childFinished || isClosed) return;
          childFinished = true;
          activeChild = undefined;
          isRunning = false;

          if (!success) {
            server.config.logger.error(
              reason
                ? `Generated ${task} rebuild failed: ${reason}`
                : `Generated ${task} rebuild failed.`,
            );
          }

          const remainingTasks = success ? tasks.slice(1) : [];
          if (remainingTasks.length > 0) {
            runTasks(remainingTasks);
            return;
          }

          const followUpTasks = takeQueuedTasks();
          if (followUpTasks.length > 0) {
            runTasks(followUpTasks);
            return;
          }

          if (success) {
            server.moduleGraph.invalidateAll();
            server.ws.send({ type: 'full-reload' });
          }
        };

        activeChild.on('exit', (code) => finish(code === 0));
        activeChild.on('error', (error) => finish(false, error.message));
      };

      const debounceMs = options.debounceMs ?? 150;

      const handleChange = (filePath: string): void => {
        if (isClosed) return;
        const tasks = getTasks(filePath);
        if (tasks.length === 0) return;

        for (const task of tasks) debouncedTasks.add(task);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (isClosed) return;
          const tasksToRun = orderTasks(debouncedTasks);
          debouncedTasks = new Set();
          debounceTimer = undefined;
          runTasks(tasksToRun);
        }, debounceMs);
      };

      const cleanup = (): void => {
        isClosed = true;
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
        pendingTasks = new Set();
        debouncedTasks = new Set();
        server.watcher.off('add', handleChange);
        server.watcher.off('change', handleChange);
        server.watcher.off('unlink', handleChange);
        activeChild?.kill();
        activeChild = undefined;
        isRunning = false;
      };

      server.watcher.on('add', handleChange);
      server.watcher.on('change', handleChange);
      server.watcher.on('unlink', handleChange);
      server.httpServer?.once('close', cleanup);
    },
  };
}

export const __testing = { orderTasks, tasksForChangedPath };
