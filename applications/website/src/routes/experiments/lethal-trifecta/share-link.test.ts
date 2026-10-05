import { describe, expect, it } from 'vitest';

import { evaluate } from './evaluate';
import { ciState, defaultState, findPreset, presetMatching } from './presets';
import { decodeState, encodeState } from './share-link';

describe('share links', () => {
  it('round-trips every preset', () => {
    for (const id of ['default', 'careful', 'allowlist', 'reader-doer', 'container']) {
      const state = findPreset(id)?.state();
      if (!state) throw new Error(id);

      const decoded = decodeState(encodeState(state));
      expect(decoded).toEqual(state);
      expect(decoded && presetMatching(decoded)?.id).toBe(id);
    }
  });

  it('round-trips a CI scenario', () => {
    const state = ciState({
      trigger: 'pull_request',
      botSuffixAuthorization: true,
      credential: 'oidc',
      defaultTokenCommits: true,
    });

    expect(decodeState(encodeState(state))).toEqual(state);
  });

  it('never carries a domain that is not on the known list', () => {
    const state = { ...defaultState(), allowlist: ['gist.github.com', 'internal.example.com'] };
    const query = encodeState(state);

    expect(query).not.toContain('internal');
    expect(
      decodeState('nodes=issues&allow=internal.example.com,huggingface.co')?.allowlist,
    ).toEqual(['huggingface.co']);
  });

  it('keeps a wildcard’s verdict by carrying the known hosts it admits, not the wildcard', () => {
    const allowlistPreset = findPreset('allowlist')?.state();
    if (!allowlistPreset) throw new Error('allowlist');
    const state = { ...allowlistPreset, allowlist: ['*.github.com'] };
    const query = encodeState(state);
    const decoded = decodeState(query);
    if (!decoded) throw new Error('decoded');

    expect(query).not.toContain('*');
    expect(decoded.allowlist).toEqual(['gist.github.com', 'api.github.com']);
    expect(evaluate(decoded).exploitable).toBe(true);
    expect(evaluate(decoded).path?.sentence).toBe(evaluate(state).path?.sentence);
  });

  it('ignores what it does not recognize and returns null for an empty hash', () => {
    expect(decodeState('')).toBeNull();
    expect(decodeState('nodes=issues,bogus&controls=nope&ci=x')).toMatchObject({
      nodes: { issues: true, environment: false },
      ci: null,
    });
  });
});
