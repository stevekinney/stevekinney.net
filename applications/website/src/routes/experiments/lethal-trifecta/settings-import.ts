import { parseLenientJson } from '$lib/experiments/lenient-json';
import type { SettingsScope } from '$lib/experiments/settings-scope';

import { exfiltrationMatches, normalizeDomain } from './domains';
import type { ControlId } from './model';

/** A settings file someone uploaded or pasted. Its text never leaves the page. */
export type SettingsFile = {
  id: string;
  path: string;
  scope: SettingsScope;
  text: string;
};

/** A value from a settings file, with the line that holds it. */
export type Located<T> = {
  value: T;
  file: SettingsFile;
  /** One-based, or `null` when the line couldn't be found. */
  line: number | null;
  lineText: string;
};

type Collected = {
  allow: Located<string>[];
  deny: Located<string>[];
  ask: Located<string>[];
  defaultMode: Located<string>[];
  sandboxEnabled: Located<boolean>[];
  allowedDomains: Located<string>[];
  strictAllowlist: Located<boolean>[];
  denyRead: Located<string>[];
  denyWrite: Located<string>[];
  allowWrite: Located<string>[];
  excludedCommands: Located<string>[];
  allowUnsandboxedCommands: Located<boolean>[];
  environmentScrub: Located<string>[];
  mcpServers: Located<string>[];
};

export type ParsedFile = {
  file: SettingsFile;
  status: 'read' | 'empty' | 'invalid' | 'not-an-object';
  /** It had comments or trailing commas. */
  lenient: boolean;
  values: Collected;
  /** Dotted keys this tool doesn't read. They're listed and ignored. */
  unknownKeys: string[];
};

const emptyCollected = (): Collected => ({
  allow: [],
  deny: [],
  ask: [],
  defaultMode: [],
  sandboxEnabled: [],
  allowedDomains: [],
  strictAllowlist: [],
  denyRead: [],
  denyWrite: [],
  allowWrite: [],
  excludedCommands: [],
  allowUnsandboxedCommands: [],
  environmentScrub: [],
  mcpServers: [],
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Finds the line holding a value by walking its keys in order, so the
 * `enabled` under `sandbox` isn't confused with another `enabled` earlier on.
 */
export const findLine = (
  text: string,
  needles: string[],
): { line: number | null; text: string } => {
  const lines = text.split(/\r?\n/);
  let from = 0;
  let found = -1;

  for (const needle of needles) {
    const index = lines.findIndex((line, position) => position >= from && line.includes(needle));
    if (index === -1) break;

    found = index;
    from = index;
  }

  return found === -1
    ? { line: null, text: needles.at(-1) ?? '' }
    : { line: found + 1, text: lines[found].trim() };
};

const scrubKey = 'CLAUDE_CODE_SUBPROCESS_ENV_SCRUB';

// The keys this tool reads. A list names the keys read inside an object; `true` means
// the object's own keys are data, such as server names, rather than settings.
const known: Record<string, string[] | true> = {
  permissions: ['allow', 'deny', 'ask', 'defaultMode'],
  sandbox: ['enabled', 'network', 'filesystem', 'excludedCommands', 'allowUnsandboxedCommands'],
  'sandbox.network': ['allowedDomains', 'strictAllowlist'],
  'sandbox.filesystem': ['denyRead', 'denyWrite', 'allowWrite'],
  env: true,
  mcpServers: true,
  enabledMcpjsonServers: true,
};

const topLevelKeys = Object.keys(known).filter((key) => !key.includes('.'));

const unknownKeysOf = (value: Record<string, unknown>, prefix = ''): string[] =>
  Object.keys(value).flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const allowed = prefix ? known[prefix] : topLevelKeys;
    if (Array.isArray(allowed) && !allowed.includes(key)) return [path];

    const child = value[key];

    return Array.isArray(known[path]) && isObject(child) ? unknownKeysOf(child, path) : [];
  });

