import { codexCheckedVersion } from './document';
import type { Target } from './document';

/**
 * How a field is edited. `boolean` is a three-way select (not set, true,
 * false), because leaving a key out isn't the same as `false`. `structured`
 * holds a YAML or TOML block in a text area.
 */
export type FieldKind =
  | 'text'
  | 'textarea'
  | 'list'
  | 'select'
  | 'boolean'
  | 'integer'
  | 'effort'
  | 'structured'
  /** Codex's `[skills]` table, edited as a list of rules and two switches. */
  | 'skills';

/** Choice lists the server reads from skillset's schemas and hands the page. */
export type OptionsKey =
  | 'permissionMode'
  | 'memory'
  | 'isolation'
  | 'color'
  | 'cacheTtl'
  | 'modelVerbosity'
  | 'sandboxMode';

export type SuggestionsKey = 'claudeEffort' | 'codexEffort';

export type FieldDefinition = {
  target: Target;
  /** The key in the file. A nested key uses a dot, as in `experimental.cacheTtl`. */
  key: string;
  label: string;
  /** What the field does and what leaving it out means, in a sentence or two. */
  hint: string;
  group: string;
  kind: FieldKind;
  options?: OptionsKey;
  suggestions?: SuggestionsKey;
  /** For `structured`: the language the block is written in. */
  format?: 'yaml' | 'toml';
  placeholder?: string;
  rows?: number;
  /** Codex checks the key in an agent file, then drops it. */
  noEffect?: boolean;
  /** Where the setting does take effect, shown with the "no effect" label. */
  appliesInstead?: string;
};

export type FieldGroup = {
  id: string;
  target: Target;
  title: string;
  /** A note above the group's fields. Backticks mark keys and values. */
  note?: string;
  /** Open when the page loads. */
  open?: boolean;
};

/** The groups after the essentials. Only Tools starts open. */
export const fieldGroups: readonly FieldGroup[] = [
  {
    id: 'claude-tools',
    target: 'claude',
    title: 'Tools',
    open: true,
    note: 'MCP tools come from the servers in `mcpServers` or the session. Preloading `skills` doesn’t limit tools, and `permissionMode` decides what the agent may do without asking.',
  },
  { id: 'claude-limits', target: 'claude', title: 'Skills and turn limit' },
  { id: 'claude-running', target: 'claude', title: 'How it runs' },
  { id: 'claude-context', target: 'claude', title: 'Context and caching' },
  { id: 'claude-integrations', target: 'claude', title: 'MCP servers and hooks' },
  {
    id: 'claude-undocumented',
    target: 'claude',
    title: 'Undocumented',
    note: 'Claude Code 2.1.288 reads these fields, but its documentation doesn’t mention them, so they can change or disappear without notice.',
  },
  {
    id: 'codex-tools',
    target: 'codex',
    title: 'Tools',
    open: true,
    note: `A Codex agent file can’t limit which tools the agent has. Codex ${codexCheckedVersion} accepts \`sandbox_mode\`, \`[tools]\`, \`mcp_servers\`, and \`hooks\` in an agent file, then drops them. What it does apply is turning skills off: \`[[skills.config]]\` rules with \`enabled = false\`, \`bundled.enabled = false\`, and \`include_instructions = false\`.`,
  },
  { id: 'codex-more', target: 'codex', title: 'Verbosity and nicknames' },
  {
    id: 'codex-tables',
    target: 'codex',
    title: 'MCP servers and hooks',
    note: 'Each table is written in `config.toml` form, headers included, so a fragment copied from `config.toml` works here.',
  },
];

/** The group shown open for each tool, after the name, description, and model. */
export const essentialsGroup = 'essentials';

