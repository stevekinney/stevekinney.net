import { flipDirection } from './across-versions';
import type { FlipDirection } from './across-versions';
import { parseAgentFile } from './agent-definition';
import { resolvePrecedence } from './agent-precedence';
import type { PrecedenceStatus } from './agent-precedence';
import { effectiveSettings } from './effective-settings';
import type { SettingsFile, SettingsScope } from './effective-settings';
import { parseLenientJson } from './lenient-json';
import { parseModelSetting } from './models';
import type { ModelSetting, ModelValue } from './models';
import { parsePastedOutput } from './paste-parser';
import type { PastedAgent } from './paste-parser';
import { resolve } from './resolve';
import type { ProviderGroup, ResolverConfiguration, SubagentKind } from './resolve';
import {
  agentScopeLabels,
  agentsRootOf,
  guessAgentScope,
  pathSegments,
  projectDirectoryOf,
} from './scopes';
import type { AgentScope } from './scopes';
import { parseForceValue } from './settings-parser';
import { thresholds } from './version-boundaries';
import {
  clampVersion,
  compareVersions,
  findVersion,
  formatVersion,
  isInRange,
  parseVersion,
} from './versions';
import type { Version, VersionRange } from './versions';

/** An agent file the person dropped or picked, read as text. */
export type UploadedAgentFile = {
  id: string;
  /** Which drop or pick it came from, so two folders with the same layout stay apart. */
  batch: number;
  path: string;
  text: string;
};

export type Comparison = { mode: 'boundary' } | { mode: 'planner'; from: string; to: string };

export type FleetInput = {
  agentFiles: UploadedAgentFile[];
  /** Scope corrections, by `agentGroupKey`. Anything missing is guessed from the path. */
  agentScopes: Record<string, AgentScope>;
  settingsFiles: SettingsFile[];
  settingsPrecedence: SettingsScope[];
  /** The JSON given to `claude --agents`. */
  cliAgentsText: string;
  workingDirectory: string;
  shellEnvironmentText: string;
  pastedText: string;
  versionText: string;
  /** What the resolver controls say, used wherever the files and the paste don't. */
  controls: ResolverConfiguration;
  range: VersionRange;
  comparison: Comparison;
};

export type DefinitionSource = 'upload' | 'paste' | 'cli';

export type AgentDefinition = {
  id: string;
  name: string;
  path: string;
  scope: AgentScope;
  /** The key the person's scope correction is stored under. */
  groupKey: string;
  source: DefinitionSource;
  /** The raw `model:` text, or `null` when there's no `model:` line. */
  rawModel: string | null;
  declared: ModelSetting;
  unknownModel: boolean;
  description: string;
  warnings: string[];
  /** The original text, kept only for an uploaded file, so a patched copy can be offered. */
  fileText: string | null;
  patchable: boolean;
  tree: string;
  projectDirectory: string[];
};

export const agentGroupKey = (batch: number, path: string): string =>
  `${batch}:${agentsRootOf(path).join('/')}`;

export type BuiltInName = 'Explore' | 'Plan' | 'general-purpose';

export const builtIns: { name: BuiltInName; kind: SubagentKind }[] = [
  { name: 'Explore', kind: 'explore' },
  { name: 'Plan', kind: 'plan' },
  { name: 'general-purpose', kind: 'general-purpose' },
];

export type FleetRow = {
  id: string;
  name: string;
  /** `null` for a built-in. */
  definition: AgentDefinition | null;
  kind: SubagentKind;
  scopeLabel: string;
  /** What the file declares, such as `opus`, `inherit`, or `not set`. */
  declares: string;
  status: PrecedenceStatus;
  /** The definition that shadows this one. */
  shadowedBy: AgentDefinition | null;
  /** This definition replaces the built-in of the same name. */
  overridesBuiltIn: boolean;
  /** The first and second comparison columns. `null` for a shadowed definition, which never runs. */
  before: ModelValue | null;
  after: ModelValue | null;
  changed: boolean;
  direction: FlipDirection | null;
};

export type VerdictId =
  'nothing-can-flip' | 'force-on' | 'force-inert' | 'no-changes' | 'changed' | 'will-change';

export type Verdict = { id: VerdictId; text: string };

