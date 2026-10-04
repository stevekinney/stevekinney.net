/** A file to read, with its path inside whatever the person dropped or picked. */
export type SourceFile = {
  file: File;
  path: string;
};

export type FolderOptions = {
  /**
   * Whether to walk into a folder found inside a dropped or picked folder,
   * given its path. Use it to skip folders such as `node_modules` without
   * reading them.
   */
  enterFolder?: (path: string) => boolean;
  /**
   * Whether to keep a file found inside a folder, given its path. A folder
   * usually holds more than the files an experiment wants. Files dropped or
   * picked on their own are always kept, and the reader decides what they are.
   */
  keepFile?: (path: string) => boolean;
};

const enterEveryFolder = (): boolean => true;
const keepEveryFile = (): boolean => true;

const readDirectory = (directory: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> =>
  new Promise((resolve, reject) => {
    const reader = directory.createReader();
    const entries: FileSystemEntry[] = [];

    // `readEntries` returns entries in batches and an empty batch at the end.
    const readBatch = (): void =>
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(entries);
        } else {
          entries.push(...batch);
          readBatch();
        }
      }, reject);

    readBatch();
  });

const readFileEntry = (entry: FileSystemFileEntry): Promise<File> =>
  new Promise((resolve, reject) => entry.file(resolve, reject));

const collectEntry = async (
  entry: FileSystemEntry,
  droppedDirectly: boolean,
  { enterFolder = enterEveryFolder, keepFile = keepEveryFile }: FolderOptions,
): Promise<SourceFile[]> => {
  const path = entry.fullPath.replace(/^\//, '');

  if (entry.isFile) {
    if (!droppedDirectly && !keepFile(path)) return [];

    return [{ file: await readFileEntry(entry as FileSystemFileEntry), path }];
  }

  if (entry.isDirectory) {
    if (!droppedDirectly && !enterFolder(path)) return [];

    const children = await readDirectory(entry as FileSystemDirectoryEntry);
    const nested = await Promise.all(
      children.map((child) => collectEntry(child, false, { enterFolder, keepFile })),
    );

    return nested.flat();
  }

  return [];
};

/** Sorts by path, so a session's transcript comes before the subagent folder beside it. */
const byPath = (first: SourceFile, second: SourceFile): number =>
  first.path < second.path ? -1 : first.path > second.path ? 1 : 0;

/**
 * Collects the files and folders from a drop. The browser empties the
 * `DataTransfer` as soon as the drop handler returns, so call this
 * synchronously inside the handler and await the promise it returns.
 */
export const collectDroppedFiles = (
  dataTransfer: DataTransfer,
  options: FolderOptions = {},
): Promise<SourceFile[]> => {
  const entries = [...dataTransfer.items]
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry?.() ?? null);
  const files = [...dataTransfer.files];

  // Without entries, as with a synthetic drop, there are no folders to walk.
  if (entries.length === 0 || entries.some((entry) => entry === null)) {
    return Promise.resolve(toSourceFiles(files, options));
  }

  return Promise.all(
    entries.map((entry) => collectEntry(entry as FileSystemEntry, true, options)),
  ).then((collected) => collected.flat().sort(byPath));
};

/** Every folder that contains a path, outermost first: `a/b/c.md` gives `a` and `a/b`. */
const ancestorsOf = (path: string): string[] => {
  const segments = path.split('/').slice(0, -1);

  return segments.map((_, index) => segments.slice(0, index + 1).join('/'));
};

/**
 * Turns files from a file input into source files. Files from a folder picker
 * carry their path in `webkitRelativePath` and go through the same folder
 * filters as a dropped folder, skipping the folder itself only when it's nested.
 */
export const toSourceFiles = (
  files: Iterable<File>,
  { enterFolder = enterEveryFolder, keepFile = keepEveryFile }: FolderOptions = {},
): SourceFile[] =>
  [...files]
    .map((file) => ({ file, path: file.webkitRelativePath || file.name }))
    .filter(({ path }) => {
      if (!path.includes('/')) return true;

      return ancestorsOf(path).slice(1).every(enterFolder) && keepFile(path);
    })
    .sort(byPath);
