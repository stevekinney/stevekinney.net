import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const runGit = (args) =>
  execFileSync('git', args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  }).trim();

const isInsideGitWorkTree = () => {
  try {
    return runGit(['rev-parse', '--is-inside-work-tree']) === 'true';
  } catch {
    return false;
  }
};

if (!isInsideGitWorkTree()) {
  console.log('not inside a Git work tree; skipping hook installation.');
  process.exit(0);
}

let hooksPath = '';

try {
  hooksPath = runGit(['config', '--local', '--get', 'core.hooksPath']);
} catch {
  hooksPath = '';
}

if (hooksPath === '.husky' || hooksPath === '.husky/_') {
  execFileSync('git', ['config', '--local', '--unset', 'core.hooksPath'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
}

const lefthookBinary = path.resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'lefthook.cmd' : 'lefthook',
);

if (!existsSync(lefthookBinary)) {
  console.log('lefthook is not installed; skipping hook installation.');
  process.exit(0);
}

if (process.platform === 'win32') {
  execFileSync('cmd.exe', ['/c', lefthookBinary, 'install'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
} else {
  execFileSync(lefthookBinary, ['install'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
}
