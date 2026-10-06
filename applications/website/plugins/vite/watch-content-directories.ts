import path from 'node:path';

import type { PluginOption } from 'vite';

/**
 * Adds extra source roots and dependency files to Vite's watcher so generated
 * content rebuilds when files outside the application root change. Paths are
 * added as-is: Vite's watcher disables globbing, so a recursive glob pattern would
 * be treated as a literal path and silently watch nothing, while a directory
 * path is already watched recursively.
 */
export function watchContentDirectories(paths: readonly string[]): PluginOption {
  return {
    name: 'watch-content-directories',
    configureServer(server) {
      for (const watchedPath of paths) {
        server.watcher.add(path.resolve(watchedPath));
      }
    },
  };
}
