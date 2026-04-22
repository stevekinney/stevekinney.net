import type { PluginOption } from 'vite';

import { regenerateGeneratedContent } from './regenerate-generated-content';
import { serveContentAssets } from './serve-content-assets';
import { serveGeneratedContentEnhancements } from './serve-generated-content-enhancements';
import { watchContentDirectories } from './watch-content-directories';

type ContentDevelopmentPluginsOptions = {
  workspaceRoot: string;
  /**
   * Absolute directories whose `.md` / `.toml` contents drive the generated
   * content and should also be exposed via `serveContentAssets`.
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
    serveGeneratedContentEnhancements({
      rootDirectory: options.generatedEnhancementsDirectory,
      urlPrefix: options.generatedEnhancementsUrlPrefix,
    }),
    serveContentAssets({
      workspaceRoot: options.workspaceRoot,
      pathPrefixes: options.contentAssetPathPrefixes,
    }),
  ];
}
