import { describe, expect, it } from 'vitest';

import { buildErrorText, findVerbatim, MAXIMUM_MESSAGE_LENGTH } from './error-text';

describe('buildErrorText', () => {
  it('records the exit code and reads the message from the next line (acceptance check 3)', () => {
    expect(buildErrorText('Exit code 1\nzsh: command not found: timeout')).toEqual({
      exitCode: 1,
      message: 'zsh: command not found: timeout',
    });
  });

  it('skips lines with nothing to read after the exit code', () => {
    expect(buildErrorText('Exit code 2\n\n{\n---\n  error: something broke  ')).toEqual({
      exitCode: 2,
      message: 'error: something broke',
    });
  });

  it('reads a Python traceback from its last line, where the exception is', () => {
    const content =
      'Exit code 1\nTraceback (most recent call last):\n  File "seed.py", line 3\nModuleNotFoundError: No module named \'yaml\'';

    expect(buildErrorText(content)).toEqual({
      exitCode: 1,
      message: "ModuleNotFoundError: No module named 'yaml'",
    });
  });

  it('keeps the exit code line when nothing follows it', () => {
    expect(buildErrorText('Exit code 137')).toEqual({ exitCode: 137, message: 'Exit code 137' });
  });

  it('leaves content without an exit code line alone', () => {
    expect(buildErrorText('<tool_use_error>File has not been read yet.</tool_use_error>')).toEqual({
      exitCode: null,
      message: '<tool_use_error>File has not been read yet.</tool_use_error>',
    });
    expect(buildErrorText('Exit code one\nnope').exitCode).toBeNull();
  });

  it('caps a very long line, and the cut message is still a prefix of the line', () => {
    const line = `error: ${'x'.repeat(1_000)}`;
    const { message } = buildErrorText(line);

    expect(message).toHaveLength(MAXIMUM_MESSAGE_LENGTH);
    expect(line.startsWith(message)).toBe(true);
  });
});

describe('findVerbatim', () => {
  it('returns the text when the source line contains it as is', () => {
    expect(findVerbatim('command not found', '{"content":"zsh: command not found"}')).toBe(
      'command not found',
    );
  });

  it('returns the escaped form when the JSON line stores the text escaped', () => {
    const source = JSON.stringify({ content: 'fatal: pathspec "a b.ts" did not match' });

    expect(findVerbatim('fatal: pathspec "a b.ts" did not match', source)).toBe(
      'fatal: pathspec \\"a b.ts\\" did not match',
    );
  });

  it('returns null when the text isn’t in the line at all', () => {
    expect(findVerbatim('something else', '{"content":"zsh: command not found"}')).toBeNull();
    expect(findVerbatim('', 'anything')).toBeNull();
  });
});
