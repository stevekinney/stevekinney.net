import { spawn } from 'node:child_process';
import path from 'node:path';
import type { PluginOption } from 'vite';

type RegenerateGeneratedContentOptions = {
  additionalDependencies?: readonly string[];
  /** Absolute path to the Bun script that produces the generated content. */
  contentBuildScriptPath: string;
  /** Working directory to run the build script from. */
  workingDirectory: string;
  /**
   * Absolute directories whose `.md` / `.toml` contents should trigger a
   * regeneration. Every nested file under any of these roots is watched.
   */
  contentDirectories: readonly string[];
  /**
   * Additional absolute directories whose `.ts` / `.css` files should trigger
   * a regeneration. Typically the content-enhancement source tree so the
   * runtime bundle rebuilds when its inputs change.
   */
  enhancementSourceDirectories: readonly string[];
  /**
   * Milliseconds to wait after the last file-system event before kicking off a
   * rebuild. Collapses the unlink+write burst that many editors emit on atomic
   * save into a single build invocation. Defaults to 150 ms.
   */
  debounceMs?: number;
};

const isInsideAny = (absolutePath: string, roots: readonly string[]): boolean =>
  roots.some((root) => absolutePath === root || absolutePath.startsWith(root + path.sep));

const isGeneratedContentFile = (file: string): boolean =>
  file.split(path.sep).includes('.generated');

/**
 * Re-runs the content-build script whenever a watched content file or an
 * enhancement source changes, then asks Vite to reload the browser. Runs are
 * serialised: a burst of edits collapses to a single follow-up rebuild.
 */
export function regenerateGeneratedContent(
  options: RegenerateGeneratedContentOptions,
): PluginOption {
  const contentRoots = options.contentDirectories.map((dir) => path.resolve(dir));
  const enhancementRoots = options.enhancementSourceDirectories.map((dir) => path.resolve(dir));

  const shouldRegenerate = (changedPath: string): boolean => {
    const absolutePath = path.resolve(changedPath);

    if (
      /\.(md|toml|png|jpe?g|gif|svg|webp|avif|mp4|webm|ogv|mp3|wav|ogg|m4a|flac|pdf)$/i.test(
        absolutePath,
      ) &&
      isInsideAny(absolutePath, contentRoots)
    ) {
      return true;
    }

    if (
      isInsideAny(
        absolutePath,
        (options.additionalDependencies ?? []).map((entry) => path.resolve(entry)),
      )
    )
      return true;

    if (/\.(ts|css)$/i.test(absolutePath) && isInsideAny(absolutePath, enhancementRoots)) {
      return true;
    }

    return false;
  };

  return {
    name: 'regenerate-generated-content',
    configureServer(server) {
      let isRunning = false;
      let hasPendingRun = false;

      const runContentBuild = (): void => {
        if (isRunning) {
          hasPendingRun = true;
          return;
        }

        isRunning = true;
        const child = spawn('bun', ['run', options.contentBuildScriptPath], {
          cwd: options.workingDirectory,
          stdio: 'inherit',
        });

        const finish = (success: boolean, reason?: string): void => {
          if (!isRunning) return;
          isRunning = false;

          if (success) {
            // Invalidate only content and generated modules. `invalidateModule` recursively
            // walks importers, while avoiding unrelated runtime modules and SSR-wide stalls.
            for (const environment of Object.values(server.environments ?? {})) {
              const graph = environment.moduleGraph;
              for (const [file, modules] of graph.fileToModulesMap) {
                const absoluteFile = path.resolve(file);
                if (
                  !isInsideAny(absoluteFile, contentRoots) &&
                  !isGeneratedContentFile(absoluteFile)
                )
                  continue;
                for (const module of modules) graph.invalidateModule(module);
              }
              if (environment.name !== 'client') environment.hot?.send({ type: 'full-reload' });
            }
            server.ws.send({ type: 'full-reload' });
          } else {
            server.config.logger.error(
              reason
                ? `Generated content rebuild failed: ${reason}`
                : 'Generated content rebuild failed.',
            );
          }

          if (hasPendingRun) {
            hasPendingRun = false;
            runContentBuild();
          }
        };

        child.on('exit', (code) => finish(code === 0));
        child.on('error', (error) => finish(false, error.message));
      };

      const debounceMs = options.debounceMs ?? 150;
      let debounceTimer: ReturnType<typeof setTimeout> | undefined;

      const handleChange = (filePath: string): void => {
        if (!shouldRegenerate(filePath)) return;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          debounceTimer = undefined;
          runContentBuild();
        }, debounceMs);
      };

      server.watcher.on('add', handleChange);
      server.watcher.on('change', handleChange);
      server.watcher.on('unlink', handleChange);
    },
  };
}
