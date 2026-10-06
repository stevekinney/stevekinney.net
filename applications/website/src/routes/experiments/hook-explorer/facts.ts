/**
 * What each hook event does, transcribed from the Claude Code and Codex hooks
 * documentation (checked against Claude Code 2.1.288 and Codex 0.160). The
 * schemas say what a payload holds; this says when it arrives and what an
 * answer can change. Prose marks keys, values, and names with backticks.
 */

export type Tool = 'claude' | 'codex';

export const toolLabels: Record<Tool, string> = { claude: 'Claude Code', codex: 'Codex' };

export type GroupId =
  'session' | 'prompts' | 'tools' | 'subagents' | 'compaction' | 'files' | 'mcp';

export const groups: readonly { id: GroupId; title: string }[] = [
  { id: 'session', title: 'Session' },
  { id: 'prompts', title: 'Prompts and responses' },
  { id: 'tools', title: 'Tools and permissions' },
  { id: 'subagents', title: 'Subagents and tasks' },
  { id: 'compaction', title: 'Compaction and model' },
  { id: 'files', title: 'Files and config' },
  { id: 'mcp', title: 'MCP' },
];

export type EventFact = {
  group: GroupId;
  /** When it fires, finishing the sentence "Fires when…" or "Fires…". */
  fires: string;
  /** What the matcher is compared against, or `null` when the event has no matcher. */
  matcher: string | null;
  /** Whether and how its answer can block or change what happens. */
  control: string;
};

