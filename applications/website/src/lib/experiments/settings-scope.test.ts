import { describe, expect, it } from 'vitest';

import { guessSettingsScope } from './settings-scope';

describe('guessSettingsScope', () => {
  it('tells the settings files apart', () => {
    expect(guessSettingsScope('settings.local.json')).toBe('project-local');
    expect(guessSettingsScope('/Users/me/.claude/settings.json')).toBe('user');
    expect(guessSettingsScope('repo/.claude/settings.json')).toBe('project');
    expect(guessSettingsScope('managed-settings.json')).toBe('managed');
  });
});