export const fieldDefinitions: readonly FieldDefinition[] = [
  {
    target: 'claude',
    key: 'effort',
    label: 'Effort',
    hint: 'How hard the model thinks: `low`, `medium`, `high`, `xhigh`, or `max`, or a whole-number budget.',
    group: essentialsGroup,
    kind: 'effort',
    suggestions: 'claudeEffort',
  },
  {
    target: 'claude',
    key: 'permissionMode',
    label: 'Permission mode',
    hint: 'How much the agent may do without asking. Unset, it uses the session’s mode. If the main conversation is in `auto`, `acceptEdits`, or `bypassPermissions`, the agent runs in that mode and ignores this.',
    group: essentialsGroup,
    kind: 'select',
    options: 'permissionMode',
  },
  {
    target: 'claude',
    key: 'skills',
    label: 'Preloaded skills',
    hint: 'Skills loaded in full when the agent starts. It doesn’t stop the agent from using others.',
    group: 'claude-limits',
    kind: 'list',
  },
  {
    target: 'claude',
    key: 'maxTurns',
    label: 'Maximum turns',
    hint: 'Stops the agent after this many turns, each one model request plus the tool calls it makes. Output that hits the cap is marked partial.',
    group: 'claude-limits',
    kind: 'integer',
  },
  {
    target: 'claude',
    key: 'background',
    label: 'Always run in the background',
    hint: '`true` always runs the agent in the background. Unset, Claude decides.',
    group: 'claude-running',
    kind: 'boolean',
  },
  {
    target: 'claude',
    key: 'isolation',
    label: 'Isolation',
    hint: '`worktree` runs the agent in its own git worktree, branched from your default branch rather than your current `HEAD`.',
    group: 'claude-running',
    kind: 'select',
    options: 'isolation',
  },
  {
    target: 'claude',
    key: 'memory',
    label: 'Memory',
    hint: 'A memory directory that persists between runs: `user` (`~/.claude/agent-memory/`), `project` (`.claude/agent-memory/`, which you can commit), or `local` (`.claude/agent-memory-local/`, kept out of version control).',
    group: 'claude-running',
    kind: 'select',
    options: 'memory',
  },
  {
    target: 'claude',
    key: 'color',
    label: 'Color',
    hint: 'The color Claude Code shows the agent in.',
    group: 'claude-running',
    kind: 'select',
    options: 'color',
  },
  {
    target: 'claude',
    key: 'initialPrompt',
    label: 'Initial prompt',
    hint: 'Sent as the first message when this agent runs the whole session with `claude --agent`.',
    group: 'claude-running',
    kind: 'textarea',
    rows: 3,
  },
  {
    target: 'claude',
    key: 'omitClaudeMd',
    label: 'Skip CLAUDE.md files',
    hint: '`true` skips your user, project, and local `CLAUDE.md` files for this agent, in Claude Code 2.1.271 and later. Managed policy still loads.',
    group: 'claude-context',
    kind: 'boolean',
  },
  {
    target: 'claude',
    key: 'experimental.cacheTtl',
    label: 'Prompt cache lifetime',
    hint: 'How long this agent’s prompt cache lasts, `5m` or `1h`. The `subagentPromptCacheTtl` setting wins when both are set.',
    group: 'claude-context',
    kind: 'select',
    options: 'cacheTtl',
  },
  {
    target: 'claude',
    key: 'mcpServers',
    label: 'MCP servers',
    hint: 'A YAML list. Each item is the name of a server you’ve already configured, or one name mapped to a full server entry. Claude Code drops an item it can’t read and still loads the agent.',
    group: 'claude-integrations',
    kind: 'structured',
    format: 'yaml',
    rows: 6,
    placeholder: '- github\n- docs:\n    type: http\n    url: https://example.com/mcp',
  },
  {
    target: 'claude',
    key: 'hooks',
    label: 'Hooks',
    hint: 'Hooks that run only for this agent, in YAML: an event such as `PreToolUse`, then a list of matchers and their handlers.',
    group: 'claude-integrations',
    kind: 'structured',
    format: 'yaml',
    rows: 7,
    placeholder:
      'PreToolUse:\n  - matcher: Bash\n    hooks:\n      - type: command\n        command: ./scripts/check-command.sh',
  },
  {
    target: 'claude',
    key: 'observer',
    label: 'Observer',
    hint: 'An agent type to start as a background observer of this agent.',
    group: 'claude-undocumented',
    kind: 'text',
  },
  {
    target: 'claude',
    key: 'observerMessage',
    label: 'Observer message',
    hint: 'Text added to the end of the observer’s activity digests.',
    group: 'claude-undocumented',
    kind: 'textarea',
    rows: 3,
  },
  {
    target: 'claude',
    key: 'observeSubagents',
    label: 'Observe subagents',
    hint: 'Whether this agent’s own subagents get the observer too. Only `false` changes anything.',
    group: 'claude-undocumented',
    kind: 'boolean',
  },
  {
    target: 'codex',
    key: 'model_reasoning_effort',
    label: 'Reasoning effort',
    hint: 'How hard the model reasons. Codex accepts the levels the model offers, such as `low`, `medium`, `high`, or `xhigh`.',
    group: essentialsGroup,
    kind: 'text',
    suggestions: 'codexEffort',
  },
  {
    target: 'codex',
    key: 'model_verbosity',
    label: 'Verbosity',
    hint: 'The model’s output verbosity: `low`, `medium`, or `high`.',
    group: 'codex-more',
    kind: 'select',
    options: 'modelVerbosity',
  },
  {
    target: 'codex',
    key: 'nickname_candidates',
    label: 'Nicknames',
    hint: 'Nicknames for this agent. Each has to be unique and use only letters, digits, spaces, hyphens, and underscores.',
    group: 'codex-more',
    kind: 'list',
  },
  {
    target: 'codex',
    key: 'mcp_servers',
    label: 'MCP servers',
    hint: 'One `[mcp_servers.<name>]` table per server, with a `command` or a `url`.',
    group: 'codex-tables',
    kind: 'structured',
    format: 'toml',
    rows: 6,
    noEffect: true,
    placeholder: '[mcp_servers.docs]\ncommand = "npx"\nargs = ["-y", "docs-server"]',
  },
  {
    target: 'codex',
    key: 'hooks',
    label: 'Hooks',
    hint: 'One `[[hooks.<Event>]]` table per matcher group, with its handlers in `[[hooks.<Event>.hooks]]`.',
    group: 'codex-tables',
    kind: 'structured',
    format: 'toml',
    rows: 7,
    noEffect: true,
    placeholder:
      '[[hooks.PreToolUse]]\nmatcher = "shell"\n\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "./scripts/check-command.sh"',
  },
  {
    target: 'codex',
    key: 'skills',
    label: 'Skills',
    hint: 'Turn skills off for this agent. Each rule names a skill by `name` or by `path` and writes `enabled = false`.',
    group: 'codex-tools',
    kind: 'skills',
  },
  {
    target: 'codex',
    key: 'sandbox_mode',
    label: 'Sandbox',
    hint: '`read-only`, `workspace-write`, or `danger-full-access`. Kept here so a loaded file writes back unchanged.',
    group: 'codex-tools',
    kind: 'select',
    options: 'sandboxMode',
    noEffect: true,
    appliesInstead: 'Set `sandbox_mode` in `config.toml` instead.',
  },
  {
    target: 'codex',
    key: 'tools',
    label: 'Tool settings',
    hint: 'The `[tools]` table holds settings for individual tools, such as `[tools.web_search]`. It isn’t an allowlist. Kept here so a loaded file writes back unchanged.',
    group: 'codex-tools',
    kind: 'structured',
    format: 'toml',
    rows: 4,
    placeholder: '[tools.web_search]\ncontext_size = "low"',
    noEffect: true,
  },
];

/**
 * Schema keys with no field of their own, and why. The shared keys are edited
 * at the top of the form and in the body editor.
 */
export const omittedKeys: Record<Target, Record<string, string>> = {
  claude: {
    tools: 'Edited in the Tools group, with `disallowedTools`.',
    disallowedTools: 'Edited in the Tools group, with `tools`.',
    name: 'Shared: the Name field.',
    description: 'Shared: the Description field.',
    model: 'Shared: the Model field.',
  },
  codex: {
    name: 'Shared: the Name field.',
    description: 'Shared: the Description field.',
    model: 'Shared: the Model field.',
    developer_instructions: 'Shared: the body editor.',
  },
};

export const fieldsFor = (target: Target, group: string): FieldDefinition[] =>
  fieldDefinitions.filter((field) => field.target === target && field.group === group);
