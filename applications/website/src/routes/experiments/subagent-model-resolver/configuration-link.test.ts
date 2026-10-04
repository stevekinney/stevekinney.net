import { describe, expect, it } from 'vitest';

import { decodeConfiguration, encodeConfiguration } from './configuration-link';
import type { SharedState } from './configuration-link';
import { baseConfiguration, findPreset } from './presets';
import { defaultRange, v } from './versions';

const state: SharedState = {
  configuration: {
    ...baseConfiguration,
    definitionModel: 'opus',
    environmentModel: 'haiku',
    version: v(250),
  },
  presetId: null,
  range: defaultRange,
};

describe('configuration links', () => {
  it('round-trips a configuration', () => {
    const encoded = encodeConfiguration(state);

    expect(decodeConfiguration(encoded, { ...state, configuration: baseConfiguration })).toEqual(
      state,
    );
  });

  it('round-trips every preset, a custom range, and the other controls', () => {
    const preset = findPreset('explore-cap');
    if (!preset) throw new Error('missing');
    const custom: SharedState = {
      configuration: {
        ...preset.configuration,
        invocationModel: 'fable',
        resumed: true,
        force: true,
        mainModel: 'unrecognized',
        providerGroup: 'uncapped',
      },
      presetId: preset.id,
      range: { first: v(200), last: v(300) },
    };

    expect(decodeConfiguration(encodeConfiguration(custom), state)).toEqual(custom);
  });

  it('keeps only the resolver configuration in the link', () => {
    const encoded = encodeConfiguration(state);

    expect([...new URLSearchParams(encoded).keys()].sort()).toEqual([
      'definition',
      'environment',
      'force',
      'invocation',
      'kind',
      'main',
      'provider',
      'resumed',
      'version',
    ]);
  });

  it('ignores values that aren’t valid and falls back to what it has', () => {
    const decoded = decodeConfiguration(
      'kind=nonsense&definition=gpt&invocation=inherit&environment=bananas&main=oops&provider=x&version=hello&from=2.1.300&to=2.1.100',
      state,
    );

    expect(decoded?.configuration).toEqual(state.configuration);
    expect(decoded?.range).toEqual(defaultRange);
  });

  it('returns null for an empty query', () => {
    expect(decodeConfiguration('', state)).toBeNull();
    expect(decodeConfiguration('utm_source=x', state)).toBeNull();
  });
});
