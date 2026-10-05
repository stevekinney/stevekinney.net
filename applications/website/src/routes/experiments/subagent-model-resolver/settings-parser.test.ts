import { describe, expect, it } from 'vitest';

import { effectiveSettings } from './effective-settings';
import type { SettingsFile } from './effective-settings';
import { parseForceValue, parseSettingsFile } from './settings-parser';

describe('parseSettingsFile', () => {
  it('reads the env vars and the top-level model', () => {
    const parsed = parseSettingsFile(
      JSON.stringify({
        model: 'sonnet',
        env: { CLAUDE_CODE_SUBAGENT_MODEL: 'haiku', CLAUDE_CODE_SUBAGENT_MODEL_FORCE: 1 },
      }),
    );

    expect(parsed).toEqual({
      mainModel: 'sonnet',
      environmentModel: 'haiku',
      force: '1',
      warnings: [],
    });
  });

  it('warns about comments and trailing commas but still reads the values', () => {
    const parsed = parseSettingsFile('{ // hi\n "model": "opus", }');

    expect(parsed.mainModel).toBe('opus');
    expect(parsed.warnings).toHaveLength(1);
  });

  it('warns about a file that is not JSON or not an object', () => {
    expect(parseSettingsFile('{{').warnings).toHaveLength(1);
    expect(parseSettingsFile('[1]').warnings).toHaveLength(1);
  });
});

describe('parseForceValue', () => {
  it('counts 1 and true as on, and 0, false, and empty as off', () => {
    expect(parseForceValue('1').on).toBe(true);
    expect(parseForceValue('"true"').on).toBe(true);
    expect(parseForceValue('0').on).toBe(false);
    expect(parseForceValue('False').on).toBe(false);
    expect(parseForceValue('').on).toBe(false);
    expect(parseForceValue(null)).toEqual({ on: false, recognized: true });
  });

  it('treats anything else as off and unrecognized', () => {
    expect(parseForceValue('maybe')).toEqual({ on: false, recognized: false });
  });
});

describe('effectiveSettings', () => {
  const file = (id: string, scope: SettingsFile['scope'], contents: object): SettingsFile => ({
    id,
    path: `${id}.json`,
    scope,
    text: JSON.stringify(contents),
  });
  const files = [
    file('user', 'user', { model: 'haiku', env: { CLAUDE_CODE_SUBAGENT_MODEL: 'haiku' } }),
    file('project', 'project', { model: 'sonnet' }),
    file('local', 'project-local', { env: { CLAUDE_CODE_SUBAGENT_MODEL: 'opus' } }),
  ];

  it('prefers project-local over project over user, and names the file', () => {
    const settings = effectiveSettings(files, ['managed', 'project-local', 'project', 'user']);

    expect(settings.environmentModel).toMatchObject({ raw: 'opus' });
    expect(settings.environmentModel?.from.path).toBe('local.json');
    expect(settings.mainModel).toMatchObject({ raw: 'sonnet' });
    expect(settings.mainModel?.from.path).toBe('project.json');
  });

  it('follows an edited precedence', () => {
    const settings = effectiveSettings(files, ['user', 'project', 'project-local', 'managed']);

    expect(settings.environmentModel?.raw).toBe('haiku');
    expect(settings.mainModel?.raw).toBe('haiku');
  });

  it('warns about a FORCE value it does not recognize', () => {
    const settings = effectiveSettings(
      [file('a', 'user', { env: { CLAUDE_CODE_SUBAGENT_MODEL_FORCE: 'sure' } })],
      ['user'],
    );

    expect(settings.warnings).toHaveLength(1);
  });
});
