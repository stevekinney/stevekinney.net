import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import simpleGit from 'simple-git';

const gitRoot = path.resolve(process.cwd(), '..', '..');
const hasGitDirectory = existsSync(path.join(gitRoot, '.git'));
const git = hasGitDirectory ? simpleGit(gitRoot) : null;

export async function getLastModifiedDate(filePath: string): Promise<Date | null> {
  if (git) {
    try {
      const log = await git.log({ file: filePath, maxCount: 1 });

      if (log.total > 0) {
        const latestCommit = log.latest;

        if (latestCommit?.date) {
          return new Date(latestCommit.date);
        }
      }
    } catch {
      // Fall back to file metadata when git history is unavailable (e.g. Vercel build env).
    }
  }

  try {
    const stats = await fs.stat(path.resolve(gitRoot, filePath));
    return stats.mtime;
  } catch {
    return null;
  }
}