export const claudeFacts: Record<string, EventFact> = {
  SessionStart: {
    group: 'session',
    fires: 'when a session begins or resumes.',
    matcher: 'How it started: `startup`, `resume`, `clear`, `compact`, or `fork`.',
    control:
      'Can’t block. It can add `additionalContext`, set `sessionTitle`, add `watchPaths`, and ask for `reloadSkills`.',
  },
  Setup: {
    group: 'session',
    fires: 'with `--init-only`, or with `-p` and `--init` or `--maintenance`.',
    matcher: '`init` or `maintenance`.',
    control: 'Can’t block, and its JSON output is discarded.',
  },
  SessionEnd: {
    group: 'session',
    fires: 'when the session ends.',
    matcher: 'Why it ended: `clear`, `resume`, `logout`, and so on.',
    control: 'Can’t block.',
  },
  UserPromptSubmit: {
    group: 'prompts',
    fires: 'when a prompt is submitted, before Claude processes it.',
    matcher: null,
    control: 'Can block with `decision: "block"`.',
  },
  UserPromptExpansion: {
    group: 'prompts',
    fires: 'when a slash command expands into a prompt.',
    matcher: 'The command name.',
    control: 'Can block with `decision: "block"`.',
  },
  Stop: {
    group: 'prompts',
    fires: 'when Claude finishes responding.',
    matcher: null,
    control: 'Can block with `decision: "block"`, or add `additionalContext`.',
  },
  StopFailure: {
    group: 'prompts',
    fires: 'when a turn ends because of an API error.',
    matcher: 'The error type, such as `rate_limit` or `overloaded`.',
    control: 'Can’t block. Its output is ignored except `terminalSequence`.',
  },
  MessageDisplay: {
    group: 'prompts',
    fires: 'while an assistant message streams.',
    matcher: null,
    control: 'Can’t block. `displayContent` changes what the UI shows, and nothing else.',
  },
  Notification: {
    group: 'prompts',
    fires: 'when Claude Code sends a notification.',
    matcher: 'The notification type.',
    control: 'Can’t block, and its output is ignored.',
  },
  PreToolUse: {
    group: 'tools',
    fires: 'before a tool runs.',
    matcher: 'The tool name.',
    control:
      'Can block or allow: `permissionDecision` takes `allow`, `deny`, `ask`, or `defer`, and `updatedInput` rewrites the tool’s input.',
  },
  PermissionRequest: {
    group: 'tools',
    fires: 'when a tool call needs a permission decision.',
    matcher: 'The tool name.',
    control: 'Decides it: `decision.behavior` is `allow` or `deny`.',
  },
  PermissionDenied: {
    group: 'tools',
    fires: 'when auto mode denies a tool call.',
    matcher: 'The tool name.',
    control: 'Can’t block. `retry: true` lets the model try again.',
  },
  PostToolUse: {
    group: 'tools',
    fires: 'after a tool succeeds.',
    matcher: 'The tool name.',
    control: 'Can’t block, but `updatedToolOutput` replaces the tool’s result.',
  },
  PostToolUseFailure: {
    group: 'tools',
    fires: 'after a tool fails.',
    matcher: 'The tool name.',
    control: 'Can’t block. Its `stderr` is shown to Claude.',
  },
  PostToolBatch: {
    group: 'tools',
    fires: 'after a batch of parallel tool calls resolves.',
    matcher: null,
    control: 'Can block with `decision: "block"`.',
  },
  SubagentStart: {
    group: 'subagents',
    fires: 'when a subagent is spawned.',
    matcher: 'The agent type.',
    control: 'Can’t block.',
  },
  SubagentStop: {
    group: 'subagents',
    fires: 'when a subagent finishes.',
    matcher: 'The agent type.',
    control: 'Can block with `decision: "block"`, or add `additionalContext`.',
  },
  TaskCreated: {
    group: 'subagents',
    fires: 'when a task is created with `TaskCreate`.',
    matcher: null,
    control: 'Can block: `decision: "block"` cancels the task.',
  },
  TaskCompleted: {
    group: 'subagents',
    fires: 'when a task is marked completed.',
    matcher: null,
    control: 'Can block with exit code `2` or `continue: false`.',
  },
  TeammateIdle: {
    group: 'subagents',
    fires: 'when an agent-team teammate goes idle.',
    matcher: null,
    control: 'Can block with exit code `2` or `continue: false`.',
  },
  PreCompact: {
    group: 'compaction',
    fires: 'before compaction.',
    matcher: '`manual` or `auto`.',
    control: 'Can block with `decision: "block"`.',
  },
  PostCompact: {
    group: 'compaction',
    fires: 'after compaction.',
    matcher: '`manual` or `auto`.',
    control: 'Can’t block.',
  },
  PreModelSwitch: {
    group: 'compaction',
    fires: 'before a model switch applies.',
    matcher: 'The canonical model name.',
    control: 'Can block or allow: `permissionDecision` takes `allow`, `deny`, or `ask`.',
  },
  PostModelSwitch: {
    group: 'compaction',
    fires: 'after the session’s model changes.',
    matcher: 'The canonical model name.',
    control: 'Can’t block. It can add `additionalContext`.',
  },
  CwdChanged: {
    group: 'files',
    fires: 'when the working directory changes.',
    matcher: null,
    control: 'Can’t block.',
  },
  DirectoryAdded: {
    group: 'files',
    fires: 'when a directory is added mid-session.',
    matcher: 'How it was added: `slash_command` or `register_repo_root`.',
    control: 'Can’t block.',
  },
  FileChanged: {
    group: 'files',
    fires: 'when a watched file changes on disk.',
    matcher: 'Literal file names to watch.',
    control: 'Can’t block.',
  },
  WorktreeCreate: {
    group: 'files',
    fires: 'when a worktree is created.',
    matcher: null,
    control: 'Can block: any non-zero exit fails the creation.',
  },
  WorktreeRemove: {
    group: 'files',
    fires: 'when a worktree is removed.',
    matcher: null,
    control: 'Can block: a non-zero exit fails the removal if the directory exists.',
  },
  ConfigChange: {
    group: 'files',
    fires: 'when a config file changes mid-session.',
    matcher: 'The config source, such as `user_settings` or `project_settings`.',
    control: 'Can block with `decision: "block"`.',
  },
  InstructionsLoaded: {
    group: 'files',
    fires: 'when `CLAUDE.md` or `.claude/rules` files load.',
    matcher: 'The load reason, such as `session_start` or `nested_traversal`.',
    control: 'Can’t block.',
  },
  Elicitation: {
    group: 'mcp',
    fires: 'when an MCP server asks the user for input.',
    matcher: 'The MCP server name.',
    control: 'Can answer for the user: `action` is `accept`, `decline`, or `cancel`.',
  },
  ElicitationResult: {
    group: 'mcp',
    fires: 'after the user answers an elicitation.',
    matcher: 'The MCP server name.',
    control: 'Can change the answer: `action` is `accept`, `decline`, or `cancel`.',
  },
};

