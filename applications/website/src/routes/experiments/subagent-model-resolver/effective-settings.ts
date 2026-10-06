import { parseForceValue, parseSettingsFile } from './settings-parser';
import type { SettingsValues } from './settings-parser';

/** Where a settings file comes from. */
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

export type SettingsFile = {
  id: string;
  path: string;
  scope: SettingsScope;
  text: string;
};

/** A value from the highest-priority settings file that has one, and the file it came from. */
export type SettingsValue = { raw: string; from: SettingsFile };

export type EffectiveSettings = {
  environmentModel: SettingsValue | null;
  force: SettingsValue | null;
  mainModel: SettingsValue | null;
  warnings: { path: string; message: string }[];
};

export const effectiveSettings = (
  files: SettingsFile[],
  precedence: SettingsScope[],
): EffectiveSettings => {
  const rank = (scope: SettingsScope): number => precedence.indexOf(scope);
  const ordered = [...files].sort((first, second) => rank(first.scope) - rank(second.scope));

  const parsed = ordered.map((file) => ({ file, values: parseSettingsFile(file.text) }));
  const warnings = parsed.flatMap(({ file, values }) =>
    values.warnings.map((message) => ({ path: file.path, message })),
  );

  const pick = (key: keyof Omit<SettingsValues, 'warnings'>): SettingsValue | null => {
    for (const { file, values } of parsed) {
      const raw = values[key];
      if (raw !== null) return { raw, from: file };
    }

    return null;
  };

  const force = pick('force');
  if (force && !parseForceValue(force.raw).recognized) {
    warnings.push({
      path: force.from.path,
      message: `FORCE is set to \`${force.raw}\`. Claude Code documents \`1\`, so this counts as off.`,
    });
  }

  return {
    environmentModel: pick('environmentModel'),
    force,
    mainModel: pick('mainModel'),
    warnings,
  };
};
