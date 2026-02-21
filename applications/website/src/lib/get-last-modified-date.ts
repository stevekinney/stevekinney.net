import path from 'node:path';
import simpleGit from 'simple-git';

const gitRoot = path.resolve(process.cwd(), '..', '..');
const git = simpleGit(gitRoot);

export async function getLastModifiedDate(filePath: string): Promise<Date | null> {
  const log = await git.log({ file: filePath, maxCount: 1 });

  if (log.total === 0) {
    return null;
  }

  const latestCommit = log.latest;

  if (!latestCommit || !latestCommit.date) {
    return null;
  }

  return new Date(latestCommit.date);
}
