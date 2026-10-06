import { describe, expect, it } from 'vitest';

import { collectDroppedFiles, toSourceFiles } from './dropped-files';

const baseName = (path: string): string => path.split('/').at(-1) ?? path;

const fileEntry = (fullPath: string): FileSystemEntry =>
  ({
    name: baseName(fullPath),
    fullPath,
    isFile: true,
    isDirectory: false,
    file: (resolve: (file: File) => void) => resolve(new File(['contents'], baseName(fullPath))),
  }) as unknown as FileSystemEntry;

/** A folder that hands back its children two at a time, as browsers do in larger batches. */
const folderEntry = (
  fullPath: string,
  children: FileSystemEntry[],
  onRead: () => void = () => {},
): FileSystemEntry =>
  ({
    name: baseName(fullPath),
    fullPath,
    isFile: false,
    isDirectory: true,
    createReader: () => {
      let offset = 0;

      return {
        // Like a browser, advance first and answer asynchronously.
        readEntries: (resolve: (batch: FileSystemEntry[]) => void) => {
          onRead();
          const batch = children.slice(offset, offset + 2);
          offset += 2;
          queueMicrotask(() => resolve(batch));
        },
      };
    },
  }) as unknown as FileSystemEntry;

const dropOf = (entries: (FileSystemEntry | null)[], files: File[] = []): DataTransfer =>
  ({
    items: entries.map((entry) => ({ kind: 'file', webkitGetAsEntry: () => entry })),
    files,
  }) as unknown as DataTransfer;

const pathsOf = async (files: Promise<{ path: string }[]>): Promise<string[]> =>
  (await files).map((file) => file.path);

describe('collectDroppedFiles', () => {
  it('walks nested folders in batches, keeps matching files, and sorts the transcript first', async () => {
    const drop = dropOf([
      folderEntry('/session', [
        folderEntry('/session/subagents', [
          fileEntry('/session/subagents/agent-2.jsonl'),
          fileEntry('/session/subagents/notes.txt'),
          fileEntry('/session/subagents/agent-1.jsonl'),
        ]),
        folderEntry('/session/tool-results', [fileEntry('/session/tool-results/output.txt')]),
      ]),
      fileEntry('/session.jsonl'),
    ]);

    await expect(
      pathsOf(collectDroppedFiles(drop, { keepFile: (path) => path.endsWith('.jsonl') })),
    ).resolves.toEqual([
      'session.jsonl',
      'session/subagents/agent-1.jsonl',
      'session/subagents/agent-2.jsonl',
    ]);
  });

  it('skips a nested folder without reading it when told not to enter it', async () => {
    let dependencyFolderRead = false;
    const drop = dropOf([
      folderEntry('/project', [
        fileEntry('/project/readme.md'),
        folderEntry('/project/node_modules', [fileEntry('/project/node_modules/a.md')], () => {
          dependencyFolderRead = true;
        }),
      ]),
    ]);

    const paths = await pathsOf(
      collectDroppedFiles(drop, { enterFolder: (path) => !path.endsWith('node_modules') }),
    );

    expect(paths).toEqual(['project/readme.md']);
    expect(dependencyFolderRead).toBe(false);
  });

  it('keeps a file dropped on its own even when folder files would be filtered out', async () => {
    const drop = dropOf([fileEntry('/notes.txt')]);

    await expect(
      pathsOf(collectDroppedFiles(drop, { keepFile: (path) => path.endsWith('.jsonl') })),
    ).resolves.toEqual(['notes.txt']);
  });

  it('falls back to the plain file list when the browser gives no entries', async () => {
    const drop = dropOf([null], [new File(['b'], 'b.jsonl'), new File(['a'], 'a.jsonl')]);

    await expect(pathsOf(collectDroppedFiles(drop))).resolves.toEqual(['a.jsonl', 'b.jsonl']);
  });
});

describe('toSourceFiles', () => {
  const pickedFromFolder = (relativePath: string): File => {
    const file = new File(['contents'], baseName(relativePath));
    Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });

    return file;
  };

  it('filters folder-picker files by their path, without filtering the picked folder itself', () => {
    const files = [
      pickedFromFolder('node_modules/project/readme.md'),
      pickedFromFolder('node_modules/project/node_modules/dependency/readme.md'),
      pickedFromFolder('node_modules/project/image.png'),
    ];

    // This filter would reject the picked root folder too, so the first file
    // only survives if the root is exempt.
    const paths = toSourceFiles(files, {
      enterFolder: (path) => !/(^|\/)node_modules$/.test(path),
      keepFile: (path) => path.endsWith('.md'),
    }).map((file) => file.path);

    expect(paths).toEqual(['node_modules/project/readme.md']);
  });

  it('keeps individually picked files by name', () => {
    const paths = toSourceFiles([new File(['b'], 'b.md'), new File(['a'], 'a.png')]).map(
      (file) => file.path,
    );

    expect(paths).toEqual(['a.png', 'b.md']);
  });
});
