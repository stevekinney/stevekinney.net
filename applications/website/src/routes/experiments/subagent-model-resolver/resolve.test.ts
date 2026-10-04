import { describe, expect, it } from 'vitest';

import { resolveAcrossVersions } from './across-versions';
import { baseConfiguration, findPreset, presets } from './presets';
import { exploreModel, resolve } from './resolve';
import type { ResolverConfiguration, SubagentKind } from './resolve';
import { versionBoundaries } from './version-boundaries';
import { compareVersions, defaultRange, formatVersion, v } from './versions';

const configure = (overrides: Partial<ResolverConfiguration>): ResolverConfiguration => ({
  ...baseConfiguration,
  ...overrides,
});

const presetConfiguration = (id: string): ResolverConfiguration => {
  const preset = findPreset(id);
  if (!preset) throw new Error(`No preset named ${id}`);

  return preset.configuration;
};

const modelAt = (configuration: ResolverConfiguration, patch: number) =>
  resolve({ ...configuration, version: v(patch) }).model;

const spans = (configuration: ResolverConfiguration): string[] =>
  resolveAcrossVersions(configuration, defaultRange).segments.map(
    (segment) => `${segment.model} ${segment.first.patch}-${segment.last.patch}`,
  );

describe('acceptance 1: the classic trap', () => {
  const trap = presetConfiguration('classic-trap');

  it('resolves to opus on 2.1.278, decided by the definition', () => {
    const resolution = resolve(trap);

    expect(resolution.model).toBe('opus');
    expect(resolution.why).toContain('definition');
    expect(resolution.steps.filter((step) => step.state === 'win')).toHaveLength(1);
    expect(resolution.steps.find((step) => step.state === 'win')?.text).toContain('opus');
    expect(resolution.steps.find((step) => step.state === 'dead')?.text).toContain('haiku');
  });

  it('resolves to haiku on 2.1.250 through the env override', () => {
    const resolution = resolve({ ...trap, version: v(250) });

    expect(resolution.model).toBe('haiku');
    expect(resolution.why).toContain('env var');
    expect(resolution.steps.find((step) => step.state === 'dead')?.text).toContain('overridden');
  });

  it('runs haiku from 190 to 250 and opus from 251 to 289', () => {
    expect(spans(trap)).toEqual(['haiku 190-250', 'opus 251-289']);
  });
});

describe('acceptance 2: FORCE set too early', () => {
  const early = presetConfiguration('force-too-early');

  it('resolves to opus on 2.1.254 and says FORCE is ignored', () => {
    const resolution = resolve(early);

    expect(resolution.model).toBe('opus');
    expect(resolution.steps[0]).toMatchObject({ state: 'dead' });
    expect(resolution.steps[0].text).toContain('ignores it');
  });

  it('runs haiku, then opus, then haiku again', () => {
    expect(spans(early)).toEqual(['haiku 190-250', 'opus 251-256', 'haiku 257-289']);
  });

  it('flips up at 251 and down at 257', () => {
    const { flips } = resolveAcrossVersions(early, defaultRange);

    expect(flips.map((flip) => [flip.version.patch, flip.direction])).toEqual([
      [251, 'more-expensive'],
      [257, 'cheaper'],
    ]);
  });
});

describe('acceptance 3: Explore', () => {
  const explore = presetConfiguration('explore-cap');

  it('resolves to opus on 2.1.278 and records that the env var does not move it', () => {
    const resolution = resolve(explore);

    expect(resolution.model).toBe('opus');
    expect(resolution.exploreCapApplied).toBe(true);
    expect(
      resolution.steps.some((step) => step.state === 'dead' && /env var/.test(step.text)),
    ).toBe(true);
  });

  it('runs haiku before 198 and opus after', () => {
    expect(spans(explore)).toEqual(['haiku 190-197', 'opus 198-289']);
  });

  it('runs fable from 198 on in the uncapped provider group', () => {
    expect(spans({ ...explore, providerGroup: 'uncapped' })).toEqual([
      'haiku 190-197',
      'fable 198-289',
    ]);
  });

  it('inherits an unrecognized model from 284 on in the capped group', () => {
    expect(spans({ ...explore, mainModel: 'unrecognized' })).toEqual([
      'haiku 190-197',
      'opus 198-283',
      'unrecognized 284-289',
    ]);
  });

  it('keeps Explore on opus under FORCE with no env var', () => {
    const forced = configure({
      kind: 'explore',
      force: true,
      environmentModel: 'unset',
      mainModel: 'fable',
      version: v(260),
    });

    expect(resolve(forced).model).toBe('opus');
  });

  it('lets FORCE move Explore when the env var has a model', () => {
    const forced = configure({
      kind: 'explore',
      force: true,
      environmentModel: 'haiku',
      mainModel: 'fable',
      version: v(260),
    });

    expect(resolve(forced).model).toBe('haiku');
  });
});

