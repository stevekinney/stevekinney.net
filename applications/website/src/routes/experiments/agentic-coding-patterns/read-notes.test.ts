import { describe, expect, it } from 'vitest';

import { buildDataset } from './normalize-notes';
import {
  commonFolderName,
  enterNoteFolder,
  keepNotePath,
  maximumNoteBytes,
  readNotes,
} from './read-notes';

const source = (path: string, text: string) => ({
  path,
  file: new File([text], path.split('/').at(-1) ?? path),
});

describe('readNotes', () => {
  it('reads Markdown files and says why it skipped anything else', async () => {
    const { notes, skipped, truncated } = await readNotes([
      source('Folder/One.md', '---\ntype: pattern\n---\nline one\nline two\r\nline three'),
      source('Folder/image.png', 'binary'),
      source('Two.markdown', 'text'),
    ]);

    expect(notes.map(({ path }) => path)).toEqual(['Folder/One.md', 'Two.markdown']);
    expect(notes[0]?.text).toContain('line one\nline two\r\nline three');
    expect(skipped).toEqual([{ path: 'Folder/image.png', reason: 'It isn’t a Markdown file.' }]);
    expect(truncated).toBe(false);
  });

  it('skips a file over the size limit without reading it', async () => {
    const big = source('Big.md', 'x'.repeat(maximumNoteBytes + 1));
    const { notes, skipped } = await readNotes([big]);

    expect(notes).toEqual([]);
    expect(skipped[0]?.reason).toContain('larger than 1 MB');
  });

  it('reports progress for each note', async () => {
    const seen: number[] = [];
    await readNotes([source('A.md', 'a'), source('B.md', 'b')], (index) => seen.push(index));

    expect(seen).toEqual([0, 1]);
  });

  it('loads a folder of three notes, one typed index, as two entries and one exclusion', async () => {
    const { notes } = await readNotes([
      source('My Notes/Alpha.md', '---\ntype: pattern\ncategory: planning\n---\n## TL;DR\nA.'),
      source('My Notes/Beta.md', '---\ntype: methodology\n---\n## TL;DR\nB.'),
      source('My Notes/Index.md', '---\ntype: index\n---\nAll the notes.'),
    ]);
    const { entries, report } = buildDataset(notes);

    expect(entries.map(({ name }) => name)).toEqual(['Alpha', 'Beta']);
    expect(report.excluded).toEqual([
      {
        path: 'My Notes/Index.md',
        reason: 'Its type is "index", and only pattern, methodology are included.',
      },
    ]);
  });
});

describe('folder filters', () => {
  it('keeps Markdown paths and skips hidden folders and node_modules', () => {
    expect(keepNotePath('a/b.MD')).toBe(true);
    expect(keepNotePath('a/b.png')).toBe(false);
    expect(enterNoteFolder('vault/.obsidian')).toBe(false);
    expect(enterNoteFolder('vault/node_modules')).toBe(false);
    expect(enterNoteFolder('vault/notes')).toBe(true);
  });

  it('names the folder the notes share', () => {
    expect(commonFolderName(['Vault/a.md', 'Vault/sub/b.md'])).toBe('Vault');
    expect(commonFolderName(['Vault/a.md', 'Other/b.md'])).toBeNull();
    expect(commonFolderName(['a.md', 'b.md'])).toBeNull();
    expect(commonFolderName([])).toBeNull();
  });
});