export const parseSettingsFile = (file: SettingsFile): ParsedFile => {
  const values = emptyCollected();
  const result: ParsedFile = { file, status: 'read', lenient: false, values, unknownKeys: [] };

  if (file.text.trim() === '') return { ...result, status: 'empty' };

  const parsed = parseLenientJson(file.text);
  if (!parsed) return { ...result, status: 'invalid' };
  if (!isObject(parsed.value))
    return { ...result, status: 'not-an-object', lenient: parsed.lenient };

  result.lenient = parsed.lenient;
  const root = parsed.value;
  result.unknownKeys = unknownKeysOf(root);

  const locate = <T>(value: T, needles: string[]): Located<T> => {
    const { line, text } = findLine(file.text, needles);

    return { value, file, line, lineText: text };
  };

  const strings = (value: unknown, needles: string[]): Located<string>[] =>
    Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => locate(item, [...needles, JSON.stringify(item)]))
      : [];

  const boolean = (value: unknown, needles: string[]): Located<boolean>[] =>
    typeof value === 'boolean' ? [locate(value, needles)] : [];

  const permissions = isObject(root.permissions) ? root.permissions : {};
  values.allow = strings(permissions.allow, ['"permissions"', '"allow"']);
  values.deny = strings(permissions.deny, ['"permissions"', '"deny"']);
  values.ask = strings(permissions.ask, ['"permissions"', '"ask"']);
  if (typeof permissions.defaultMode === 'string') {
    values.defaultMode = [locate(permissions.defaultMode, ['"permissions"', '"defaultMode"'])];
  }

  const sandbox = isObject(root.sandbox) ? root.sandbox : {};
  const network = isObject(sandbox.network) ? sandbox.network : {};
  const filesystem = isObject(sandbox.filesystem) ? sandbox.filesystem : {};
  values.sandboxEnabled = boolean(sandbox.enabled, ['"sandbox"', '"enabled"']);
  values.allowedDomains = strings(network.allowedDomains, ['"sandbox"', '"allowedDomains"']);
  values.strictAllowlist = boolean(network.strictAllowlist, ['"sandbox"', '"strictAllowlist"']);
  values.denyRead = strings(filesystem.denyRead, ['"sandbox"', '"denyRead"']);
  values.denyWrite = strings(filesystem.denyWrite, ['"sandbox"', '"denyWrite"']);
  values.allowWrite = strings(filesystem.allowWrite, ['"sandbox"', '"allowWrite"']);
  values.excludedCommands = strings(sandbox.excludedCommands, ['"sandbox"', '"excludedCommands"']);
  values.allowUnsandboxedCommands = boolean(sandbox.allowUnsandboxedCommands, [
    '"sandbox"',
    '"allowUnsandboxedCommands"',
  ]);

  const environment = isObject(root.env) ? root.env : {};
  const scrub = environment[scrubKey];
  if (typeof scrub === 'string' || typeof scrub === 'number' || typeof scrub === 'boolean') {
    values.environmentScrub = [locate(String(scrub), ['"env"', `"${scrubKey}"`])];
  }
  // Only the names of other variables are kept. Their values never are.
  const otherVariables = Object.keys(environment).filter((key) => key !== scrubKey);
  result.unknownKeys.push(...otherVariables.map((key) => `env.${key}`));

  if (isObject(root.mcpServers)) {
    values.mcpServers = Object.keys(root.mcpServers).map((name) =>
      locate(name, ['"mcpServers"', JSON.stringify(name)]),
    );
  }
  values.mcpServers.push(...strings(root.enabledMcpjsonServers, ['"enabledMcpjsonServers"']));

  return result;
};

/** A single-value key set to different values in different files. */
export type Conflict = {
  key: string;
  winner: Located<string>;
  others: Located<string>[];
};

export type MergedSettings = {
  allow: Located<string>[];
  deny: Located<string>[];
  ask: Located<string>[];
  defaultMode: Located<string> | null;
  sandboxEnabled: Located<boolean> | null;
  allowedDomains: Located<string>[];
  strictAllowlist: Located<boolean> | null;
  /** strictAllowlist set in a repository's files, which Claude Code ignores. */
  ignoredStrictAllowlist: Located<boolean>[];
  denyRead: Located<string>[];
  denyWrite: Located<string>[];
  allowWrite: Located<string>[];
  excludedCommands: Located<string>[];
  allowUnsandboxedCommands: Located<boolean> | null;
  environmentScrub: Located<string> | null;
  mcpServers: Located<string>[];
  conflicts: Conflict[];
};

const asText = <T>(located: Located<T>): Located<string> => ({
  ...located,
  value: String(located.value),
});

/**
 * Lists merge across scopes. A single value comes from the highest-priority
 * file that sets it, and any disagreement is reported as a conflict.
 */
