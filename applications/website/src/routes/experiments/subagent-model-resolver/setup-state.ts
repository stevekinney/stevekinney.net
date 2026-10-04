import { defaultSettingsPrecedence } from './effective-settings';
import type { SettingsFile, SettingsScope } from './effective-settings';
import type { Comparison, UploadedAgentFile } from './fleet';
import type { AgentScope } from './scopes';

/** Everything the "Check your own setup" section keeps, apart from the resolver's controls. */
export type SetupState = {
  agentFiles: UploadedAgentFile[];
  settingsFiles: SettingsFile[];
  /** Scope corrections for uploaded agent folders, by group key. */
  agentScopes: Record<string, AgentScope>;
  settingsPrecedence: SettingsScope[];
  cliAgentsText: string;
  workingDirectory: string;
  shellEnvironmentText: string;
  pastedText: string;
  versionText: string;
  comparison: Comparison;
  /** The next drop or pick's number, so two folders with the same layout stay apart. */
  nextBatch: number;
};

export const initialSetup = (): SetupState => ({
  agentFiles: [],
  settingsFiles: [],
  agentScopes: {},
  settingsPrecedence: [...defaultSettingsPrecedence],
  cliAgentsText: '',
  workingDirectory: '',
  shellEnvironmentText: '',
  pastedText: '',
  versionText: '',
  comparison: { mode: 'boundary' },
  nextBatch: 0,
});
