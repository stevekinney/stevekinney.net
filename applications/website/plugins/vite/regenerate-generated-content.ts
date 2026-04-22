import { spawn } from 'node:child_process';
import path from 'node:path';
import type { PluginOption } from 'vite';

type RegenerateGeneratedContentOptions = {
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
};

const isInsideAny = (absolutePath: string, roots: readonly string[]): boolean =>
  roots.some((root) => absolutePath === root || absolutePath.startsWith(root + path.sep));

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

    if (/\.(md|toml)$/i.test(absolutePath) && isInsideAny(absolutePath, contentRoots)) {
      return true;
    }

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

        child.on('exit', (code) => {
          isRunning = false;

          if (code === 0) {
            server.ws.send({ type: 'full-reload' });
          } else {
            server.config.logger.error('Generated content rebuild failed.');
          }

          if (hasPendingRun) {
            hasPendingRun = false;
            runContentBuild();
          }
        });
      };

      const handleChange = (filePath: string): void => {
        if (shouldRegenerate(filePath)) {
          runContentBuild();
        }
      };

      server.watcher.on('add', handleChange);
      server.watcher.on('change', handleChange);
      server.watcher.on('unlink', handleChange);
    },
  };
}