export const mergeSettings = (
  parsed: ParsedFile[],
  precedence: SettingsScope[],
): MergedSettings => {
  const rank = (scope: SettingsScope): number => precedence.indexOf(scope);
  const ordered = [...parsed].sort(
    (first, second) => rank(first.file.scope) - rank(second.file.scope),
  );
  const conflicts: Conflict[] = [];

  const all = <K extends keyof Collected>(key: K): Collected[K] =>
    ordered.flatMap((entry) => entry.values[key] as Located<unknown>[]) as Collected[K];

  const single = <T>(key: string, candidates: Located<T>[]): Located<T> | null => {
    const [winner, ...rest] = candidates;
    if (!winner) return null;

    const others = rest.filter((candidate) => candidate.value !== winner.value);
    if (others.length > 0) {
      conflicts.push({ key, winner: asText(winner), others: others.map(asText) });
    }

    return winner;
  };

  const strict = all('strictAllowlist');
  const honored = strict.filter(({ file }) => file.scope === 'user' || file.scope === 'managed');

  const merged: MergedSettings = {
    allow: all('allow'),
    deny: all('deny'),
    ask: all('ask'),
    defaultMode: single('permissions.defaultMode', all('defaultMode')),
    sandboxEnabled: single('sandbox.enabled', all('sandboxEnabled')),
    allowedDomains: all('allowedDomains'),
    strictAllowlist: single('sandbox.network.strictAllowlist', honored),
    ignoredStrictAllowlist: strict.filter((entry) => !honored.includes(entry)),
    denyRead: all('denyRead'),
    denyWrite: all('denyWrite'),
    allowWrite: all('allowWrite'),
    excludedCommands: all('excludedCommands'),
    allowUnsandboxedCommands: single(
      'sandbox.allowUnsandboxedCommands',
      all('allowUnsandboxedCommands'),
    ),
    environmentScrub: single(`env.${scrubKey}`, all('environmentScrub')),
    mcpServers: all('mcpServers'),
    conflicts,
  };

  return merged;
};

/** A permission rule split into its tool and its argument: `Bash(curl *)` is `Bash` and `curl *`. */
export const parseRule = (rule: string): { tool: string; argument: string | null } => {
  const match = /^\s*([A-Za-z_][\w-]*)\s*(?:\((.*)\))?\s*$/s.exec(rule);

  return match
    ? { tool: match[1], argument: match[2] ?? null }
    : { tool: rule.trim(), argument: null };
};

/** The command a Bash rule names, such as `curl` for `Bash(curl *)` or `git push` for `Bash(git push:*)`. Empty means every command. */
export const bashCommand = (rule: string): string | null => {
  const { tool, argument } = parseRule(rule);
  if (tool !== 'Bash') return null;
  if (argument === null) return '';

  return argument
    .replace(/:\*$/, '')
    .replace(/\s*\*$/, '')
    .trim()
    .replace(/^\*$/, '');
};

/**
 * Commands known to make no network request and to run no other command. The
 * list is short on purpose: a shell, `env`, `xargs`, `find`, `make`, or an
 * interpreter can run anything, so everything not listed counts as reaching
 * the network.
 */
const offlineCommands = new Set([
  'cat',
  'cd',
  'cut',
  'date',
  'diff',
  'du',
  'echo',
  'false',
  'grep',
  'head',
  'ls',
  'mkdir',
  'pwd',
  'sort',
  'stat',
  'tail',
  'touch',
  'tr',
  'true',
  'uniq',
  'wc',
  'which',
]);

/**
 * Whether a command, or a command pattern, can make a network request. It fails
 * safe: an empty command means every command, a path counts as its program, and
 * any program not known to stay offline counts as reaching the network.
 */
export const reachesNetwork = (command: string): boolean => {
  const first = command.trim().split(/\s+/)[0] ?? '';
  const program = first.split('/').at(-1) ?? '';

  return program.includes('*') || !offlineCommands.has(program);
};

const globToPattern = (glob: string): RegExp =>
  new RegExp(
    `^${glob
      .split('')
      .map((character) =>
        character === '*'
          ? '[^/]*'
          : character === '?'
            ? '[^/]'
            : character.replace(/[.+^${}()|[\]\\]/g, '\\$&'),
      )
      .join('')}$`,
  );

/**
 * Whether a path pattern covers a file name in every directory, such as `**\/.env*` and
 * `.env.local`. A pattern with a concrete directory, such as `secrets/.env` or `./.env`,
 * covers that directory only, so it fails safe and covers nothing here.
 */
