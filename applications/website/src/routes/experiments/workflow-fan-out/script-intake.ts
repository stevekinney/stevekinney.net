import type { SourceFile } from '$lib/experiments/dropped-files';
import { readLines } from '$lib/experiments/read-lines';

/** A workflow script is a page or two of JavaScript; anything far larger isn't one. */
export const MAXIMUM_SCRIPT_BYTES = 512 * 1024;

export type ScriptIntake = { name: string; text: string } | { error: string };

/** Reads the first dropped or picked file as a script, line by line, without leaving the browser. */
export const readScript = async (files: readonly SourceFile[]): Promise<ScriptIntake> => {
  const [first] = files;
  if (!first) return { error: 'Nothing to read. Drop or choose one .js file.' };
  if (first.file.size > MAXIMUM_SCRIPT_BYTES) {
    return { error: `${first.path} is over 512 KB, which is too large to be a workflow script.` };
  }

  const lines: string[] = [];
  await readLines(first.file.stream(), (line) => lines.push(line));

  return { name: first.path, text: lines.join('\n') };
};