describe('acceptance 4: inherit', () => {
  const inherit = presetConfiguration('inherit-meaning');

  it('resolves to sonnet on 2.1.194 through the old inherit override', () => {
    const resolution = resolve(inherit);

    expect(resolution.model).toBe('sonnet');
    expect(resolution.why).toContain('inherit');
  });

  it('flips once, at 196, from sonnet to opus', () => {
    const { flips } = resolveAcrossVersions(inherit, defaultRange);

    expect(flips).toHaveLength(1);
    expect(flips[0]).toMatchObject({ from: 'sonnet', to: 'opus' });
    expect(flips[0].version).toEqual(v(196));
    expect(spans(inherit)).toEqual(['sonnet 190-195', 'opus 196-289']);
  });
});

describe('acceptance 5: no surprises', () => {
  it('resolves to sonnet on every version with no flips', () => {
    const calm = presetConfiguration('no-surprises');
    const { segments, flips } = resolveAcrossVersions(calm, defaultRange);

    expect(segments).toHaveLength(1);
    expect(segments[0].model).toBe('sonnet');
    expect(flips).toEqual([]);
  });
});

describe('acceptance 6: a fork under FORCE', () => {
  const fork = configure({
    kind: 'fork',
    force: true,
    environmentModel: 'haiku',
    mainModel: 'opus',
    version: v(260),
  });

  it('resolves to the main model through the fork exception', () => {
    const resolution = resolve(fork);

    expect(resolution.model).toBe('opus');
    expect(resolution.steps[0]).toMatchObject({ state: 'win' });
    expect(resolution.steps[0].text).toContain('Fork exception under FORCE');
  });

  it('exempts a skill with model: inherit the same way', () => {
    expect(resolve({ ...fork, kind: 'skill-inherit' }).model).toBe('opus');
  });
});

describe('acceptance 7: resuming', () => {
  const resumed = configure({
    invocationModel: 'opus',
    definitionModel: 'sonnet',
    resumed: true,
    mainModel: 'haiku',
  });

  it('drops the per-invocation model before 2.1.211', () => {
    const resolution = resolve({ ...resumed, version: v(205) });

    expect(resolution.model).toBe('sonnet');
    expect(resolution.steps[0]).toMatchObject({ state: 'dead' });
    expect(resolution.steps[0].text).toBe(
      'A resume before 2.1.211 drops the per-invocation model.',
    );
  });

  it('keeps it from 2.1.211 on', () => {
    expect(resolve({ ...resumed, version: v(215) }).model).toBe('opus');
  });

  it('keeps it before 2.1.211 when the subagent isn’t being resumed', () => {
    expect(resolve({ ...resumed, resumed: false, version: v(205) }).model).toBe('opus');
  });

  it('falls through to the main model when there is no definition model either', () => {
    expect(resolve({ ...resumed, definitionModel: 'unset', version: v(205) }).model).toBe('haiku');
  });
});

describe('FORCE support', () => {
  it('is ignored before 2.1.257 and applies from it', () => {
    const forced = configure({
      definitionModel: 'opus',
      environmentModel: 'haiku',
      force: true,
      mainModel: 'sonnet',
    });

    expect(modelAt(forced, 256)).toBe('opus');
    expect(modelAt(forced, 257)).toBe('haiku');
  });

  it('puts every subagent on the main model when no env model is usable', () => {
    const forced = configure({
      definitionModel: 'opus',
      environmentModel: 'inherit',
      force: true,
      mainModel: 'sonnet',
      version: v(270),
    });

    expect(resolve(forced).model).toBe('sonnet');
    expect(resolve({ ...forced, kind: 'plan' }).model).toBe('sonnet');
  });

  it('ignores a per-invocation model', () => {
    const forced = configure({
      invocationModel: 'opus',
      environmentModel: 'haiku',
      force: true,
      version: v(270),
    });

    expect(resolve(forced).model).toBe('haiku');
  });
});

