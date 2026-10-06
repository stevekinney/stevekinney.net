import { describe, expect, it } from 'vitest';

import { capAtOpus, familyOf, parseModelSetting, tierOf, tierOfModel } from './models';

describe('familyOf', () => {
  it('maps full model IDs to their family by substring', () => {
    expect(familyOf('claude-opus-5-5')).toBe('opus');
    expect(familyOf('claude-sonnet-5-5[1m]')).toBe('sonnet');
    expect(familyOf('us.anthropic.claude-fable-5-1')).toBe('fable');
    expect(familyOf('CLAUDE-HAIKU-5')).toBe('haiku');
  });

  it('returns null for a model it doesn’t know', () => {
    expect(familyOf('gpt-6')).toBeNull();
  });
});

describe('tiers', () => {
  it('orders the families from cheapest to most expensive', () => {
    expect(['haiku', 'sonnet', 'opus', 'fable'].map((family) => tierOf(family as 'haiku'))).toEqual(
      [1, 2, 3, 4],
    );
  });

  it('gives an unrecognized model no tier', () => {
    expect(tierOfModel('unrecognized')).toBeNull();
  });
});

describe('capAtOpus', () => {
  it('lowers fable to opus and leaves everything else alone', () => {
    expect(capAtOpus('fable')).toBe('opus');
    expect(capAtOpus('opus')).toBe('opus');
    expect(capAtOpus('sonnet')).toBe('sonnet');
    expect(capAtOpus('haiku')).toBe('haiku');
    expect(capAtOpus('unrecognized')).toBe('unrecognized');
  });
});

describe('parseModelSetting', () => {
  it('reads empty text as unset and inherit as inherit, ignoring case and quotes', () => {
    expect(parseModelSetting('')).toEqual({ setting: 'unset', unknown: false });
    expect(parseModelSetting(null)).toEqual({ setting: 'unset', unknown: false });
    expect(parseModelSetting(' "Inherit" ')).toEqual({ setting: 'inherit', unknown: false });
  });

  it('maps quoted, mixed-case, and full-ID values to a family', () => {
    expect(parseModelSetting("'Opus'")).toEqual({ setting: 'opus', unknown: false });
    expect(parseModelSetting('"claude-haiku-5"')).toEqual({ setting: 'haiku', unknown: false });
  });

  it('flags a value it can’t map as an unrecognized model', () => {
    expect(parseModelSetting('my-proxy-model')).toEqual({
      setting: 'unrecognized',
      unknown: true,
    });
  });
});