export type FleetContext = {
  environmentModel: ModelSetting;
  force: boolean;
  forceRaw: string | null;
  mainModel: ModelValue;
  providerGroup: ProviderGroup;
  resumed: boolean;
  version: Version;
};

export type FleetAnalysis = {
  /** Whether the person has given any files, pasted text, or typed values. */
  hasInput: boolean;
  context: FleetContext;
  assumptions: string[];
  warnings: { source: string; message: string }[];
  definitions: AgentDefinition[];
  rows: FleetRow[];
  columns: { before: Version; after: Version; beforeLabel: string; afterLabel: string };
  verdict: Verdict;
  summary: { movesUp: number; movesDown: number; moved: number; unchanged: number };
  /** Rows that run, so what "M" means in "N of M". */
  agentCount: number;
  noModelLineCount: number;
  shadowedCount: number;
  ambiguousCount: number;
};

export type FleetFilter = 'all' | 'changed' | 'no-model' | 'shadowed';

export const rowMatchesFilter = (row: FleetRow, filter: FleetFilter): boolean => {
  if (filter === 'changed') return row.changed;
  if (filter === 'no-model') return row.definition !== null && row.definition.rawModel === null;
  if (filter === 'shadowed') return row.status.kind === 'shadowed';

  return true;
};

const describeDeclared = (definition: AgentDefinition): string => {
  if (definition.rawModel === null) return 'not set';
  if (definition.rawModel === '') return 'not set (empty)';
  if (definition.unknownModel) return `${definition.rawModel} (unknown)`;

  return definition.declared === 'unset' ? 'not set' : definition.rawModel;
};

export const isAgentFile = (path: string): boolean => {
  if (!/\.md$/i.test(path)) return false;
  const segments = pathSegments(path);

  // A lone file is assumed to be an agent. Inside a folder, it must be under an `agents` folder.
  return segments.length === 1 || segments.slice(0, -1).includes('agents');
};

const settingsName = /^(managed-)?settings(\.local)?\.json$/i;
const managedFolders = new Set(['claudecode', 'claude-code']);

/**
 * Whether a path is a Claude settings file. A lone file is whatever the person chose. Inside a
 * dropped folder it has to live somewhere Claude reads settings from, `.claude` or a managed
 * settings folder, so an editor's `.vscode/settings.json` isn't taken for one.
 */
export const isSettingsPath = (path: string): boolean => {
  const segments = pathSegments(path);
  const name = segments.at(-1) ?? '';
  if (!settingsName.test(name)) return false;

  const folders = segments.slice(0, -1).map((segment) => segment.toLowerCase());

  return (
    folders.length === 0 ||
    folders.includes('.claude') ||
    folders.some((folder) => managedFolders.has(folder)) ||
    name.toLowerCase().startsWith('managed-')
  );
};

/** Whether a dropped file is one this tool reads: an agent definition or a settings file. */
export const isSetupFile = (path: string): boolean => isAgentFile(path) || isSettingsPath(path);

export const isIgnoredFolder = (path: string): boolean =>
  /(^|[\\/])(node_modules|\.git)$/.test(path);

