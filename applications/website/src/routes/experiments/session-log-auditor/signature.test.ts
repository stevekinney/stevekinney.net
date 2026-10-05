import { describe, expect, it } from 'vitest';

import { toSignature } from './signature';

describe('toSignature', () => {
  it('leaves a message with nothing variable in it alone', () => {
    expect(toSignature('zsh: command not found: timeout')).toBe('zsh: command not found: timeout');
  });

  it('replaces absolute paths, home directories, and line and column positions', () => {
    expect(toSignature('cat: /work/app/config/local.json: No such file or directory')).toBe(
      'cat: <path>: No such file or directory',
    );
    expect(toSignature('error in ~/projects/app/src/index.ts:12:5')).toBe(
      'error in <path>:<n>:<n>',
    );
    expect(toSignature('C:\\Users\\someone\\app\\index.ts is locked')).toBe('<path> is locked');
  });

  it('gives the same signature to the same error in two different checkouts', () => {
    expect(toSignature('Cannot find module /work/one/node_modules/x/index.js')).toBe(
      toSignature('Cannot find module /srv/two/node_modules/x/index.js'),
    );
  });

  it('replaces UUIDs, hashes, numbers, and quoted identifiers', () => {
    expect(toSignature('session 0f8fad5b-d9cb-469f-a165-70867728950e not found')).toBe(
      'session <uuid> not found',
    );
    expect(toSignature('commit 9fb2cc3f4a is missing')).toBe('commit <hash> is missing');
    expect(toSignature("Cannot find module 'lodash' after 3 tries")).toBe(
      "Cannot find module '<name>' after <n> tries",
    );
    expect(toSignature('Unknown JSON field: "mergedBy"')).toBe('Unknown JSON field: "<name>"');
  });

  it('keeps tags and relative paths, and collapses whitespace', () => {
    expect(toSignature('<tool_use_error>File has not been read yet.</tool_use_error>')).toBe(
      '<tool_use_error>File has not been read yet.</tool_use_error>',
    );
    expect(toSignature('zsh:  no matches found:   src/routes/[slug]')).toBe(
      'zsh: no matches found: src/routes/[slug]',
    );
  });

  it('leaves words that only look like hex, and version-like names, alone', () => {
    expect(toSignature('deadbeef accede python3 failed')).toBe('deadbeef accede python3 failed');
  });
});
