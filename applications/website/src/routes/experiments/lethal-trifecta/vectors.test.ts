import { describe, expect, it } from 'vitest';

import { evaluate } from './evaluate';
import { defaultState } from './presets';
import { showVector, vectors } from './vectors';

const vector = (id: string) => {
  const found = vectors.find((candidate) => candidate.id === id);
  if (!found) throw new Error(id);

  return found;
};

describe('the vectors gallery', () => {
  it('turns deferred execution on, which starts off', () => {
    const before = defaultState();
    expect(before.nodes['deferred-execution']).toBe(false);

    const after = showVector(before, vector('deferred'));
    expect(after.nodes['deferred-execution']).toBe(true);
    expect(evaluate(after).edges['deferred-execution'].state).toBe('live');
  });

  it('reopens strict egress with the allowlist card', () => {
    const state = defaultState();
    state.controls['default-deny-egress'] = true;
    expect(evaluate(state).edges['shell-network'].state).toBe('cut');

    const after = showVector(state, vector('allowlist'));
    expect(after.allowlist).toEqual(['gist.github.com']);
    expect(evaluate(after).edges['shell-network'].state).toBe('live');
  });

  it('carries the cited package-hallucination figures', () => {
    expect(vector('packages').citation?.text).toContain('5.2%');
    expect(vector('packages').citation?.text).toContain('21.7%');
  });
});
