import type { SettingsScope } from './effective-settings';

/**
 * Where an agent definition comes from, highest priority first: managed
 * settings, the `--agents` flag, the project, the user, then plugins.
 */
export type AgentScope = 'managed' | 'cli' | 'project' | 'user' | 'plugin';

export const agentScopes: AgentScope[] = ['managed', 'cli', 'project', 'user', 'plugin'];

export const agentScopeLabels: Record<AgentScope, string> = {
  managed: 'Managed',
  cli: '--agents flag',
  project: 'Project',
  user: 'User',
  plugin: 'Plugin',
};

/** Scopes a person can pick for an uploaded folder. The flag is typed in, not uploaded. */
export const uploadableAgentScopes: AgentScope[] = ['managed', 'project', 'user', 'plugin'];

export const scopeRank = (scope: AgentScope): number => agentScopes.indexOf(scope);

export const pathSegments = (path: string): string[] =>
  path.split(/[\\/]/).filter((segment) => segment !== '' && segment !== '.');

const isManagedSegment = (segment: string): boolean =>
  /^(claudecode|claude-code|managed|managed-settings(\.d)?)$/i.test(segment);

/** A folder named like someone's home: `~`, `home`, `Users/<name>`, or `home/<name>`. */
const isHomeBefore = (segments: string[], index: number): boolean => {
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
 * Guesses an agent file's scope from its path. A browser only reveals the
 * path inside the folder someone dropped, so a project's `agents` folder and
 * a user's look the same unless the path includes the home folder. That's
 * why the person can correct any guess.
 */
export const guessAgentScope = (path: string): AgentScope => {
  const segments = pathSegments(path);
  const agentsIndex = segments.indexOf('agents');
  const leading = agentsIndex === -1 ? segments : segments.slice(0, agentsIndex);

  if (leading.some(isManagedSegment)) return 'managed';
  if (
    leading.some((segment) => segment.toLowerCase() === 'plugins' || segment === '.claude-plugin')
  ) {
    return 'plugin';
  }

  const claudeIndex = leading.lastIndexOf('.claude');
  if (claudeIndex === -1) {
    // `<plugin>/agents/` has no `.claude`, and neither does a lone file.
    return agentsIndex > 0 ? 'plugin' : 'project';
  }

  return isHomeBefore(leading, claudeIndex) ? 'user' : 'project';
};

export const guessSettingsScope = (path: string): SettingsScope => {
  const segments = pathSegments(path);
  const base = segments.at(-1)?.toLowerCase() ?? '';

  if (base.startsWith('managed-settings') || segments.some(isManagedSegment)) return 'managed';
  if (base === 'settings.local.json') return 'project-local';

  const claudeIndex = segments.lastIndexOf('.claude');

  return claudeIndex !== -1 && isHomeBefore(segments, claudeIndex) ? 'user' : 'project';
};

/** The folder an agent definition's `agents` tree sits under, as path segments. */
export const agentsRootOf = (path: string): string[] => {
  const segments = pathSegments(path);
  const agentsIndex = segments.indexOf('agents');

  return agentsIndex === -1 ? segments.slice(0, -1) : segments.slice(0, agentsIndex + 1);
};

/** The directory whose `.claude/agents` holds a project definition, as path segments. */
export const projectDirectoryOf = (path: string): string[] => {
  const root = agentsRootOf(path);
  const parent = root.slice(0, -1);

  return parent.at(-1) === '.claude' ? parent.slice(0, -1) : parent;
};

/**
 * Whether `directory` is the working directory or one of its ancestors. The
 * working directory may be an absolute path while a dropped folder's path
 * starts at the folder itself, so the directory may appear anywhere in it.
 */
export const containsWorkingDirectory = (
  directory: string[],
  workingDirectory: string[],
): boolean => {
  if (directory.length === 0) return true;

  for (let offset = 0; offset + directory.length <= workingDirectory.length; offset += 1) {
    if (directory.every((segment, index) => workingDirectory[offset + index] === segment)) {
      return true;
    }
  }

  return false;
};
