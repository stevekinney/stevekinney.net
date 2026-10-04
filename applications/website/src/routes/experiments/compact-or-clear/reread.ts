import type { SourceFile } from '$lib/experiments/dropped-files';

/** The largest file the estimate reads. A bigger one is skipped, which also keeps reading it bounded. */
export const MAXIMUM_FILE_BYTES = 2_000_000;

/** The most files one drop reads. */
export const MAXIMUM_FILES = 2_000;

/** How much of the start of a file to look at for a zero byte. */
const SNIFF_BYTES = 8_192;

/** Folders that hold generated or downloaded files nobody re-reads after a clear. */
const IGNORED_FOLDERS = new Set([
  'node_modules',
  '.git',
  '.svelte-kit',
  '.next',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '__pycache__',
  '.venv',
  'target',
]);

const BINARY_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'ico',
  'pdf',
  'zip',
  'gz',
  'tgz',
  'tar',
  '7z',
  'mp3',
  'mp4',
  'mov',
  'wav',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'wasm',
  'bin',
  'exe',
  'dll',
  'so',
  'dylib',
  'class',
  'jar',
  'sqlite',
  'db',
  'lockb',
]);

/** Whether to walk into a folder found inside a dropped folder. */
export const enterFolder = (path: string): boolean =>
  !IGNORED_FOLDERS.has(path.split('/').at(-1) ?? '');

export type FileEstimate = {
  path: string;
  /** Characters in the file. */
  characters: number;
};

export type SkippedFile = {
  path: string;
  reason: string;
};

export type FileEstimates = {
  files: FileEstimate[];
  skipped: SkippedFile[];
};

const extensionOf = (path: string): string => path.split('.').at(-1)?.toLowerCase() ?? '';

const formatBytes = (bytes: number): string =>
  bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.ceil(bytes / 1_000)} KB`;

/** Tokens in a file: its characters divided by how many characters a token holds, on average. */
export const estimateTokens = (characters: number, charactersPerToken: number): number =>
  Math.round(characters / charactersPerToken);

const hasZeroByte = (bytes: Uint8Array): boolean => bytes.subarray(0, SNIFF_BYTES).includes(0);

/**
 * Counts the characters in each file and sets aside what can't be re-read as
 * text. The size check comes first, so reading a file into memory is always
 * bounded by the cap.
 */
export const readFileEstimates = async (sources: readonly SourceFile[]): Promise<FileEstimates> => {
  const files: FileEstimate[] = [];
  const skipped: SkippedFile[] = [];
  const decoder = new TextDecoder('utf-8', { fatal: true });

  for (const [index, { file, path }] of sources.entries()) {
    if (index >= MAXIMUM_FILES) {
      skipped.push({
        path,
        reason: `over the ${MAXIMUM_FILES.toLocaleString('en-US')}-file limit`,
      });
      continue;
    }

    if (file.size > MAXIMUM_FILE_BYTES) {
      skipped.push({
        path,
        reason: `${formatBytes(file.size)}, over the ${formatBytes(MAXIMUM_FILE_BYTES)} limit`,
      });
      continue;
    }

    if (BINARY_EXTENSIONS.has(extensionOf(path))) {
      skipped.push({ path, reason: 'a binary file' });
      continue;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());

      if (hasZeroByte(bytes)) {
        skipped.push({ path, reason: 'a binary file' });
        continue;
      }

      files.push({ path, characters: decoder.decode(bytes).length });
    } catch {
      skipped.push({ path, reason: 'couldn’t be read as text' });
    }
  }

  return { files, skipped };
};
