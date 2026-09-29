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

  it('discovers plain wiki links to supported attachments but not documents', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'image-discovery-'));
    temporaryDirectories.push(repositoryRoot);
    await mkdir(path.join(repositoryRoot, 'writing/assets'), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, 'writing/note.md'),
      '[[assets/manual.pdf|Manual]] and [[other-note]].\n',
    );
    await writeFile(path.join(repositoryRoot, 'writing/assets/manual.pdf'), 'pdf');

    const result = await discoverAllImages(['writing/**/*.md'], repositoryRoot);

    expect([...result.images.keys()]).toEqual(['writing/assets/manual.pdf']);
    expect(result.missing).toEqual([]);
  });

  it('ignores embeds inside Svelte block directive expressions', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'image-discovery-'));
    temporaryDirectories.push(repositoryRoot);
    await mkdir(path.join(repositoryRoot, 'writing/assets'), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, 'writing/note.md'),
      '{#if value === "![[assets/missing.png]]"}\n\n![[assets/visible.png]]\n\n{/if}\n',
    );
    await writeFile(path.join(repositoryRoot, 'writing/assets/visible.png'), 'image');

    const result = await discoverAllImages(['writing/**/*.md'], repositoryRoot);

    expect([...result.images.keys()]).toEqual(['writing/assets/visible.png']);
    expect(result.missing).toEqual([]);
  });

  it('ignores embeds after a regular-expression brace inside a Svelte expression', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'image-discovery-'));
    temporaryDirectories.push(repositoryRoot);
    await mkdir(path.join(repositoryRoot, 'writing/assets'), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, 'writing/note.md'),
      '{condition && /}/.test(value) ? "![[assets/missing.png]]" : ""}\n',
    );

    const result = await discoverAllImages(['writing/**/*.md'], repositoryRoot);

    expect([...result.images.keys()]).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it('decodes encoded reserved characters in attachment file names', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'image-discovery-'));
    temporaryDirectories.push(repositoryRoot);
    await mkdir(path.join(repositoryRoot, 'writing/assets'), { recursive: true });
    await writeFile(path.join(repositoryRoot, 'writing/note.md'), '![[assets/a%23b.png]]\n');
    await writeFile(path.join(repositoryRoot, 'writing/assets/a#b.png'), 'image');

    const result = await discoverAllImages(['writing/**/*.md'], repositoryRoot);

    expect([...result.images.keys()]).toEqual(['writing/assets/a#b.png']);
  });

  it('refuses attachments that resolve outside the repository', async () => {
    const container = await mkdtemp(path.join(os.tmpdir(), 'image-discovery-'));
    temporaryDirectories.push(container);
    const repositoryRoot = path.join(container, 'repository');
    await mkdir(path.join(repositoryRoot, 'writing'), { recursive: true });
    await writeFile(path.join(container, 'private.pdf'), 'secret');
    await writeFile(path.join(repositoryRoot, 'writing/note.md'), '[[../../private.pdf]]\n');

    const result = await discoverAllImages(['writing/**/*.md'], repositoryRoot);

    expect([...result.images.keys()]).toEqual([]);
    expect(result.missing).toHaveLength(1);
  });

  it('ignores image references inside Svelte expressions', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'image-discovery-'));
    temporaryDirectories.push(repositoryRoot);
    await mkdir(path.join(repositoryRoot, 'writing/assets'), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, 'writing/note.md'),
      '{image ? "![[assets/dynamic.png]]" : ""}\n\n![[assets/visible.png]]\n',
    );
    await writeFile(path.join(repositoryRoot, 'writing/assets/dynamic.png'), 'image');
    await writeFile(path.join(repositoryRoot, 'writing/assets/visible.png'), 'image');

    const result = await discoverAllImages(['writing/**/*.md'], repositoryRoot);

    expect([...result.images.keys()]).toEqual(['writing/assets/visible.png']);
    expect(result.missing).toEqual([]);
  });

  it('discovers supported audio and PDF attachments', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'image-discovery-'));
    temporaryDirectories.push(repositoryRoot);
    await mkdir(path.join(repositoryRoot, 'writing/assets'), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, 'writing/note.md'),
      '![[assets/example.mp3]]\n![[assets/example.m4a]]\n![[assets/example.flac]]\n![[assets/example.pdf#page=2]]\n',
    );
    for (const filename of ['example.mp3', 'example.m4a', 'example.flac', 'example.pdf']) {
      await writeFile(path.join(repositoryRoot, 'writing/assets', filename), 'attachment');
    }

    const result = await discoverAllImages(['writing/**/*.md'], repositoryRoot);

    expect([...result.images.keys()]).toEqual([
      'writing/assets/example.mp3',
      'writing/assets/example.m4a',
      'writing/assets/example.flac',
      'writing/assets/example.pdf',
    ]);
    expect(result.missing).toEqual([]);
  });
});
