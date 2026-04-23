import type { PluginOption } from 'vite';

/**
 * Adds extra directories to Vite's file watcher so content loaded via
 * `import.meta.glob` with deep relative paths still triggers module
 * invalidation when new files appear. Vite's default watcher does not
 * always cover directories resolved via `../../../../` paths outside the
 * application root.
 */
export function watchContentDirectories(directories: readonly string[]): PluginOption {
  return {
    name: 'watch-content-directories',
    configureServer(server) {
      for (const directory of directories) {
        server.watcher.add(directory);
      }
    },
  };
}
