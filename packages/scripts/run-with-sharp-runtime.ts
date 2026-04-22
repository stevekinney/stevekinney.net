import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(__dirname, '..', '..');
const linuxLibraryPath = path.resolve(
  repositoryRoot,
  'node_modules/@img/sharp-libvips-linux-x64/lib',
);
const darwinLibraryPath = path.resolve(
  repositoryRoot,
  'node_modules/@img/sharp-libvips-darwin-arm64/lib',
);

const appendLibraryPath = (currentValue: string | undefined, nextPath: string): string =>
  currentValue ? `${nextPath}${path.delimiter}${currentValue}` : nextPath;

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Usage: bun run run-with-sharp-runtime.ts <command> [...args]');
  process.exit(1);
}

const environment = { ...process.env };

if (existsSync(linuxLibraryPath)) {
  environment.LD_LIBRARY_PATH = appendLibraryPath(environment.LD_LIBRARY_PATH, linuxLibraryPath);
}

if (existsSync(darwinLibraryPath)) {
  environment.DYLD_LIBRARY_PATH = appendLibraryPath(
    environment.DYLD_LIBRARY_PATH,
    darwinLibraryPath,
  );
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env: environment,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
