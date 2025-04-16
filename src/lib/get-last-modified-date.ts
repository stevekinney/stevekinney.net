import simpleGit from 'simple-git';

const git = simpleGit();

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
