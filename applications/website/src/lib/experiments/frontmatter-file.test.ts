import { describe, expect, it } from 'vitest';

import { readFrontmatterFile, splitFrontmatter, writeFrontmatterFile } from './frontmatter-file';

const skill = `---
name: pdf # matches the folder
description: Extract text from PDF files, fill forms, and merge documents. Use when the user mentions PDFs, forms, or document extraction, even in a description past eighty columns.
allowed-tools: Read, Bash(python:*)
---

# PDF

Run !\`ls\` with $ARGUMENTS and keep <example>tags</example> as written.
`;

const read = (text: string) => {
  const result = readFrontmatterFile(text);
  if (!result.ok) throw new Error(result.message);

  return result;
};

describe('splitFrontmatter', () => {
  it('splits the fenced block from the body and drops the blank line that opens the body', () => {
    expect(splitFrontmatter('---\nname: a\n---\n\n# Body\n')).toEqual({
      frontmatter: 'name: a',
      body: '# Body\n',
    });
  });

  it('treats a file without an opening fence, or with no closing fence, as all body', () => {
    expect(splitFrontmatter('# Just a body\n').frontmatter).toBeNull();
    expect(splitFrontmatter('---\nname: a\n# never closed\n').frontmatter).toBeNull();
  });

  it('reads Windows line endings and a byte-order mark', () => {
    expect(splitFrontmatter('\uFEFF---\r\nname: a\r\n---\r\nbody\r\n')).toEqual({
      frontmatter: 'name: a',
      body: 'body\n',
    });
  });
});

describe('readFrontmatterFile', () => {
  it('reads values and the body', () => {
    const file = read(skill);

    expect(file.values).toEqual({
      name: 'pdf',
      description: expect.stringContaining('Extract text') as unknown,
      'allowed-tools': 'Read, Bash(python:*)',
    });
    expect(file.body.startsWith('# PDF')).toBe(true);
  });

  it('refuses a fence that names a language, which some parsers would eval', () => {
    expect(readFrontmatterFile('---js\n{ name: "a" }\n---\n').ok).toBe(false);
  });

  it('reports YAML that does not parse, or that is not a mapping', () => {
    expect(readFrontmatterFile('---\nname: [unclosed\n---\n').ok).toBe(false);
    expect(readFrontmatterFile('---\n- a\n- b\n---\n').ok).toBe(false);
  });

  it('reads a file with no frontmatter as empty values', () => {
    expect(read('# Body only\n').values).toEqual({});
  });
});

describe('writeFrontmatterFile', () => {
  it('writes an unchanged file back byte for byte', () => {
    const file = read(skill);

    expect(writeFrontmatterFile(file)).toBe(skill);
  });

  it('keeps comments and untouched fields while changing, adding, and removing others', () => {
    const file = read(skill);
    const output = writeFrontmatterFile({
      document: file.document,
      values: { ...file.values, name: 'pdf-tools', 'allowed-tools': '', model: 'sonnet' },
      body: file.body,
    });

    expect(output).toContain('name: pdf-tools # matches the folder\n');
    expect(output).not.toContain('allowed-tools');
    expect(output).toContain('model: sonnet\n');
    expect(output).toContain('Run !`ls` with $ARGUMENTS and keep <example>tags</example>');
  });

  it('never folds a long description across lines', () => {
    const output = writeFrontmatterFile({
      values: { name: 'a', description: 'word '.repeat(60).trim() },
      body: 'Body.',
    });

    expect(output.split('\n')[2]).toBe(`description: ${'word '.repeat(60).trim()}`);
  });

  it('writes a new file in the order of its values, skipping empty ones', () => {
    expect(
      writeFrontmatterFile({
        values: { name: 'review', description: 'Reviews code.', tools: [], model: 'opus' },
        body: '\n\nYou review code.',
      }),
    ).toBe('---\nname: review\ndescription: Reviews code.\nmodel: opus\n---\n\nYou review code.\n');
  });

  it('writes lists as block sequences', () => {
    expect(writeFrontmatterFile({ values: { skills: ['a', 'b'] }, body: '' })).toBe(
      '---\nskills:\n  - a\n  - b\n---\n',
    );
  });
});
