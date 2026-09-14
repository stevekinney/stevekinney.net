import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Stable byte digest used for artifact names and cache integrity checks. */
export const hashArtifact = (contents: string | Uint8Array): string =>
  createHash('sha256').update(contents).digest('hex');

/** Publish complete bytes without changing an unchanged artifact's timestamp. */
export const writeArtifact = async (
  filePath: string,
  contents: string | Uint8Array,
): Promise<boolean> => {
  const bytes = Buffer.from(contents);
  try {
    if ((await readFile(filePath)).equals(bytes)) return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.temporary`;
  try {
    await writeFile(temporaryPath, bytes);
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
  return true;
};

/** Cache metadata is disposable; malformed JSON is a cache miss. */
export const readCache = async (filePath: string): Promise<unknown> => {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === 'ENOENT')
      return null;
    throw error;
  }
};

export const verifyArtifact = async (filePath: string, digest: string): Promise<boolean> => {
  try {
    return hashArtifact(await readFile(filePath)) === digest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
};