const buildDefinitions = (
  input: FleetInput,
  warnings: FleetAnalysis['warnings'],
): AgentDefinition[] => {
  const definitions: AgentDefinition[] = [];

  for (const file of input.agentFiles) {
    if (!isAgentFile(file.path)) continue;

    const parsed = parseAgentFile(file.path, file.text);
    const groupKey = agentGroupKey(file.batch, file.path);
    const scope = input.agentScopes[groupKey] ?? guessAgentScope(file.path);

    for (const message of parsed.warnings) warnings.push({ source: file.path, message });

    definitions.push({
      id: file.id,
      name: parsed.name,
      path: file.path,
      scope,
      groupKey,
      source: 'upload',
      rawModel: parsed.rawModel,
      declared: parsed.declared,
      unknownModel: parsed.unknownModel,
      description: parsed.description,
      warnings: parsed.warnings,
      fileText: file.text,
      patchable: parsed.patchable,
      tree: `${file.batch}:${agentsRootOf(file.path).join('/')}`,
      projectDirectory: scope === 'project' ? projectDirectoryOf(file.path) : [],
    });
  }

  if (input.cliAgentsText.trim() !== '') {
    const parsed = parseLenientJson(input.cliAgentsText);
    const value = parsed?.value;

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      warnings.push({
        source: '--agents',
        message:
          'The --agents value should be a JSON object that maps each agent’s name to its settings.',
      });
    } else {
      for (const [name, entry] of Object.entries(value as Record<string, unknown>)) {
        const settings =
          typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : {};
        const rawModel = typeof settings.model === 'string' ? settings.model : null;
        const model = parseModelSetting(rawModel);

        definitions.push({
          id: `cli:${name}`,
          name,
          path: `--agents ${name}`,
          scope: 'cli',
          groupKey: 'cli',
          source: 'cli',
          rawModel,
          declared: model.setting,
          unknownModel: model.unknown,
          description: typeof settings.description === 'string' ? settings.description : '',
          warnings: [],
          fileText: null,
          patchable: false,
          tree: 'cli',
          projectDirectory: [],
        });
      }
    }
  }

  // Pasted agent lines only name a file and its model, so an uploaded copy of the same name and
  // scope is the same file and wins. A pasted line from another scope is a different definition,
  // and precedence decides between them.
  const uploaded = definitions.filter((definition) => definition.source === 'upload');
  const sameFile = (definition: AgentDefinition, agent: PastedAgent, scope: string): boolean => {
    if (definition.name !== agent.name || definition.scope !== scope) return false;
    // User and managed agents live in one place, so the same scope and name is the same file.
    if (scope !== 'project') return true;

    // Project agents depend on the project: the shorter path has to be the end of the longer.
    const first = pathSegments(definition.path);
    const second = pathSegments(agent.path);
    const [short, long] = first.length <= second.length ? [first, second] : [second, first];

    return short.every((segment, index) => segment === long[long.length - short.length + index]);
  };
  const pasted = parsePastedOutput(input.pastedText);

  const addPasted = (agent: PastedAgent): void => {
    const scope = guessAgentScope(agent.path);
    if (uploaded.some((definition) => sameFile(definition, agent, scope))) return;

    const model = parseModelSetting(agent.model);

    definitions.push({
      id: `paste:${agent.path}:${agent.name}:${agent.model}`,
      name: agent.name,
      path: agent.path,
      scope,
      groupKey: 'paste',
      source: 'paste',
      rawModel: agent.model,
      declared: model.setting,
      unknownModel: model.unknown,
      description: '',
      warnings: model.unknown
        ? [`\`model: ${agent.model}\` isn’t a model family, so it counts as an unrecognized model.`]
        : [],
      fileText: null,
      patchable: false,
      tree: `paste:${agentsRootOf(agent.path).join('/')}`,
      projectDirectory: scope === 'project' ? projectDirectoryOf(agent.path) : [],
    });
  };

  pasted.agents.forEach(addPasted);

  return definitions;
};

const rawModelToValue = (
  raw: string | null,
  source: string,
  warnings: FleetAnalysis['warnings'],
): ModelSetting => {
  const parsed = parseModelSetting(raw);

  if (parsed.unknown) {
    warnings.push({
      source,
      message: `\`${raw}\` isn’t a model family, so it counts as an unrecognized model.`,
    });
  }

  return parsed.setting;
};

