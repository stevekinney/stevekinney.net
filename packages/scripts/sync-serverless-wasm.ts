#!/usr/bin/env bun
import { copyFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { directoryExists, repositoryRoot, websiteVercelFunctionsRoot } from './content-paths.ts';

/**
 * Vercel traces serverless dependencies with @vercel/nft, which follows static
 * requires. harfbuzzjs resolves its WebAssembly binary as `scriptDirectory +
 * "hb.wasm"` — a path built at runtime — so nothing static points at the file
 * and it is left out of the function bundle. satori (0.33+) imports harfbuzzjs
 * for text shaping, so every Open Graph route then fails at runtime with
 * `ENOENT ... /var/task/node_modules/harfbuzzjs/hb.wasm`.
 *
 * The binary sits next to the JS that loads it, so copying it into each traced
 * copy of the package restores the layout harfbuzzjs expects. This runs after
 * `vite build`, before the root build copies `.vercel/output` upward.
 */
const untracedAssets = [{ packageName: 'harfbuzzjs', fileName: 'hb.wasm' }];

const findTracedPackageDirectories = async (
  root: string,
  packageName: string,
): Promise<string[]> => {
  const found: string[] = [];

  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const child = path.join(directory, entry.name);

      if (path.relative(root, child).endsWith(path.join('node_modules', packageName))) {
        found.push(child);
        continue;
      }

      await walk(child);
    }
  };

  await walk(root);
  return found;
};

const syncServerlessWasm = async (): Promise<void> => {
  // Only the Vercel adapter produces this tree; the static build has no functions.
  if (!(await directoryExists(websiteVercelFunctionsRoot))) {
    console.log('No Vercel functions output; skipping serverless wasm sync.');
    return;
  }

  for (const { packageName, fileName } of untracedAssets) {
    const source = path.resolve(repositoryRoot, 'node_modules', packageName, fileName);

    try {
      await stat(source);
    } catch {
      console.error(
        `Cannot sync ${packageName}/${fileName}: it is missing at ${source}. ` +
          `If ${packageName} no longer ships this file, remove it from untracedAssets.`,
      );
      process.exit(1);
    }

    const targets = await findTracedPackageDirectories(websiteVercelFunctionsRoot, packageName);

    if (targets.length === 0) {
      console.error(
        `Cannot sync ${packageName}/${fileName}: no traced copy of ${packageName} exists under ` +
          `${websiteVercelFunctionsRoot}. Either the dependency is gone — in which case remove it ` +
          `from untracedAssets — or tracing changed and this script would silently do nothing.`,
      );
      process.exit(1);
    }

    for (const target of targets) {
      const destination = path.join(target, fileName);
      await copyFile(source, destination);

      // Copying can succeed against a path that is not what the runtime resolves,
      // so confirm the file is readable where harfbuzzjs will look for it.
      const { size } = await stat(destination);
      if (size === 0) {
        console.error(`Synced ${fileName} to ${destination} but it is empty.`);
        process.exit(1);
      }

      console.log(
        `Synced ${packageName}/${fileName} into ${path.relative(repositoryRoot, target)}`,
      );
    }
  }
};

await syncServerlessWasm();
