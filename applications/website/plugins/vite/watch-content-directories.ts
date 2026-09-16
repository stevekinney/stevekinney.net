import path from 'node:path';

import type { PluginOption } from 'vite';

const watchPattern = (fileOrDirectory: string): string => {
  const absolutePath = path.resolve(fileOrDirectory);
  return path.extname(absolutePath) ? absolutePath : path.join(absolutePath, '**', '*');
};

/**
 * Adds extra source roots and dependency files to Vite's watcher so generated
 * content rebuilds when files outside the application root change.
 */
export function watchContentDirectories(paths: readonly string[]): PluginOption {
  return {
    name: 'watch-content-directories',
    configureServer(server) {
      for (const watchedPath of paths) {
        server.watcher.add(watchPattern(watchedPath));
      }
    },
  };
}
