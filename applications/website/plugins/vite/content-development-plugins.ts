import type { PluginOption } from 'vite';

import { regenerateGeneratedContent } from './regenerate-generated-content';
import { serveStaticDirectory } from './serve-static-directory';
import { watchContentDirectories } from './watch-content-directories';

const IMAGE_ASSET_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

const GENERATED_ASSET_MIME_TYPES: Record<string, string> = {
  ...IMAGE_ASSET_MIME_TYPES,
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

type ContentDevelopmentPluginsOptions = {
  workspaceRoot: string;
  /**
   * Absolute directories whose `.md` / `.toml` contents drive the generated
   * content and should also be exposed by the content asset middleware.
   */
  contentDirectories: readonly string[];
  /**
   * Absolute URL path prefixes (leading and trailing slash, e.g. `/writing/`)
   * to serve workspace-rooted images under during development.
   */
  contentAssetPathPrefixes: readonly string[];
  /** Absolute directories containing the enhancement runtime source. */
  enhancementSourceDirectories: readonly string[];
  /** Absolute path to the script that regenerates generated content. */
  contentBuildScriptPath: string;
  /** Working directory to run the content-build script from. */
  contentBuildWorkingDirectory: string;
  /** Absolute directory whose contents are served under `generatedAssetsUrlPrefix`. */
  generatedEnhancementsDirectory: string;
  /** URL prefix (leading and trailing slash) for the served enhancement bundle. */
  generatedEnhancementsUrlPrefix: string;
};

/**
 * Returns the ordered set of Vite plugins that make up the site's
 * development content pipeline. The order is intentional:
 *
 * 1. Register extra watched directories first so the other plugins observe a
 *    consistent file-system view.
 * 2. Run the content-build script in response to changes detected above.
 * 3. Serve the build's output under its canonical URL so route code can
 *    reference it via the same path in dev and prod.
 * 4. Serve raw workspace image assets as a dev-only fallback for anything
 *    not yet in the blob-storage manifest.
 */
export function contentDevelopmentPlugins(
  options: ContentDevelopmentPluginsOptions,
): PluginOption[] {
  return [
    watchContentDirectories(options.contentDirectories),
    regenerateGeneratedContent({
      contentBuildScriptPath: options.contentBuildScriptPath,
      workingDirectory: options.contentBuildWorkingDirectory,
      contentDirectories: options.contentDirectories,
      enhancementSourceDirectories: options.enhancementSourceDirectories,
    }),
    {
      name: 'serve-generated-content-enhancements',
      configureServer(server) {
        server.middlewares.use(
          serveStaticDirectory({
            rootDirectory: options.generatedEnhancementsDirectory,
            mimeTypes: GENERATED_ASSET_MIME_TYPES,
            matchRequest: (pathname) =>
              pathname.startsWith(options.generatedEnhancementsUrlPrefix)
                ? pathname.slice(options.generatedEnhancementsUrlPrefix.length)
                : null,
          }),
        );
      },
    },
    {
      name: 'serve-content-assets',
      configureServer(server) {
        server.middlewares.use(
          serveStaticDirectory({
            rootDirectory: options.workspaceRoot,
            mimeTypes: IMAGE_ASSET_MIME_TYPES,
            matchRequest: (pathname) =>
              options.contentAssetPathPrefixes.some((prefix) => pathname.startsWith(prefix))
                ? pathname.slice(1)
                : null,
          }),
        );
      },
    },
  ];
}
