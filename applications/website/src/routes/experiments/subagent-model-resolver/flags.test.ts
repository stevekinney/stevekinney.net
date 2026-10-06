import { describe, expect, it } from 'vitest';

import { describeFlags } from './flags';
import { baseConfiguration, findPreset } from './presets';
import { resolve } from './resolve';
import type { ResolverConfiguration } from './resolve';
import { v } from './versions';

const flagsFor = (configuration: ResolverConfiguration) =>
  describeFlags(configuration, resolve(configuration));

const preset = (id: string): ResolverConfiguration => {
  const found = findPreset(id);
  if (!found) throw new Error(id);

  return found.configuration;
};

describe('describeFlags', () => {
  it('flags the classic trap as a silent move up to a pricier tier', () => {
    const flags = flagsFor(preset('classic-trap'));

    expect(flags.map((flag) => flag.id)).toEqual(['flips-at-reversal']);
    expect(flags[0].title).toBe('Flips at 2.1.251');
    expect(flags[0].severity).toBe('warning');
    expect(flags[0].body).toContain('`haiku` before that release and `opus` from it on');
    expect(flags[0].body).toContain('up to a more expensive tier');
  });

  it('flags a move down to a cheaper tier', () => {
    const flags = flagsFor({
      ...baseConfiguration,
      definitionModel: 'haiku',
      environmentModel: 'opus',
      version: v(278),
    });

    expect(flags[0].body).toContain('down to a cheaper tier');
  });

  it('flags FORCE set too early', () => {
    const ids = flagsFor(preset('force-too-early')).map((flag) => flag.id);

    expect(ids).toContain('force-inert');
    expect(ids).toContain('flips-at-reversal');
  });

  it('flags the env var for Explore and Plan, suggesting FORCE only when it would help', () => {
    const explore = flagsFor(preset('explore-cap'));
    const ids = explore.map((flag) => flag.id);

    expect(ids).toContain('environment-ignored');
    expect(ids).toContain('explore-cap');
    expect(explore.find((flag) => flag.id === 'environment-ignored')?.body).toContain('FORCE=1');

    const inherit = flagsFor({ ...preset('explore-cap'), environmentModel: 'inherit' });
    expect(inherit.find((flag) => flag.id === 'environment-ignored')?.body).not.toContain(
      'FORCE=1',
    );
    expect(flagsFor({ ...preset('explore-cap'), kind: 'plan' }).map((flag) => flag.id)).toContain(
      'environment-ignored',
    );
  });

  it('flags a fork under FORCE as exempt', () => {
    const flags = flagsFor({
      ...baseConfiguration,
      kind: 'fork',
      force: true,
      environmentModel: 'haiku',
      version: v(260),
    });

    expect(flags.map((flag) => flag.id)).toEqual(['force-exempt']);
    expect(flags[0].severity).toBe('info');
  });

  it('flags the cap for an unrecognized model before 2.1.284 and not after', () => {
    const base = {
      ...preset('explore-cap'),
      mainModel: 'unrecognized' as const,
      environmentModel: 'unset' as const,
    };

    expect(flagsFor({ ...base, version: v(280) }).map((flag) => flag.id)).toContain('explore-cap');
    expect(flagsFor({ ...base, version: v(285) }).map((flag) => flag.id)).not.toContain(
      'explore-cap',
    );
  });

  it('has nothing to say about a setup with no surprises', () => {
    expect(flagsFor(preset('no-surprises'))).toEqual([]);
  });
});