export const codexFacts: Record<string, EventFact> = {
  SessionStart: {
    group: 'session',
    fires: 'when a session starts or resumes.',
    matcher: '`startup`, `resume`, `clear`, or `compact`.',
    control: 'Can add context. `continue: false` stops the turn.',
  },
  SessionEnd: {
    group: 'session',
    fires: 'when a session ends or is archived.',
    matcher: '`other`, the only value today.',
    control: 'Advisory only.',
  },
  UserPromptSubmit: {
    group: 'prompts',
    fires: 'before a prompt is sent.',
    matcher: null,
    control: 'Can block with `decision: "block"`.',
  },
  Stop: {
    group: 'prompts',
    fires: 'when a turn completes.',
    matcher: null,
    control: '`decision: "block"` starts a new turn.',
  },
  Interrupt: {
    group: 'prompts',
    fires: 'when the active turn is interrupted.',
    matcher: null,
    control: 'Advisory only.',
  },
  PreToolUse: {
    group: 'tools',
    fires: 'before a tool runs (`Bash`, `apply_patch`, or an MCP tool).',
    matcher: '`tool_name`.',
    control: 'Can deny with `permissionDecision`, rewrite the input, or add context.',
  },
  PermissionRequest: {
    group: 'tools',
    fires: 'when approval is needed.',
    matcher: '`tool_name`.',
    control: 'Can allow or deny without showing the prompt.',
  },
  PostToolUse: {
    group: 'tools',
    fires: 'after a tool completes.',
    matcher: '`tool_name`.',
    control:
      'Can block and replace the result with feedback, but can’t undo what the tool already did.',
  },
  SubagentStart: {
    group: 'subagents',
    fires: 'before a subagent begins.',
    matcher: '`agent_type`.',
    control: 'Can add context. `continue: false` is parsed but doesn’t stop the subagent.',
  },
  SubagentStop: {
    group: 'subagents',
    fires: 'when a subagent completes.',
    matcher: '`agent_type`.',
    control: '`decision: "block"` keeps the subagent going.',
  },
  PreCompact: {
    group: 'compaction',
    fires: 'before compaction.',
    matcher: '`manual` or `auto`.',
    control: '`continue: false` stops compaction.',
  },
  PostCompact: {
    group: 'compaction',
    fires: 'after compaction.',
    matcher: '`manual` or `auto`.',
    control: '`continue: false` stops processing.',
  },
};

export const factsFor: Record<Tool, Record<string, EventFact>> = {
  claude: claudeFacts,
  codex: codexFacts,
};

/** Exit codes and how stdout is read, one short list per tool. */
export const exitCodes: Record<Tool, readonly string[]> = {
  claude: [
    '`0` is success. stdout is parsed as JSON when it starts with `{` and ends with `}`. Plain text on stdout is added as context on `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart`, and `PostModelSwitch`; otherwise it goes to the debug log.',
    '`2` is a blocking error on events that can block. It blocks whatever the JSON says, with the message from the JSON `reason` if there is one and from stderr if not.',
    'Any other code is a non-blocking error for most events, and JSON on stdout is still read. On `WorktreeCreate` and `WorktreeRemove`, any non-zero exit is a failure.',
  ],
  codex: [
    '`0` with valid JSON is success.',
    '`2` is a blocking decision, with the reason taken from stderr.',
    'An unknown key anywhere in the JSON on stdout makes the hook run fail, so the hook fails closed.',
    'A block needs a non-empty `reason`, and a `PreToolUse` `allow` needs `updatedInput`. The field lists here can’t show either rule.',
  ],
};
