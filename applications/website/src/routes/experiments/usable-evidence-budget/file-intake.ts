import type { EvidenceFile } from './fit-check';

/** Folders that hold dependencies or build output, which nobody means to hand a model. */
export const dependencyFolders: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'target',
  'vendor',
  'coverage',
  '__pycache__',
  '.venv',
  'venv',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  '.cache',
  '.output',
  '.vercel',
  '.gradle',
  'Pods',
]);

/** Whether a folder, given its path, is one of those. */
export const isDependencyFolder = (path: string): boolean =>
  dependencyFolders.has(path.split('/').filter(Boolean).at(-1) ?? '');

/** Types that are never text, skipped without reading them. Anything else is checked for NUL bytes. */
const binaryExtensions: ReadonlySet<string> = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'ico',
  'bmp',
  'tiff',
  'pdf',
  'zip',
  'gz',
  'tgz',
  'bz2',
  'xz',
  '7z',
  'rar',
  'tar',
  'jar',
  'wasm',
  'exe',
  'dll',
  'so',
  'dylib',
  'bin',
  'o',
  'a',
  'class',
  'pyc',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'mp3',
  'mp4',
  'mov',
  'wav',
  'ogg',
  'webm',
  'sqlite',
  'db',
  'psd',
  'dmg',
  'iso',
]);

export const hasBinaryExtension = (path: string): boolean => {
  const name = path.split('/').at(-1) ?? '';
  const dot = name.lastIndexOf('.');

  return dot > 0 && binaryExtensions.has(name.slice(dot + 1).toLowerCase());
};

export type SkipReason = 'binary' | 'too-large' | 'dependency-folder' | 'unreadable';

export type SkippedEntry = {
  path: string;
  reason: SkipReason;
  bytes: number | null;
};

export const describeSkip = (entry: SkippedEntry, maximumBytes: number): string => {
  switch (entry.reason) {
    case 'binary':
      return 'Binary file';
    case 'too-large':
      return `Over the ${formatBytes(maximumBytes)} size cap`;
    case 'dependency-folder':
      return 'Dependency or build folder, not read';
    case 'unreadable':
      return 'Could not be read';
  }
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round((bytes / 1024) * 10) / 10} KB`;

  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
};

export const defaultMaximumBytes = 2 * 1024 * 1024;

const SNIFF_BYTES = 8192;

export type ReadResult =
  | { kind: 'text'; characters: number }
  | { kind: 'skipped'; reason: 'binary' | 'too-large' | 'unreadable' };

/**
 * Counts a text file's characters without holding the file as one string, and
 * gives up on it as soon as the first chunk holds a NUL byte, which text never
 * does. It reads bytes rather than lines because it needs both: the NUL check
 * and an exact count.
 */
export const readCharacters = async (
  file: Pick<File, 'name' | 'size' | 'stream'>,
  path: string,
  maximumBytes: number,
): Promise<ReadResult> => {
  if (hasBinaryExtension(path)) return { kind: 'skipped', reason: 'binary' };
  if (file.size > maximumBytes) return { kind: 'skipped', reason: 'too-large' };
  if (file.size === 0) return { kind: 'text', characters: 0 };

  try {
    const reader = file.stream().getReader();
    const decoder = new TextDecoder('utf-8');
    let characters = 0;
    let sniffed = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      if (sniffed < SNIFF_BYTES) {
        const head = value.subarray(0, SNIFF_BYTES - sniffed);
        sniffed += head.length;

        if (head.includes(0)) {
          await reader.cancel();

          return { kind: 'skipped', reason: 'binary' };
        }
      }

      characters += decoder.decode(value, { stream: true }).length;
    }

    characters += decoder.decode().length;

    return { kind: 'text', characters };
  } catch {
    return { kind: 'skipped', reason: 'unreadable' };
  }
};

export type IntakeSource = { file: File; path: string };

export type IntakeResult = {
  files: EvidenceFile[];
  skipped: SkippedEntry[];
};

const BATCH_SIZE = 16;

/**
 * Reads what was dropped, a batch at a time so the page keeps responding while
 * thousands of small files go by.
 */
export const readSources = async (
  sources: readonly IntakeSource[],
  maximumBytes: number,
  onProgress?: (done: number, total: number) => void,
): Promise<IntakeResult> => {
  const files: EvidenceFile[] = [];
  const skipped: SkippedEntry[] = [];

  for (let start = 0; start < sources.length; start += BATCH_SIZE) {
    const batch = sources.slice(start, start + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(({ file, path }) => readCharacters(file, path, maximumBytes)),
    );

    results.forEach((result, offset) => {
      const { file, path } = batch[offset];

      if (result.kind === 'text') {
        files.push({
          id: path,
          path,
          characters: result.characters,
          bytes: file.size,
          selected: true,
        });
      } else {
        skipped.push({ path, reason: result.reason, bytes: file.size });
      }
    });

    onProgress?.(Math.min(start + BATCH_SIZE, sources.length), sources.length);
  }

  return { files, skipped };
};