describe('built-in Explore', () => {
  it('runs haiku before 2.1.198 whatever the main model is', () => {
    expect(modelAt(configure({ kind: 'explore', mainModel: 'fable' }), 197)).toBe('haiku');
  });

  it('is not capped in the uncapped group', () => {
    const resolution = resolve(
      configure({
        kind: 'explore',
        mainModel: 'fable',
        providerGroup: 'uncapped',
        version: v(250),
      }),
    );

    expect(resolution.model).toBe('fable');
    expect(resolution.exploreCapApplied).toBe(false);
  });

  it('switches an unrecognized model to opus only before 2.1.284', () => {
    expect(exploreModel('unrecognized', 'capped', v(283))).toEqual({
      model: 'opus',
      capApplied: true,
    });
    expect(exploreModel('unrecognized', 'capped', v(284))).toEqual({
      model: 'unrecognized',
      capApplied: false,
    });
    expect(exploreModel('unrecognized', 'uncapped', v(250))).toEqual({
      model: 'unrecognized',
      capApplied: false,
    });
  });

  it('ignores a definition’s model and the env var', () => {
    const resolution = resolve(
      configure({
        kind: 'explore',
        definitionModel: 'haiku',
        environmentModel: 'haiku',
        mainModel: 'sonnet',
        version: v(250),
      }),
    );

    expect(resolution.model).toBe('sonnet');
  });
});

describe('built-in Plan and forks', () => {
  it('runs Plan on the main model and records that the env var does not move it', () => {
    const resolution = resolve(
      configure({ kind: 'plan', environmentModel: 'haiku', mainModel: 'opus' }),
    );

    expect(resolution.model).toBe('opus');
    expect(resolution.steps.some((step) => step.state === 'dead')).toBe(true);
  });

  it('runs a fork on the main model and notes that forking wasn’t default before 2.1.232', () => {
    const early = resolve(configure({ kind: 'fork', mainModel: 'opus', version: v(231) }));
    const late = resolve(configure({ kind: 'fork', mainModel: 'opus', version: v(232) }));

    expect(early.model).toBe('opus');
    expect(early.steps.some((step) => step.state === 'info')).toBe(true);
    expect(late.steps.some((step) => step.state === 'info')).toBe(false);
  });
});

