import { describe, expect, it } from 'vitest';

import { findFrontmatter, parseAgentFile, setModelLine, splitLines } from './agent-definition';

const agent = (frontmatter: string[], body = 'Do the thing.'): string =>
  ['---', ...frontmatter, '---', '', body, ''].join('\n');

describe('parseAgentFile', () => {
  it('reads name, model, and description', () => {
    const parsed = parseAgentFile(
      'agents/reviewer.md',
      agent(['name: reviewer', 'description: Reviews pull requests.', 'model: opus']),
    );

    expect(parsed).toMatchObject({
      name: 'reviewer',
      nameFromFilename: false,
      rawModel: 'opus',
      declared: 'opus',
      description: 'Reviews pull requests.',
      patchable: true,
    });
    expect(parsed.warnings).toEqual([]);
  });

  it('reports an agent with no model line as unset, not missing', () => {
    const parsed = parseAgentFile(
      'agents/quiet.md',
      agent(['name: quiet', 'description: Says little.']),
    );

    expect(parsed.rawModel).toBeNull();
    expect(parsed.declared).toBe('unset');
  });

  it('falls back to the file name when there is no name', () => {
    const parsed = parseAgentFile('a/b/helper.md', agent(['description: Helps.']));

    expect(parsed.name).toBe('helper');
    expect(parsed.nameFromFilename).toBe(true);
  });

  it('skips list values such as tools, keeping the keys around them', () => {
    const parsed = parseAgentFile(
      'agents/x.md',
      agent(['name: x', 'tools:', '  - Read', '  - Grep', 'model: sonnet']),
    );

    expect(parsed.declared).toBe('sonnet');
    expect(parsed.warnings).toEqual([]);
  });

  it('handles quoted values, mixed case, full model IDs, and CRLF line endings', () => {
    expect(parseAgentFile('x.md', agent(['name: x', 'model: "Opus"'])).declared).toBe('opus');
    expect(parseAgentFile('x.md', agent(['name: x', "model: 'claude-haiku-5'"])).declared).toBe(
      'haiku',
    );
    expect(parseAgentFile('x.md', agent(['name: x', 'model: inherit'])).declared).toBe('inherit');
    expect(
      parseAgentFile('x.md', agent(['name: crlf', 'model: fable']).replace(/\n/g, '\r\n')),
    ).toMatchObject({ name: 'crlf', declared: 'fable' });
  });

  it('ignores a trailing comment after the model', () => {
    expect(parseAgentFile('x.md', agent(['name: x', 'model: haiku # cheap'])).declared).toBe(
      'haiku',
    );
  });

  it('folds a block scalar description', () => {
    const parsed = parseAgentFile(
      'x.md',
      agent(['name: x', 'description: >', '  First line', '  second line', 'model: opus']),
    );

    expect(parsed.description).toBe('First line second line');
    expect(parsed.declared).toBe('opus');
  });

  it('warns about an unknown model instead of failing', () => {
    const parsed = parseAgentFile('x.md', agent(['name: x', 'model: my-proxy-model']));

    expect(parsed.declared).toBe('unrecognized');
    expect(parsed.unknownModel).toBe(true);
    expect(parsed.warnings).toHaveLength(1);
  });

  it('warns about malformed frontmatter without throwing', () => {
    const unclosed = parseAgentFile('x.md', '---\nname: x\nmodel: opus\nbody never closes');
    const missing = parseAgentFile('x.md', 'Just a prompt.');
    const garbled = parseAgentFile('x.md', agent(['name: x', 'this is not yaml', 'model: opus']));

    expect(unclosed.warnings).toHaveLength(1);
    expect(unclosed.declared).toBe('unset');
    expect(unclosed.patchable).toBe(false);
    expect(missing.warnings).toHaveLength(1);
    expect(garbled.warnings[0]).toContain('line 3');
    expect(garbled.declared).toBe('opus');
  });

  it('warns about a repeated model line and uses the first', () => {
    const parsed = parseAgentFile('x.md', agent(['name: x', 'model: opus', 'model: haiku']));

    expect(parsed.declared).toBe('opus');
    expect(parsed.warnings).toHaveLength(1);
  });

  it('does not read a model: line from the body', () => {
    const parsed = parseAgentFile('x.md', agent(['name: x'], 'model: opus'));

    expect(parsed.rawModel).toBeNull();
  });
});

describe('findFrontmatter', () => {
  it('finds the block after a byte order mark and blank lines', () => {
    const lines = splitLines('\uFEFF---\nname: a\n---\nbody');

    expect(findFrontmatter(lines)?.lines).toEqual(['name: a']);
  });
});

describe('setModelLine', () => {
  it('rewrites an existing model line and changes nothing else', () => {
    const original = agent(['name: x', 'model: haiku', 'tools:', '  - Read']);

    expect(setModelLine(original, 'opus')).toBe(
      agent(['name: x', 'model: opus', 'tools:', '  - Read']),
    );
  });

  it('adds a missing model line before the closing fence', () => {
    expect(setModelLine(agent(['name: x', 'description: y']), 'sonnet')).toBe(
      agent(['name: x', 'description: y', 'model: sonnet']),
    );
  });

  it('keeps CRLF line endings', () => {
    const original = agent(['name: x']).replace(/\n/g, '\r\n');

    expect(setModelLine(original, 'opus')).toBe(
      agent(['name: x', 'model: opus']).replace(/\n/g, '\r\n'),
    );
  });

  it('refuses a file with no frontmatter to edit', () => {
    expect(setModelLine('Just a prompt.', 'opus')).toBeNull();
  });

  it('leaves a model: line in the body alone', () => {
    const original = agent(['name: x'], 'model: haiku');

    expect(setModelLine(original, 'opus')).toBe(agent(['name: x', 'model: opus'], 'model: haiku'));
  });
});
