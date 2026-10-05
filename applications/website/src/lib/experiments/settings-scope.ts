/** Where a Claude Code settings file comes from. */
export type SettingsScope = 'managed' | 'project-local' | 'project' | 'user';

export const settingsScopeLabels: Record<SettingsScope, string> = {
  managed: 'Managed',
  'project-local': 'Project, local',
  project: 'Project',
  user: 'User',
};

/** The documented order, highest priority first. It's shown as an assumption the person can edit. */
export const defaultSettingsPrecedence: SettingsScope[] = [
  'managed',
  'project-local',
  'project',
  'user',
];

export const pathSegments = (path: string): string[] =>
  path.split(/[\\/]/).filter((segment) => segment !== '' && segment !== '.');

/** A folder named like the place managed settings are deployed. */
export const isManagedSegment = (segment: string): boolean =>
  /^(claudecode|claude-code|managed|managed-settings(\.d)?)$/i.test(segment);

/** A folder named like someone's home: `~`, `home`, `Users/<name>`, or `home/<name>`. */
export const isHomeBefore = (segments: string[], index: number): boolean => {
  const before = segments[index - 1];
  const twoBefore = segments[index - 2];

  return (
    before === '~' ||
    before?.toLowerCase() === 'home' ||
    twoBefore?.toLowerCase() === 'users' ||
    twoBefore?.toLowerCase() === 'home'
  );
};

/**
 * Guesses a settings file's scope from its path. A browser only reveals the
 * path inside whatever was dropped, so this is a guess the person can correct.
 */
export const guessSettingsScope = (path: string): SettingsScope => {
  const segments = pathSegments(path);
  const base = segments.at(-1)?.toLowerCase() ?? '';

  if (base.startsWith('managed-settings') || segments.some(isManagedSegment)) return 'managed';
  if (base === 'settings.local.json') return 'project-local';

  const claudeIndex = segments.lastIndexOf('.claude');

  return claudeIndex !== -1 && isHomeBefore(segments, claudeIndex) ? 'user' : 'project';
};