export const analyzeFleet = (input: FleetInput): FleetAnalysis => {
  const warnings: FleetAnalysis['warnings'] = [];
  const assumptions: string[] = [];
  const { controls, range } = input;

  const settings = effectiveSettings(input.settingsFiles, input.settingsPrecedence);
  for (const warning of settings.warnings) {
    warnings.push({ source: warning.path, message: warning.message });
  }

  const shell = parsePastedOutput(input.shellEnvironmentText);
  const pasted = parsePastedOutput(input.pastedText);
  const definitions = buildDefinitions(input, warnings);

  // Pasted output only speaks for the environment when it holds an environment or FORCE value. A
  // version or a few agent lines alone leave the controls in charge.
  const gaveEnvironment =
    input.settingsFiles.length > 0 ||
    input.shellEnvironmentText.trim() !== '' ||
    pasted.environmentModel !== null ||
    pasted.force !== null;
  // Text for `--agents` counts even when it doesn't parse, so its error reaches the page.
  const hasInput =
    gaveEnvironment ||
    definitions.length > 0 ||
    input.versionText.trim() !== '' ||
    input.cliAgentsText.trim() !== '' ||
    input.pastedText.trim() !== '';

  // Environment: the shell overrides settings files, and a pasted `=` line is the shell too.
  const pastedShell = (value: typeof pasted.force) => (value?.origin === 'shell' ? value : null);
  const pastedSettings = (value: typeof pasted.force) =>
    value?.origin === 'settings' ? value : null;

  let environmentModel: ModelSetting = controls.environmentModel;
  const environmentRaw =
    shell.environmentModel?.raw ??
    pastedShell(pasted.environmentModel)?.raw ??
    settings.environmentModel?.raw ??
    pastedSettings(pasted.environmentModel)?.raw ??
    null;
  if (environmentRaw !== null) {
    environmentModel = rawModelToValue(environmentRaw, 'CLAUDE_CODE_SUBAGENT_MODEL', warnings);
    const origin = shell.environmentModel
      ? 'the shell environment you entered'
      : pastedShell(pasted.environmentModel)
        ? 'the output you pasted'
        : settings.environmentModel
          ? `${settings.environmentModel.from.path}`
          : 'the output you pasted';
    assumptions.push(
      `CLAUDE_CODE_SUBAGENT_MODEL is ${environmentRaw === '' ? 'empty, which counts as unset' : `\`${environmentRaw}\``}, from ${origin}.`,
    );
  } else if (gaveEnvironment) {
    environmentModel = 'unset';
    assumptions.push(
      'CLAUDE_CODE_SUBAGENT_MODEL wasn’t found in what you gave me, so I’m treating it as unset.',
    );
  } else {
    assumptions.push(
      `No settings or shell environment given, so the env var comes from the controls: ${controls.environmentModel === 'unset' ? 'unset' : `\`${controls.environmentModel}\``}.`,
    );
  }

  let force = controls.force;
  const forceRaw =
    shell.force?.raw ??
    pastedShell(pasted.force)?.raw ??
    settings.force?.raw ??
    pastedSettings(pasted.force)?.raw ??
    null;
  if (forceRaw !== null) {
    const parsedForce = parseForceValue(forceRaw);
    force = parsedForce.on;
    if (!parsedForce.recognized) {
      warnings.push({
        source: 'CLAUDE_CODE_SUBAGENT_MODEL_FORCE',
        message: `FORCE is \`${forceRaw}\`. Claude Code documents \`1\`, so this counts as off.`,
      });
    }
    assumptions.push(`FORCE is ${force ? 'on' : 'off'} (\`${forceRaw}\`).`);
  } else if (gaveEnvironment) {
    force = false;
    assumptions.push('FORCE wasn’t found, so I’m treating it as off.');
  } else {
    assumptions.push(`FORCE comes from the controls: ${controls.force ? 'on' : 'off'}.`);
  }

  // The main model is the top-level `model` setting, or else the controls.
  let mainModel: ModelValue = controls.mainModel;
  const mainRaw = settings.mainModel?.raw ?? null;
  const mainSetting =
    mainRaw !== null && mainRaw.trim().toLowerCase() !== 'default'
      ? rawModelToValue(mainRaw, settings.mainModel?.from.path ?? 'settings', warnings)
      : 'unset';
  if (mainSetting !== 'unset' && mainSetting !== 'inherit') {
    mainModel = mainSetting;
    assumptions.push(`Main model is \`${mainRaw}\`, from ${settings.mainModel?.from.path}.`);
  } else {
    assumptions.push(
      `Main model taken from the controls: \`${controls.mainModel === 'unrecognized' ? 'unrecognized model ID' : controls.mainModel}\`.`,
    );
  }

  assumptions.push(
    `Provider group taken from the controls: ${controls.providerGroup === 'capped' ? 'capped' : 'uncapped'}.`,
  );

  // Version: the field beats pasted output, which beats the controls.
  const typedText = input.versionText.trim();
  const typedVersion =
    typedText === '' ? null : (parseVersion(typedText) ?? findVersion(typedText));
  if (typedText !== '' && typedVersion === null) {
    warnings.push({
      source: 'version',
      message: 'I couldn’t find a version like 2.1.278 in that text.',
    });
  }

  let version: Version = controls.version;
  if (typedVersion) {
    version = typedVersion;
    assumptions.push(`Version ${formatVersion(version)}, from the version field.`);
  } else if (pasted.version) {
    version = pasted.version;
    assumptions.push(`Version ${formatVersion(version)}, from the output you pasted.`);
  } else {
    assumptions.push(
      `No version found, assuming ${formatVersion(controls.version)} from the controls.`,
    );
  }

  if (!isInRange(version, range)) {
    const clamped = clampVersion(version, range);
    assumptions.push(
      `${formatVersion(version)} is outside the range ${formatVersion(range.first)} to ${formatVersion(range.last)}, so I used ${formatVersion(clamped)}.`,
    );
    version = clamped;
  }

  if (controls.resumed) assumptions.push('Resumed subagents: on, from the controls.');

  if (input.settingsFiles.length > 1) {
    assumptions.push(
      `When settings files disagree, the order is ${input.settingsPrecedence.join(' over ')}, and the shell environment overrides all of them.`,
    );
  }
  assumptions.push('Agent names are compared exactly, including case.');

  const context: FleetContext = {
    environmentModel,
    force,
    forceRaw,
    mainModel,
    providerGroup: controls.providerGroup,
    resumed: controls.resumed,
    version,
  };

  // The columns.
  const reversal = thresholds.reversal;
  let columns: FleetAnalysis['columns'];

  if (input.comparison.mode === 'planner') {
    const fromVersion = parseVersion(input.comparison.from);
    const toVersion = parseVersion(input.comparison.to);
    if (!fromVersion || !toVersion) {
      warnings.push({
        source: 'upgrade planner',
        message:
          'Enter both versions like 2.1.278. Until then, the planner uses your version and the latest.',
      });
    }
    const from = clampVersion(fromVersion ?? version, range);
    const to = clampVersion(toVersion ?? range.last, range);
    columns = {
      before: from,
      after: to,
      beforeLabel: `On ${formatVersion(from)}`,
      afterLabel: `On ${formatVersion(to)}`,
    };
  } else if (compareVersions(version, reversal) >= 0) {
    const before = { ...reversal, patch: reversal.patch - 1 };
    columns = {
      before,
      after: version,
      beforeLabel: `Before ${formatVersion(reversal)}`,
      afterLabel: `On ${formatVersion(version)}`,
    };
  } else {
    columns = {
      before: version,
      after: reversal,
      beforeLabel: `On ${formatVersion(version)}`,
      afterLabel: `After upgrading to ${formatVersion(reversal)}`,
    };
  }

  // Precedence.
  const statuses = resolvePrecedence(
    definitions.map((definition) => ({
      id: definition.id,
      name: definition.name,
      scope: definition.scope,
      tree: definition.tree,
      projectDirectory: definition.projectDirectory,
    })),
    input.workingDirectory,
  );
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));

  const configurationFor = (kind: SubagentKind, declared: ModelSetting): ResolverConfiguration => ({
    kind,
    definitionModel: declared,
    invocationModel: 'unset',
    environmentModel: context.environmentModel,
    force: context.force,
    mainModel: context.mainModel,
    providerGroup: context.providerGroup,
    version,
    resumed: context.resumed,
  });

  const outcome = (kind: SubagentKind, declared: ModelSetting) => {
    const configuration = configurationFor(kind, declared);
    const before = resolve({ ...configuration, version: columns.before }).model;
    const after = resolve({ ...configuration, version: columns.after }).model;

    return {
      before,
      after,
      changed: before !== after,
      direction: before === after ? null : flipDirection(before, after),
    };
  };

  const overridden = new Set(
    definitions
      .filter((definition) => definition.scope !== 'plugin')
      .map((definition) => definition.name),
  );

  const rows: FleetRow[] = definitions.map((definition) => {
    const status = statuses.get(definition.id) ?? { kind: 'effective' as const };
    const runs = status.kind !== 'shadowed';
    const result = runs
      ? outcome('custom', definition.declared)
      : { before: null, after: null, changed: false, direction: null };

    return {
      id: definition.id,
      name: definition.name,
      definition,
      kind: 'custom' as const,
      scopeLabel: agentScopeLabels[definition.scope],
      declares: describeDeclared(definition),
      status,
      shadowedBy: status.kind === 'shadowed' ? (byId.get(status.by) ?? null) : null,
      overridesBuiltIn: builtIns.some((builtIn) => builtIn.name === definition.name),
      ...result,
    };
  });

  for (const builtIn of builtIns) {
    if (overridden.has(builtIn.name)) continue;

    rows.push({
      id: `built-in:${builtIn.name}`,
      name: builtIn.name,
      definition: null,
      kind: builtIn.kind,
      scopeLabel: 'Built-in',
      declares: 'built-in',
      status: { kind: 'effective' },
      shadowedBy: null,
      overridesBuiltIn: false,
      ...outcome(builtIn.kind, 'unset'),
    });
  }

  const statusOrder = { effective: 0, ambiguous: 0, shadowed: 1 } as const;
  rows.sort(
    (first, second) =>
      Number(second.changed) - Number(first.changed) ||
      statusOrder[first.status.kind] - statusOrder[second.status.kind] ||
      first.name.localeCompare(second.name) ||
      first.id.localeCompare(second.id),
  );

  // Same-name definitions that tie can't both be loaded, and the tool can't say which one wins, so
  // neither is counted as running. Both stay in the table, flagged, and out of the totals and the
  // verdict rather than claiming an outcome the filesystem might not produce.
  const running = rows.filter((row) => row.status.kind === 'effective');
  const changed = running.filter((row) => row.changed);

  const summary = {
    movesUp: changed.filter((row) => row.direction === 'more-expensive').length,
    movesDown: changed.filter((row) => row.direction === 'cheaper').length,
    moved: changed.length,
    unchanged: running.length - changed.length,
  };

  // The verdict is about the 2.1.251 boundary, whatever the planner compares.
  const boundaryBefore = { ...reversal, patch: reversal.patch - 1 };
  const pastReversal = compareVersions(version, reversal) >= 0;
  const boundaryFrom = pastReversal ? boundaryBefore : version;
  const boundaryTo = pastReversal ? version : reversal;
  const boundaryChanged = running.filter((row) => {
    const kind = row.kind;
    const declared = row.definition?.declared ?? 'unset';
    const configuration = configurationFor(kind, declared);

    return (
      resolve({ ...configuration, version: boundaryFrom }).model !==
      resolve({ ...configuration, version: boundaryTo }).model
    );
  }).length;

  const forceSupported = compareVersions(version, thresholds.force) >= 0;
  let verdict: Verdict;

  if (context.force && forceSupported) {
    verdict = { id: 'force-on', text: 'FORCE is on—every `model:` field is being ignored' };
  } else if (context.force) {
    verdict = { id: 'force-inert', text: 'FORCE is set but does nothing on this version' };
  } else if (context.environmentModel === 'unset') {
    verdict = { id: 'nothing-can-flip', text: 'Nothing here can flip' };
  } else if (boundaryChanged === 0) {
    verdict = { id: 'no-changes', text: 'No agent changes across the boundary' };
  } else if (pastReversal) {
    verdict = {
      id: 'changed',
      text: `${boundaryChanged} of ${running.length} agents changed at ${formatVersion(reversal)}`,
    };
  } else {
    verdict = {
      id: 'will-change',
      text: `${boundaryChanged} of ${running.length} agents will change when you pass ${formatVersion(reversal)}`,
    };
  }

  return {
    hasInput,
    context: { ...context },
    assumptions,
    warnings,
    definitions,
    rows,
    columns,
    verdict,
    summary,
    agentCount: running.length,
    noModelLineCount: definitions.filter((definition) => definition.rawModel === null).length,
    shadowedCount: rows.filter((row) => row.status.kind === 'shadowed').length,
    ambiguousCount: rows.filter((row) => row.status.kind === 'ambiguous').length,
  };
};

/** The resolver configuration that shows a row's answer, for loading it into the controls. */
export const configurationForRow = (
  row: FleetRow,
  analysis: FleetAnalysis,
  controls: ResolverConfiguration,
): ResolverConfiguration => ({
  ...controls,
  kind: row.kind,
  definitionModel: row.definition?.declared ?? 'unset',
  invocationModel: 'unset',
  environmentModel: analysis.context.environmentModel,
  force: analysis.context.force,
  mainModel: analysis.context.mainModel,
  providerGroup: analysis.context.providerGroup,
  version: analysis.context.version,
});