describe('definitions from 2.1.251 on', () => {
  it('prefers per-invocation, then the definition, then the env var, then the main model', () => {
    const everything = configure({
      invocationModel: 'fable',
      definitionModel: 'opus',
      environmentModel: 'haiku',
      mainModel: 'sonnet',
    });

    expect(resolve(everything).model).toBe('fable');
    expect(resolve({ ...everything, invocationModel: 'unset' }).model).toBe('opus');
    expect(
      resolve({ ...everything, invocationModel: 'unset', definitionModel: 'unset' }).model,
    ).toBe('haiku');
    expect(
      resolve({
        ...everything,
        invocationModel: 'unset',
        definitionModel: 'unset',
        environmentModel: 'unset',
      }).model,
    ).toBe('sonnet');
  });

  it('treats a definition of inherit as the main model', () => {
    expect(
      resolve(
        configure({ definitionModel: 'inherit', environmentModel: 'haiku', mainModel: 'opus' }),
      ).model,
    ).toBe('opus');
  });

  it('treats an env var of inherit as unset', () => {
    expect(resolve(configure({ environmentModel: 'inherit', mainModel: 'opus' })).model).toBe(
      'opus',
    );
  });

  it('treats a skill as having model: inherit and the general-purpose agent as having none', () => {
    const settings = {
      definitionModel: 'haiku' as const,
      environmentModel: 'fable' as const,
      mainModel: 'sonnet' as const,
    };

    expect(resolve(configure({ ...settings, kind: 'skill-inherit' })).model).toBe('sonnet');
    expect(resolve(configure({ ...settings, kind: 'general-purpose' })).model).toBe('fable');
  });

  it('records a skip step for each absent source', () => {
    const resolution = resolve(configure({ definitionModel: 'opus' }));

    expect(resolution.steps.filter((step) => step.state === 'skip').length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('keeps an unrecognized value as the model it names', () => {
    expect(resolve(configure({ definitionModel: 'unrecognized' })).model).toBe('unrecognized');
  });
});

describe('definitions before 2.1.251', () => {
  it('prefers per-invocation, then the definition, then the main model when the env var is unset', () => {
    const base = configure({
      invocationModel: 'fable',
      definitionModel: 'opus',
      mainModel: 'sonnet',
      version: v(240),
    });

    expect(resolve(base).model).toBe('fable');
    expect(resolve({ ...base, invocationModel: 'unset' }).model).toBe('opus');
    expect(resolve({ ...base, invocationModel: 'unset', definitionModel: 'inherit' }).model).toBe(
      'sonnet',
    );
    expect(resolve({ ...base, invocationModel: 'unset', definitionModel: 'unset' }).model).toBe(
      'sonnet',
    );
  });

  it('lets the env var override both other sources', () => {
    const resolution = resolve(
      configure({
        invocationModel: 'fable',
        definitionModel: 'opus',
        environmentModel: 'haiku',
        version: v(240),
      }),
    );

    expect(resolution.model).toBe('haiku');
    expect(resolution.steps.filter((step) => step.state === 'dead')).toHaveLength(2);
  });

  it('forces the main model when the env var is inherit before 2.1.196, but not after', () => {
    const base = configure({
      definitionModel: 'opus',
      environmentModel: 'inherit',
      mainModel: 'sonnet',
      version: v(195),
    });

    expect(resolve(base).model).toBe('sonnet');
    expect(resolve({ ...base, version: v(196) }).model).toBe('opus');
  });
});

describe('version boundaries', () => {
  const everyKind: SubagentKind[] = [
    'custom',
    'general-purpose',
    'explore',
    'plan',
    'fork',
    'skill-inherit',
  ];
  const settings = [
    'unset',
    'inherit',
    'haiku',
    'sonnet',
    'opus',
    'fable',
    'unrecognized',
  ] as const;
  const mains = ['haiku', 'sonnet', 'opus', 'fable', 'unrecognized'] as const;
  const boundaryVersions = new Set(
    versionBoundaries.filter((row) => row.changesResolution).map((row) => row.version.patch),
  );

  it('only ever changes an answer at a release listed with changesResolution', () => {
    const offenders: string[] = [];

    for (const kind of everyKind) {
      for (const definitionModel of settings) {
        for (const environmentModel of settings) {
          for (const invocationModel of ['unset', 'haiku', 'fable'] as const) {
            for (const force of [false, true]) {
              for (const resumed of [false, true]) {
                for (const providerGroup of ['capped', 'uncapped'] as const) {
                  for (const mainModel of mains) {
                    const configuration = configure({
                      kind,
                      definitionModel,
                      environmentModel,
                      invocationModel,
                      force,
                      resumed,
                      providerGroup,
                      mainModel,
                    });
                    const { flips } = resolveAcrossVersions(configuration, defaultRange);

                    for (const flip of flips) {
                      if (!boundaryVersions.has(flip.version.patch)) {
                        offenders.push(`${kind} ${formatVersion(flip.version)}`);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    expect([...new Set(offenders)]).toEqual([]);
  });

  it('lists the boundaries oldest first, each with a source', () => {
    const versions = versionBoundaries.map((row) => row.version);

    expect([...versions].sort(compareVersions)).toEqual(versions);
    expect(new Set(versionBoundaries.map((row) => row.source))).toEqual(
      new Set(['docs only', 'changelog', 'changelog + docs']),
    );
    expect(versionBoundaries.filter((row) => row.isReversal)).toHaveLength(1);
  });
});

describe('presets', () => {
  it('loads five scenarios, each on its own version', () => {
    expect(presets.map((preset) => formatVersion(preset.configuration.version))).toEqual([
      '2.1.278',
      '2.1.254',
      '2.1.278',
      '2.1.194',
      '2.1.278',
    ]);
  });
});
