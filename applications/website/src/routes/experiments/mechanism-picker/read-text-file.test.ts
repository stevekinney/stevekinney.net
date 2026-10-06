import { describe, expect, it } from 'vitest';

import { readTextFile } from './read-text-file';

describe('readTextFile', () => {
  it('reads a text file line by line', async () => {
    const file = new File(['- Never read .env files.\r\n- Keep it.\n'], 'CLAUDE.md');

    expect(await readTextFile(file)).toEqual({
      ok: true,
      text: '- Never read .env files.\r\n- Keep it.',
    });
  });

  it('refuses a file that’s too large without reading it', async () => {
    const file = new File(['x'.repeat(20)], 'huge.md');

    expect(await readTextFile(file, 10)).toEqual({
      ok: false,
      reason: 'huge.md is too large to be an instructions file, so it wasn’t read.',
    });
  });

  it('refuses a binary file', async () => {
    const file = new File([new Uint8Array([65, 0, 66])], 'logo.png');

    expect(await readTextFile(file)).toEqual({
      ok: false,
      reason: 'logo.png doesn’t look like a text file.',
    });
  });
});
