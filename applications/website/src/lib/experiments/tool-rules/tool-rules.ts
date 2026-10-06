import type { FieldIssue } from '../editor-fields/field-issue';

import { findClaudeTool, readOnlyTools, toolGroups } from './claude-tools';

/**
 * How a tool list written as one string separates its entries. A subagent's
 * `tools` and `disallowedTools` take commas only. A skill's `allowed-tools` and
 * `disallowed-tools` take commas or spaces, as in `Bash(git add *) Read`.
 */
export type ToolListSeparators = 'commas' | 'commas-or-spaces';

/**
 * Splits a tool list the way Claude Code reads one: a YAML list as is, or a
 * string at its separators, except inside parentheses, so `Bash(git diff *, x)`
 * and `Agent(researcher, analyst)` each stay one entry.
 */
export const splitToolList = (
  value: unknown,
  separators: ToolListSeparators = 'commas',
): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value !== 'string') return [];

  const items: string[] = [];
  let depth = 0;
  let current = '';

  for (const character of value) {
    if (character === '(') depth += 1;
    if (character === ')') depth = Math.max(0, depth - 1);
    const separates =
      character === ',' || (separators === 'commas-or-spaces' && /\s/.test(character));
    if (separates && depth === 0) {
      items.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  items.push(current);

  return items.map((item) => item.trim()).filter(Boolean);
};

export type ParsedRule =
  | { kind: 'tool'; tool: string; specifier: string | null }
  | { kind: 'mcp'; server: string; tool: string | null };

/** Reads `Tool`, `Tool(specifier)`, `mcp__server`, `mcp__server__*`, or `mcp__server__tool`. */
export const parseToolRule = (rule: string): ParsedRule => {
  const trimmed = rule.trim();

  if (trimmed.startsWith('mcp__')) {
    const [server = '', ...rest] = trimmed.slice('mcp__'.length).split('__');
    const tool = rest.join('__');

    return { kind: 'mcp', server, tool: tool === '' || tool === '*' ? null : tool };
  }

  const match = /^([^()]+)\((.*)\)$/s.exec(trimmed);
  if (match) return { kind: 'tool', tool: (match[1] ?? '').trim(), specifier: match[2] ?? '' };

  return { kind: 'tool', tool: trimmed, specifier: null };
};

export const formatToolRule = (tool: string, specifier?: string | null): string =>
  specifier === undefined || specifier === null || specifier.trim() === ''
    ? tool
    : `${tool}(${specifier.trim()})`;

/** `mcp__server` for every tool a server supplies, or `mcp__server__tool` for one. */
export const formatMcpRule = (server: string, tool?: string | null): string =>
  tool ? `mcp__${server.trim()}__${tool.trim()}` : `mcp__${server.trim()}`;

/** Where a tool rule is written, which changes what it means. */
export type RuleContext =
  /** A skill's `allowed-tools`: pre-approval during the turn that invokes it. */
  | 'pre-approve'
  /** A subagent's `tools`: the only tools it gets. */
  | 'allowlist'
  /** A subagent's `disallowedTools` or a skill's `disallowed-tools`: tools taken away. */
  | 'remove';

/** What's wrong with one rule, or worth knowing, in the place it's written. */
export const ruleIssues = (rule: string, context: RuleContext): FieldIssue[] => {
  const parsed = parseToolRule(rule);

  if (parsed.kind === 'mcp') {
    if (parsed.server === '' || parsed.server === '*') {
      return context === 'remove' && parsed.server === '*'
        ? []
        : [{ severity: 'error', message: `\`${rule}\` needs a server name after \`mcp__\`.` }];
    }

    return [];
  }

  const known = findClaudeTool(parsed.tool);
  const issues: FieldIssue[] = [];

  if (!known && /\s/.test(parsed.tool)) {
    issues.push({
      severity: 'warning',
      message: `\`${parsed.tool}\` reads as one name. Separate tools with commas, such as \`${parsed.tool.split(/\s+/).join(', ')}\`.`,
    });
  } else if (!known) {
    issues.push({
      severity: 'warning',
      message: `\`${parsed.tool}\` isn’t a built-in tool name. Names are case-sensitive; MCP tools start with \`mcp__\`.`,
    });
  }

  if (parsed.specifier === null) {
    if (context === 'pre-approve' && parsed.tool === 'Bash') {
      issues.push({
        severity: 'warning',
        message:
          '`Bash` on its own pre-approves every command. Scope it, such as `Bash(git log *)`.',
      });
    }

    return issues;
  }

  if (context === 'remove') {
    issues.push({
      severity: 'warning',
      message: `\`${rule}\` removes all of \`${parsed.tool}\`, not just what’s in the parentheses. Block a single command with a deny rule in settings instead.`,
    });
  } else if (context === 'allowlist' && parsed.tool !== 'Agent') {
    issues.push({
      severity: 'warning',
      message: `A subagent’s \`tools\` takes tool names. \`${rule}\` gives it all of \`${parsed.tool}\`.`,
    });
  }

  if (parsed.specifier.trim() === '') {
    issues.push({ severity: 'error', message: `\`${rule}\` has empty parentheses.` });
  } else if (known && !known.family) {
    issues.push({
      severity: 'warning',
      message: `\`${parsed.tool}\` takes no specifier; it’s allowed or denied whole.`,
    });
  } else if (known?.family === 'domain' && !parsed.specifier.trim().startsWith('domain:')) {
    issues.push({
      severity: 'error',
      message: `\`WebFetch\` rules name a domain, such as \`WebFetch(domain:${parsed.specifier.trim() || 'example.com'})\`.`,
    });
  } else if (
    context === 'pre-approve' &&
    /^\w+:/.test(parsed.specifier) &&
    known?.family !== 'domain'
  ) {
    issues.push({
      severity: 'warning',
      message: `\`${rule}\` matches a parameter. Rules like that are for deny and ask rules, not pre-approval.`,
    });
  }

  return issues;
};

/** A subagent's tools: everything the session has, minus some, or only a chosen few. */
export type ToolAccess = {
  mode: 'inherit' | 'only';
  /** The `tools` allowlist, used in `only` mode. */
  allowed: string[];
  /** `disallowedTools`. */
  blocked: string[];
};

/** Reads a subagent's `tools` and `disallowedTools`. No `tools` means it inherits everything. */
export const readToolAccess = (tools: unknown, disallowedTools: unknown): ToolAccess => {
  const allowed = splitToolList(tools);

  return {
    mode: allowed.length > 0 ? 'only' : 'inherit',
    allowed,
    blocked: splitToolList(disallowedTools),
  };
};

const ruleTool = (rule: string): string => {
  const parsed = parseToolRule(rule);
  return parsed.kind === 'tool' ? parsed.tool : rule;
};

/** Whether the subagent ends up with a built-in tool. */
export const canUseTool = (access: ToolAccess, name: string): boolean => {
  const blocked = access.blocked.some((rule) => ruleTool(rule) === name);
  if (blocked) return false;

  return access.mode === 'inherit' || access.allowed.some((rule) => ruleTool(rule) === name);
};

/**
 * Gives or takes one built-in tool. In `only` mode that edits the allowlist;
 * in `inherit` mode it edits the blocked list. Either way, a tool never ends
 * up in both lists.
 */
export const setToolUse = (access: ToolAccess, name: string, use: boolean): ToolAccess => {
  const without = (rules: string[]): string[] => rules.filter((rule) => ruleTool(rule) !== name);
  const blocked = without(access.blocked);

  if (access.mode === 'inherit') {
    return { ...access, blocked: use ? blocked : [...blocked, name] };
  }

  const allowed = without(access.allowed);
  const kept = access.allowed.find((rule) => ruleTool(rule) === name);

  return { ...access, allowed: use ? [...allowed, kept ?? name] : allowed, blocked };
};

const commonTools = toolGroups.flatMap((group) =>
  group.tools.filter((tool) => tool.common).map((tool) => tool.name),
);

/**
 * Switches between inheriting and listing. Listing starts from the common
 * tools the subagent could use a moment ago, so nothing visible changes;
 * built-in blocks become redundant and drop, while MCP and unknown blocks stay.
 */
export const setAccessMode = (access: ToolAccess, mode: ToolAccess['mode']): ToolAccess => {
  if (mode === access.mode) return access;

  if (mode === 'only') {
    return {
      mode,
      allowed: commonTools.filter((name) => canUseTool(access, name)),
      blocked: access.blocked.filter((rule) => !findClaudeTool(ruleTool(rule))),
    };
  }

  return { ...access, mode, allowed: [] };
};

export type AccessPreset = {
  id: string;
  label: string;
  description: string;
  access: ToolAccess;
};

export const accessPresets: AccessPreset[] = [
  {
    id: 'read-only',
    label: 'Read-only',
    description: 'Reads and searches. Can’t edit, run commands, or start subagents.',
    access: { mode: 'only', allowed: [...readOnlyTools], blocked: [] },
  },
  {
    id: 'read-and-edit',
    label: 'Read and edit',
    description: 'Reads, searches, and edits files. No shell.',
    access: { mode: 'only', allowed: [...readOnlyTools, 'Edit', 'Write'], blocked: [] },
  },
  {
    id: 'no-shell',
    label: 'Everything but the shell',
    description: 'Every tool the session has, except commands.',
    access: { mode: 'inherit', allowed: [], blocked: ['Bash', 'PowerShell', 'Monitor'] },
  },
  {
    id: 'everything',
    label: 'Everything',
    description: 'Every tool the session has, including MCP tools.',
    access: { mode: 'inherit', allowed: [], blocked: [] },
  },
];

/** The subagent types an `Agent(a, b)` entry limits it to, or null when `Agent` is unrestricted. */
export const agentRestriction = (access: ToolAccess): string[] | null => {
  const entry = access.allowed.find((rule) => ruleTool(rule) === 'Agent');
  if (!entry) return null;

  const parsed = parseToolRule(entry);
  if (parsed.kind !== 'tool' || parsed.specifier === null) return null;

  return splitToolList(parsed.specifier);
};

/** Sets which subagent types `Agent` may start. An empty list means any. */
export const setAgentRestriction = (access: ToolAccess, agents: string[]): ToolAccess => ({
  ...access,
  allowed: access.allowed.map((rule) =>
    ruleTool(rule) === 'Agent' ? formatToolRule('Agent', agents.join(', ')) : rule,
  ),
});

/** Entries that aren't built-in tools, such as MCP tools, shown and edited as plain rules. */
export const extraRules = (rules: string[]): string[] =>
  rules.filter((rule) => !findClaudeTool(ruleTool(rule)));

/** Replaces the non-built-in entries of a list, keeping the built-in ones in place. */
export const withExtraRules = (rules: string[], extras: string[]): string[] => [
  ...rules.filter((rule) => findClaudeTool(ruleTool(rule))),
  ...extras,
];

/** Whether an entry names a real tool: a built-in one or an MCP server's. */
export const resolvesToTool = (rule: string): boolean => {
  const parsed = parseToolRule(rule);
  if (parsed.kind === 'mcp') return parsed.server !== '' && parsed.server !== '*';

  return findClaudeTool(parsed.tool) !== undefined;
};

/**
 * Whether turning a tool off would leave a listing subagent with nothing that
 * resolves to a tool. Claude Code won't launch one like that, so the last
 * tool stays on.
 */
export const isLastTool = (access: ToolAccess, name: string): boolean => {
  if (access.mode !== 'only' || !canUseTool(access, name)) return false;

  const blocked = new Set(access.blocked.map(ruleTool));
  return !access.allowed.some(
    (rule) => ruleTool(rule) !== name && !blocked.has(ruleTool(rule)) && resolvesToTool(rule),
  );
};

/** Problems with the access as a whole, such as a tool both listed and removed. */
export const accessIssues = (access: ToolAccess): FieldIssue[] => {
  const issues: FieldIssue[] = [];

  if (access.mode === 'only') {
    const blockedNames = new Set(access.blocked.map(ruleTool));
    const usable = access.allowed.filter(
      (rule) => resolvesToTool(rule) && !blockedNames.has(ruleTool(rule)),
    );
    if (usable.length === 0) {
      issues.push({
        severity: 'error',
        message:
          'Nothing in `tools` is a tool the agent can use, so Claude Code won’t launch it. Check at least one tool, or switch to every tool the session has.',
      });
    }

    const overlap = access.allowed
      .map(ruleTool)
      .filter((name) => access.blocked.some((rule) => ruleTool(rule) === name));
    for (const name of new Set(overlap)) {
      issues.push({
        severity: 'warning',
        message: `\`${name}\` is in both \`tools\` and \`disallowedTools\`, so the agent doesn’t get it.`,
      });
    }

    const names = new Set(access.allowed.map(ruleTool));
    if ((names.has('Glob') || names.has('Grep')) && names.has('Bash')) {
      issues.push({
        severity: 'tip',
        message:
          'On macOS, Linux, and WSL, `Glob` and `Grep` only come back for a subagent that lists them and leaves out `Bash`. With `Bash`, it searches with `find` and `grep` instead.',
      });
    }
  }

  return issues;
};
