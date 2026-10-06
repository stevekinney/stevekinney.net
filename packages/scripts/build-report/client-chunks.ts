import { readFile } from 'node:fs/promises';

/** One chunk in the client build's `.vite/manifest.json`. */
export type ManifestChunk = {
  file: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
};

export type ClientManifest = Record<string, ManifestChunk>;

/**
 * Every client file a page can load up front: the entries (the app shell and
 * each route's node) and everything they import statically, transitively.
 * A chunk reached only through `import()` inside a component is left out, so
 * an experiment can load a heavy editor on demand without every page paying
 * for it.
 */
export const findEagerClientFiles = (manifest: ClientManifest): Set<string> => {
  const eager = new Set<string>();
  const pending = Object.keys(manifest).filter((key) => manifest[key]?.isEntry);
  const visited = new Set<string>();

  while (pending.length > 0) {
    const key = pending.pop();
    if (key === undefined || visited.has(key)) continue;
    visited.add(key);

    const chunk = manifest[key];
    if (!chunk) continue;

    eager.add(chunk.file);
    pending.push(...(chunk.imports ?? []));
  }

  return eager;
};

/**
 * Reads the client manifest SvelteKit's Vite build writes, or returns null when
 * the build didn't write one.
 */
export const readClientManifest = async (manifestPath: string): Promise<ClientManifest | null> => {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8')) as ClientManifest;
  } catch {
    return null;
  }
};
