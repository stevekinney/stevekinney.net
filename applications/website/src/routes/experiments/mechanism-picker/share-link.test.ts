import { describe, expect, it } from 'vitest';

import { decodeView, encodeView } from './share-link';

describe('the shared link', () => {
  it('holds the mode, and the seed only for the game', () => {
    expect(encodeView({ mode: 'sort', seed: 1234 })).toBe('mode=sort&seed=1234');
    expect(encodeView({ mode: 'lint', seed: 1234 })).toBe('mode=lint');
    expect(encodeView({ mode: 'map', seed: null })).toBe('mode=map');
  });

  it('reads a link back', () => {
    expect(decodeView('mode=sort&seed=1234')).toEqual({ mode: 'sort', seed: 1234 });
    expect(decodeView('mode=lint')).toEqual({ mode: 'lint', seed: null });
  });

  it('ignores anything that isn’t valid', () => {
    expect(decodeView('')).toBeNull();
    expect(decodeView('mode=admin')).toBeNull();
    expect(decodeView('mode=sort&seed=-4')).toEqual({ mode: 'sort', seed: null });
    expect(decodeView('mode=sort&seed=99999999999')).toEqual({ mode: 'sort', seed: null });
    expect(decodeView('mode=sort&seed=1e3')).toEqual({ mode: 'sort', seed: null });
    expect(decodeView('mode=map&seed=12')).toEqual({ mode: 'map', seed: null });
  });
});