export const patternCoversFile = (pattern: string, fileName: string): boolean => {
  const directories = pattern.replace(/\/+$/, '').split('/');
  const last = directories.pop() ?? '';
  if (!directories.every((directory) => directory === '**')) return false;
  if (last === '' || last === '**') return true;

  return globToPattern(last).test(fileName);
};

/** Whether a Read deny rule covers a file name. A bare `Read` covers everything. */
export const readRuleCovers = (rule: string, fileName: string): boolean => {
  const { tool, argument } = parseRule(rule);
  if (tool !== 'Read') return false;

  return argument === null || patternCoversFile(argument, fileName);
};

const isTruthy = (value: string): boolean | null => {
  const text = value.trim().toLowerCase();
  if (text === '1' || text === 'true' || text === 'yes') return true;
  if (text === '' || text === '0' || text === 'false' || text === 'no') return false;

  return null;
};

/** What the settings say about one control. `unknown` leaves the learner's toggle alone. */
export type Prefill = {
  status: 'on' | 'off' | 'unknown';
  reason: string;
  evidence: Located<unknown>[];
};

export type SettingsWarning = {
  id: 'allowlist' | 'unsandboxed-retry' | 'env-pattern' | 'excluded-network' | 'strict-ignored';
  message: string;
  evidence: Located<unknown>[];
};

export type SettingsReport = {
  parsed: ParsedFile[];
  merged: MergedSettings;
  prefill: Record<ControlId, Prefill>;
  warnings: SettingsWarning[];
  /** Domains for the diagram's allowlist, from allowedDomains and WebFetch(domain:…) allow rules. */
  allowlist: string[];
  excludedNetworkCommand: boolean;
  /** Whether any MCP server is configured, which turns MCP tool results on. */
  hasMcpServers: boolean;
};

const notDeterminable = (reason = 'Not determinable from settings.'): Prefill => ({
  status: 'unknown',
  reason,
  evidence: [],
});

const webFetchDomain = (rule: string): string | null => {
  const { tool, argument } = parseRule(rule);
  const match = tool === 'WebFetch' && argument ? /^domain:(.+)$/.exec(argument.trim()) : null;

  return match ? match[1].trim() : null;
};

