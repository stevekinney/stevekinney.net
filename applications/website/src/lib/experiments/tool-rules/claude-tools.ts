/**
 * Claude Code's built-in tools, as named in code.claude.com/docs/en/tools-reference
 * (checked 2026-10-06). The names are the exact strings permission rules,
 * subagent `tools` lists, and hook matchers use.
 */

/** Which permission-rule specifier a tool takes, from the tools reference's rule table. */
export type RuleFamily =
  'command' | 'powershell' | 'read-path' | 'edit-path' | 'domain' | 'agent' | 'skill';

export type ClaudeTool = {
  name: string;
  /** What the tool does, in a few words. */
  summary: string;
  /** The specifier its rules take. Tools without one are allowed or denied whole. */
  family?: RuleFamily;
  /** Common tools are shown first; the rest sit under "More tools". */
  common?: boolean;
};

export type ToolGroup = { title: string; tools: ClaudeTool[] };

export const toolGroups: ToolGroup[] = [
  {
    title: 'Read and search',
    tools: [
      { name: 'Read', summary: 'Read files', family: 'read-path', common: true },
      { name: 'Grep', summary: 'Search file contents', family: 'read-path', common: true },
      { name: 'Glob', summary: 'Find files by name', family: 'read-path', common: true },
      {
        name: 'LSP',
        summary: 'Definitions, references, type errors',
        family: 'read-path',
        common: true,
      },
    ],
  },
  {
    title: 'Change files',
    tools: [
      { name: 'Edit', summary: 'Edit files', family: 'edit-path', common: true },
      { name: 'Write', summary: 'Create or overwrite files', family: 'edit-path', common: true },
      { name: 'NotebookEdit', summary: 'Edit Jupyter cells', family: 'edit-path', common: true },
    ],
  },
  {
    title: 'Run commands',
    tools: [
      { name: 'Bash', summary: 'Run shell commands', family: 'command', common: true },
      {
        name: 'PowerShell',
        summary: 'Run PowerShell commands',
        family: 'powershell',
        common: true,
      },
      { name: 'Monitor', summary: 'Watch a command’s output', family: 'command', common: true },
    ],
  },
  {
    title: 'Web',
    tools: [
      { name: 'WebFetch', summary: 'Fetch a URL', family: 'domain', common: true },
      { name: 'WebSearch', summary: 'Search the web', common: true },
    ],
  },
  {
    title: 'Delegate',
    tools: [
      { name: 'Agent', summary: 'Start subagents', family: 'agent', common: true },
      { name: 'Skill', summary: 'Run skills', family: 'skill', common: true },
      { name: 'Workflow', summary: 'Run a workflow script', common: true },
      { name: 'SendMessage', summary: 'Message other agents' },
      { name: 'ListAgents', summary: 'List agents it can message' },
    ],
  },
  {
    title: 'Plans and tasks',
    tools: [
      { name: 'AskUserQuestion', summary: 'Ask multiple-choice questions' },
      { name: 'EnterPlanMode', summary: 'Switch to plan mode' },
      { name: 'ExitPlanMode', summary: 'Present a plan for approval' },
      { name: 'TaskCreate', summary: 'Add to the task list' },
      { name: 'TaskGet', summary: 'Read a task' },
      { name: 'TaskList', summary: 'List tasks' },
      { name: 'TaskUpdate', summary: 'Update a task' },
      { name: 'TaskStop', summary: 'Stop a background task' },
      { name: 'TaskOutput', summary: 'Read a background task’s output (deprecated)' },
      { name: 'TodoWrite', summary: 'Session checklist (off by default)' },
    ],
  },
  {
    title: 'Session',
    tools: [
      { name: 'EnterWorktree', summary: 'Switch into a git worktree' },
      { name: 'ExitWorktree', summary: 'Leave a worktree' },
      { name: 'CronCreate', summary: 'Schedule a prompt' },
      { name: 'CronDelete', summary: 'Cancel a scheduled prompt' },
      { name: 'CronList', summary: 'List scheduled prompts' },
      { name: 'ScheduleWakeup', summary: 'Pace a self-paced loop' },
      { name: 'ToolSearch', summary: 'Load deferred tools' },
      { name: 'ListMcpResourcesTool', summary: 'List MCP resources' },
      { name: 'ReadMcpResourceTool', summary: 'Read an MCP resource' },
      { name: 'WaitForMcpServers', summary: 'Wait for MCP servers to connect' },
      { name: 'PushNotification', summary: 'Send a notification' },
      { name: 'SendUserFile', summary: 'Send you a file' },
      { name: 'Artifact', summary: 'Publish an artifact' },
      { name: 'RemoteTrigger', summary: 'Manage routines' },
      { name: 'ReportFindings', summary: 'Report review findings' },
      { name: 'SendFeedback', summary: 'Draft feedback about Claude Code' },
      { name: 'ShareOnboardingGuide', summary: 'Share an onboarding guide' },
      { name: 'SubagentHandback', summary: 'Hand back a subagent’s report' },
      { name: 'EndConversation', summary: 'End the session' },
    ],
  },
];

export const claudeTools: ClaudeTool[] = toolGroups.flatMap((group) => group.tools);

const toolsByName = new Map(claudeTools.map((tool) => [tool.name, tool]));

export const findClaudeTool = (name: string): ClaudeTool | undefined => toolsByName.get(name);

/** Read-only tools: a subagent with only these can look but not touch. */
export const readOnlyTools = ['Read', 'Grep', 'Glob'] as const;

/** How to write a specifier for each family, for placeholders and hints. */
export const specifierGuides: Record<
  RuleFamily,
  { placeholder: string; hint: string; examples: string[] }
> = {
  command: {
    placeholder: 'git log *',
    hint: 'The whole command, with `*` for any text. Each part of `a && b` has to match on its own.',
    examples: ['git diff *', 'npm run test *', 'gh pr view *'],
  },
  powershell: {
    placeholder: 'Get-ChildItem *',
    hint: 'The whole command, with `*` for any text.',
    examples: ['Get-ChildItem *', 'Get-Content *'],
  },
  'read-path': {
    placeholder: './src/**',
    hint: 'A gitignore-style path. `./path` or `path` is relative to where Claude runs, `/path` to the project, `~/path` to your home folder, and `//path` to the filesystem root. Read rules cover `Read`, `Grep`, `Glob`, and `LSP`.',
    examples: ['./src/**', '~/notes/*.md'],
  },
  'edit-path': {
    placeholder: '/src/**',
    hint: 'A gitignore-style path. `./path` or `path` is relative to where Claude runs, `/path` to the project, `~/path` to your home folder, and `//path` to the filesystem root. Edit rules cover `Edit`, `Write`, and `NotebookEdit`.',
    examples: ['/src/**', '/docs/**/*.md'],
  },
  domain: {
    placeholder: 'domain:example.com',
    hint: 'Start with `domain:`, such as `domain:docs.github.com`.',
    examples: ['domain:docs.github.com', 'domain:developer.mozilla.org'],
  },
  agent: {
    placeholder: 'Explore',
    hint: 'A subagent type, such as `Explore`, `Plan`, or one of your own.',
    examples: ['Explore', 'Plan'],
  },
  skill: {
    placeholder: 'deploy *',
    hint: 'A skill name, with `*` for any text.',
    examples: ['release-notes', 'deploy *'],
  },
};
