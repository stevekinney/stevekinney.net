import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { z } from 'zod';

import { hashArtifact } from './build-artifacts.ts';

const packageSchema = z.object({
  name: z.string(),
  version: z.string(),
  dependencies: z.record(z.string(), z.string()).optional(),
  optionalDependencies: z.record(z.string(), z.string()).optional(),
});

const resolvePackage = (name: string, from: string): string => {
  const require = createRequire(from);
  try {
    return require.resolve(`${name}/package.json`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
  }
  let directory = path.dirname(require.resolve(name));
  for (;;) {
    const candidate = path.join(directory, 'package.json');
    try {
      if (packageSchema.parse(JSON.parse(readFileSync(candidate, 'utf8'))).name === name)
        return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error(`Cannot find package metadata for ${name}`);
    directory = parent;
  }
};

/** Hash the actually resolved compiler dependency graph, without unrelated lockfile changes. */
export const compilerDependencyFingerprint = (): { fingerprint: string; cliPath: string } => {
  const visited = new Set<string>();
  const manifests: string[] = [];
  const visit = (name: string, from: string): void => {
    const filePath = resolvePackage(name, from);
    if (visited.has(filePath)) return;
    visited.add(filePath);
    const contents = readFileSync(filePath, 'utf8');
    const metadata = packageSchema.parse(JSON.parse(contents));
    manifests.push(contents);
    for (const dependency of Object.keys(metadata.dependencies ?? {}).sort())
      visit(dependency, filePath);
    for (const dependency of Object.keys(metadata.optionalDependencies ?? {}).sort()) {
      try {
        visit(dependency, filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') throw error;
      }
    }
  };
  visit('@tailwindcss/cli', import.meta.url);
  visit('tailwindcss', import.meta.url);
  const cliPackage = resolvePackage('@tailwindcss/cli', import.meta.url);
  return {
    fingerprint: hashArtifact(manifests.sort().join('\0')),
    cliPath: path.join(path.dirname(cliPackage), 'dist/index.mjs'),
  };
};