export const analyzeSettings = (
  files: SettingsFile[],
  precedence: SettingsScope[],
): SettingsReport => {
  const parsed = files.map(parseSettingsFile);
  const merged = mergeSettings(parsed, precedence);
  const warnings: SettingsWarning[] = [];

  // Allowlist: the sandbox's domains plus WebFetch(domain:…) allow rules, which it also honors.
  const webFetchAllows = merged.allow.filter((rule) => webFetchDomain(rule.value) !== null);
  const domainSources = [
    ...merged.allowedDomains,
    ...webFetchAllows.map((rule) => ({ ...rule, value: webFetchDomain(rule.value) ?? '' })),
  ];
  const allowlist = [...new Set(domainSources.map((entry) => normalizeDomain(entry.value)))];

  for (const { domain, entry } of exfiltrationMatches(allowlist)) {
    warnings.push({
      id: 'allowlist',
      message: `The allowlist admits ${domain.host}${entry === domain.host ? '' : ` through ${entry}`}. ${domain.reason}`,
      evidence: domainSources.filter((source) => normalizeDomain(source.value) === entry),
    });
  }

  // Broad allows: an allow rule also approves the unsandboxed retry of what it matches.
  const retriesOff = merged.allowUnsandboxedCommands?.value === false;
  if (!retriesOff) {
    for (const rule of merged.allow) {
      const command = bashCommand(rule.value);
      if (command !== null && reachesNetwork(command)) {
        warnings.push({
          id: 'unsandboxed-retry',
          message: `${rule.value} also approves an unsandboxed retry of matching commands, so they can run outside the sandbox with no prompt. allowUnsandboxedCommands isn’t false.`,
          evidence: [rule],
        });
      }
    }
  }

  // .env patterns.
  const readDenies = merged.deny.filter((rule) => parseRule(rule.value).tool === 'Read');
  // The rules count together: Read(.env) beside Read(.env.local) covers both files.
  const envDenies = readDenies.filter((rule) => readRuleCovers(rule.value, '.env'));
  const localEnvDenies = readDenies.filter((rule) => readRuleCovers(rule.value, '.env.local'));
  const fullEnvDenies =
    envDenies.length > 0 && localEnvDenies.length > 0
      ? [...new Set([...envDenies, ...localEnvDenies])]
      : [];
  if (envDenies.length > 0 && localEnvDenies.length === 0) {
    warnings.push({
      id: 'env-pattern',
      message: `${envDenies.map((rule) => rule.value).join(', ')} doesn’t cover .env.local. Read(.env) doesn’t match it, and Read(**/.env*) does.`,
      evidence: envDenies,
    });
  }

  // Excluded commands that reach the network run outside the sandbox and its proxy.
  const excludedNetwork = merged.excludedCommands.filter((entry) => reachesNetwork(entry.value));
  for (const entry of excludedNetwork) {
    warnings.push({
      id: 'excluded-network',
      message: `excludedCommands includes ${entry.value}, which runs outside the sandbox with no proxy and no allowlist, and isn’t known to stay off the network.`,
      evidence: [entry],
    });
  }

  if (merged.ignoredStrictAllowlist.length > 0) {
    warnings.push({
      id: 'strict-ignored',
      message:
        'strictAllowlist is set in a repository’s settings, which Claude Code ignores. It only counts in user, managed, or --settings settings.',
      evidence: merged.ignoredStrictAllowlist,
    });
  }

  const prefill = {} as Record<ControlId, Prefill>;

  // Default-deny egress needs the sandbox on and a strict allowlist.
  const enabled = merged.sandboxEnabled;
  const strict = merged.strictAllowlist;
  if (enabled?.value === false) {
    prefill['default-deny-egress'] = {
      status: 'off',
      reason: 'The sandbox is off.',
      evidence: [enabled],
    };
  } else if (enabled?.value === true && strict?.value === true) {
    prefill['default-deny-egress'] = {
      status: 'on',
      reason: 'The sandbox is on with a strict allowlist.',
      evidence: [enabled, strict],
    };
  } else if (enabled?.value === true) {
    prefill['default-deny-egress'] = {
      status: 'off',
      reason:
        'The sandbox is on, but without strictAllowlist a host outside the list is prompted for rather than refused.',
      evidence: strict ? [enabled, strict] : [enabled],
    };
  } else {
    prefill['default-deny-egress'] = notDeterminable('sandbox.enabled isn’t set in these files.');
  }

  const retries = merged.allowUnsandboxedCommands;
  prefill['no-unsandboxed-retry'] = retries
    ? {
        status: retries.value === false ? 'on' : 'off',
        reason:
          retries.value === false
            ? 'Unsandboxed retries are off.'
            : 'Unsandboxed retries are allowed.',
        evidence: [retries],
      }
    : notDeterminable('allowUnsandboxedCommands isn’t set in these files.');

  const webFetchDeny = merged.deny.find((rule) => {
    const { tool, argument } = parseRule(rule.value);
    return tool === 'WebFetch' && (argument === null || argument.trim() === '*');
  });
  const webFetchAllow = merged.allow.find((rule) => {
    const { tool, argument } = parseRule(rule.value);
    return tool === 'WebFetch' && argument === null;
  });
  prefill['deny-web-fetch'] = webFetchDeny
    ? { status: 'on', reason: 'WebFetch is denied.', evidence: [webFetchDeny] }
    : webFetchAllow
      ? { status: 'off', reason: 'WebFetch is allowed everywhere.', evidence: [webFetchAllow] }
      : notDeterminable('No rule denies WebFetch outright.');

  const scrub = merged.environmentScrub;
  const scrubOn = scrub ? isTruthy(scrub.value) : null;
  prefill['environment-scrub'] =
    scrub && scrubOn !== null
      ? {
          status: scrubOn ? 'on' : 'off',
          reason: scrubOn ? 'Subprocess environments are scrubbed.' : 'The scrub is set to off.',
          evidence: [scrub],
        }
      : notDeterminable(`${scrubKey} isn’t set in these files.`);

  prefill['deny-read-env'] =
    fullEnvDenies.length > 0
      ? { status: 'on', reason: 'A Read deny covers .env and .env.local.', evidence: fullEnvDenies }
      : envDenies.length > 0
        ? { status: 'off', reason: 'The Read deny misses .env.local.', evidence: envDenies }
        : notDeterminable('No Read rule denies .env files in every directory.');

  const shellEnv = merged.denyRead.filter((entry) => patternCoversFile(entry.value, '.env'));
  const localShellEnv = merged.denyRead.filter((entry) =>
    patternCoversFile(entry.value, '.env.local'),
  );
  const fullShellEnv =
    shellEnv.length > 0 && localShellEnv.length > 0
      ? [...new Set([...shellEnv, ...localShellEnv])]
      : [];
  prefill['sandbox-deny-read-env'] =
    fullShellEnv.length > 0
      ? { status: 'on', reason: 'The sandbox denies reading .env files.', evidence: fullShellEnv }
      : shellEnv.length > 0
        ? { status: 'off', reason: 'The sandbox denyRead misses .env.local.', evidence: shellEnv }
        : notDeterminable('No sandbox denyRead entry covers .env files in every directory.');

  // The control means a prompt on pushing and on public comments, so it's on only when the
  // ask and deny rules cover both. A comment can go out through any gh subcommand, such as
  // gh api, so only a rule covering all of gh counts, and through any MCP server.
  const pushRule = (rule: Located<string>): boolean =>
    /^git push\b/.test(bashCommand(rule.value) ?? '') || bashCommand(rule.value) === 'git';
  const coversAllOfGh = (rule: Located<string>): boolean => {
    const { tool, argument } = parseRule(rule.value);
    if (tool !== 'Bash') return false;

    // Without a wildcard, Bash(gh) matches the bare command only.
    return argument === null || /^\s*(\*|gh\s*(:\*|\s\*))\s*$/.test(argument);
  };
  const askOrDeny = [...merged.ask, ...merged.deny];
  const gated = askOrDeny.filter(pushRule);
  const pushAllowed = merged.allow.filter(pushRule);
  const ghRule = askOrDeny.find(coversAllOfGh);
  const mcpServers = [...new Set(merged.mcpServers.map((server) => server.value))];
  const mcpRules = mcpServers.map((server) =>
    askOrDeny.find((rule) => [`mcp__${server}`, `mcp__${server}__*`].includes(rule.value.trim())),
  );
  const ungatedServers = mcpServers.filter((_, index) => !mcpRules[index]);
  const commentRules = [ghRule, ...mcpRules];
  const commentsGated = commentRules.every((rule) => rule !== undefined);
  const missing = [
    ...(ghRule
      ? []
      : [
          'gh (a rule must cover all of gh, such as Bash(gh:*): narrow rules for gh issue comment and gh pr comment miss gh api and other gh subcommands)',
        ]),
    ...(ungatedServers.length > 0 ? [`the MCP servers ${ungatedServers.join(', ')}`] : []),
  ].join(', or ');
  prefill['publish-gate'] =
    gated.length > 0 && commentsGated
      ? {
          status: 'on',
          reason: 'git push and public comments ask first, or are denied.',
          evidence: [...new Set([...gated, ...commentRules.filter((rule) => rule !== undefined)])],
        }
      : pushAllowed.length > 0
        ? { status: 'off', reason: 'git push is allowed without a prompt.', evidence: pushAllowed }
        : gated.length > 0
          ? {
              status: 'unknown',
              reason: `git push asks first, or is denied, but no ask or deny rule covers public comments through ${missing}, so a comment can still go out with no prompt.`,
              evidence: gated,
            }
          : notDeterminable('No rule names git push.');

  const mode = merged.defaultMode;
  prefill['auto-mode'] = mode
    ? {
        status: mode.value === 'auto' ? 'on' : 'off',
        reason: `The default permission mode is ${mode.value}.`,
        evidence: [mode],
      }
    : notDeterminable('permissions.defaultMode isn’t set in these files.');

  const curlDeny = merged.deny.filter(
    (rule) => bashCommand(rule.value)?.split(/\s+/)[0] === 'curl',
  );
  prefill['deny-curl'] =
    curlDeny.length > 0
      ? { status: 'on', reason: 'curl is denied.', evidence: curlDeny }
      : notDeterminable('No rule denies curl.');

  for (const id of [
    'container',
    'reader-doer',
    'plan-first',
    'fsmonitor-off',
    'claude-md-line',
  ] as const) {
    prefill[id] = notDeterminable();
  }

  return {
    parsed,
    merged,
    prefill,
    warnings,
    allowlist,
    excludedNetworkCommand: excludedNetwork.length > 0,
    hasMcpServers: merged.mcpServers.length > 0,
  };
};
