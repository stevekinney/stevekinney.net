#!/usr/bin/env bun
import { repositoryRoot } from './content-paths.ts';

async function git(root: string, argumentsList: string[]): Promise<string> {
  const child = Bun.spawn(['git', ...argumentsList], { cwd: root, stdout: 'pipe', stderr: 'pipe' });
  const [output, error, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`Cannot prepare content history: ${error.trim()}`);
  return output.trim();
}

/** Capture history before Turbo computes cache keys, including Vercel's shallow checkout bootstrap. */
export async function runContentCommand(command: string[], root = repositoryRoot): Promise<number> {
  if (command.length === 0) throw new Error('Expected a command to run with content history.');
  if ((await git(root, ['rev-parse', '--is-shallow-repository'])) === 'true') {
    if (!process.env.VERCEL)
      throw new Error(
        'Content dates require full history. Run git fetch --unshallow origin and retry.',
      );
    await git(root, ['fetch', '--unshallow', 'origin']);
    if ((await git(root, ['rev-parse', '--is-shallow-repository'])) === 'true')
      throw new Error('The content checkout is still shallow after fetching history.');
  }
  const revision = await git(root, ['rev-parse', '--verify', 'HEAD^{commit}']);
  const child = Bun.spawn(command, {
    cwd: root,
    env: { ...process.env, CONTENT_GIT_REVISION: revision },
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return await child.exited;
}

if (import.meta.main) {
  try {
    process.exit(await runContentCommand(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
