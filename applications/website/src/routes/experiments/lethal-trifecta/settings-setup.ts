import { defaultSettingsPrecedence } from '$lib/experiments/settings-scope';
import type { SettingsScope } from '$lib/experiments/settings-scope';

import type { SettingsFile } from './settings-import';

/** The settings files on the page, and how to rank them. None of it goes in a link. */
export type SettingsSetup = {
  files: SettingsFile[];
  precedence: SettingsScope[];
  nextId: number;
  pasteText: string;
  pasteScope: SettingsScope;
};

export const initialSettingsSetup = (): SettingsSetup => ({
  files: [],
  precedence: [...defaultSettingsPrecedence],
  nextId: 0,
  pasteText: '',
  pasteScope: 'project',
});
