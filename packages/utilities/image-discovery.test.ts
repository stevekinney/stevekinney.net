import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { discoverAllImages } from './image-discovery';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('discoverAllImages', () => {
  it('discovers image assets referenced by wiki embeds', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'image-discovery-'));
    temporaryDirectories.push(repositoryRoot);
    await mkdir(path.join(repositoryRoot, 'writing/assets'), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, 'writing/note.md'),
      '---\ntitle: Note\n---\n\n![[assets/diagram.png|640]]\n',
    );
    await writeFile(path.join(repositoryRoot, 'writing/assets/diagram.png'), 'image');

    const result = await discoverAllImages(['writing/**/*.md'], repositoryRoot);

    expect([...result.images.keys()]).toEqual(['writing/assets/diagram.png']);
    expect(result.missing).toEqual([]);
  });

  it('ignores wiki embeds inside code and Obsidian comments', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'image-discovery-'));
    temporaryDirectories.push(repositoryRoot);
    await mkdir(path.join(repositoryRoot, 'writing/assets'), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, 'writing/note.md'),
      [
        '![[assets/inline.png]]',
        '',
        '`![[assets/inline-code.png]]`',
        '',
        '```md',
        '![[assets/fenced.png]]',
        '```',
        '',
        '%%',
        '![[assets/commented.png]]',
        '%%',
      ].join('\n'),
    );
    await writeFile(path.join(repositoryRoot, 'writing/assets/inline.png'), 'image');
    await writeFile(path.join(repositoryRoot, 'writing/assets/inline-code.png'), 'image');
    await writeFile(path.join(repositoryRoot, 'writing/assets/fenced.png'), 'image');
    await writeFile(path.join(repositoryRoot, 'writing/assets/commented.png'), 'image');

    const result = await discoverAllImages(['writing/**/*.md'], repositoryRoot);

    expect([...result.images.keys()]).toEqual(['writing/assets/inline.png']);
    expect(result.missing).toEqual([]);
  });

  it('ignores wiki embeds inside raw HTML and discovers OGV videos', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'image-discovery-'));
    temporaryDirectories.push(repositoryRoot);
    await mkdir(path.join(repositoryRoot, 'writing/assets'), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, 'writing/note.md'),
      ['<div>![[assets/protected.png]]</div>', '', '![[assets/video.ogv]]'].join('\n'),
    );
    await writeFile(path.join(repositoryRoot, 'writing/assets/protected.png'), 'image');
    await writeFile(path.join(repositoryRoot, 'writing/assets/video.ogv'), 'video');

    const result = await discoverAllImages(['writing/**/*.md'], repositoryRoot);

    expect([...result.images.keys()]).toEqual(['writing/assets/video.ogv']);
    expect(result.missing).toEqual([]);
  });
});
