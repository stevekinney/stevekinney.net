import { describe, expect, it } from 'vitest';

import type { Scenario } from './budget';
import { findPreset } from './presets';
import { decodeState, encodeState } from './share-link';

const lean = findPreset('lean')?.scenario as Scenario;
const heavy = findPreset('mcp-heavy')?.scenario as Scenario;

describe('share links', () => {
  it('round-trips the capacity, every term, the preset, and the pinned scenario', () => {
    const encoded = encodeState({ scenario: lean, presetId: 'lean', pinned: heavy });

    expect(decodeState(encoded)).toEqual({ scenario: lean, presetId: 'lean', pinned: heavy });
  });

  it('round-trips without a pin or a preset', () => {
    const encoded = encodeState({ scenario: lean, presetId: null, pinned: null });

    expect(encoded).not.toContain('a=');
    expect(decodeState(encoded)).toEqual({ scenario: lean, presetId: null, pinned: null });
  });

  it('carries only numbers and a preset name', () => {
    const encoded = encodeState({ scenario: lean, presetId: 'lean', pinned: heavy });

    expect([...new URLSearchParams(encoded).keys()].sort()).toEqual(
      ['a', 'c', 'g', 'h', 'i', 'm', 'preset', 't'].sort(),
    );
    expect(encoded).toMatch(/^[A-Za-z0-9=&,%-]+$/);
  });

  it('keeps an over-committed scenario as it is', () => {
    const over = { ...lean, history: 900_000 };

    expect(
      decodeState(encodeState({ scenario: over, presetId: null, pinned: null }))?.scenario,
    ).toEqual(over);
  });

  it('ignores an unknown preset', () => {
    const encoded = `${encodeState({ scenario: lean, presetId: null, pinned: null })}&preset=nope`;

    expect(decodeState(encoded)?.presetId).toBeNull();
  });

  it('refuses a link with a missing or invalid number', () => {
    expect(decodeState('')).toBeNull();
    expect(decodeState('c=1000000&i=1&h=1&t=1&g=1')).toBeNull();
    expect(decodeState('c=1000000&i=-5&h=1&t=1&g=1&m=1')).toBeNull();
    expect(decodeState('c=lots&i=1&h=1&t=1&g=1&m=1')).toBeNull();
    expect(decodeState('c=0&i=1&h=1&t=1&g=1&m=1')).toBeNull();
    expect(decodeState('c=99999999999&i=1&h=1&t=1&g=1&m=1')).toBeNull();
  });

  it('drops a malformed pin and keeps the rest', () => {
    const encoded = `${encodeState({ scenario: lean, presetId: null, pinned: null })}&a=1,2,3`;

    expect(decodeState(encoded)).toEqual({ scenario: lean, presetId: null, pinned: null });
  });
});
