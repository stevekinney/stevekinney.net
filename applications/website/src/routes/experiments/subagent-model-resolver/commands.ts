export type CommandSet = {
  id: 'unix' | 'windows';
  label: string;
  /** When to use this set. */
  note: string;
  commands: string;
};

export const commandSets: CommandSet[] = [
  {
    id: 'unix',
    label: 'macOS / Linux',
    note: 'Use this on macOS and Linux. WSL and Git Bash count as Unix too.',
    commands: [
      'claude --version',
      'env | grep CLAUDE_CODE_SUBAGENT_MODEL',
      'grep -sh SUBAGENT_MODEL ~/.claude/settings.json .claude/settings.json',
      "grep -sH '^model:' ~/.claude/agents/*.md .claude/agents/*.md",
    ].join('\n'),
  },
  {
    id: 'windows',
    label: 'Windows PowerShell',
    note: 'Use this in PowerShell on Windows. In WSL or Git Bash, use the macOS / Linux tab.',
    commands: [
      'claude --version',
      'Get-ChildItem Env: -ErrorAction SilentlyContinue | Where-Object Name -like \'CLAUDE_CODE_SUBAGENT_MODEL*\' | ForEach-Object { "$($_.Name)=$($_.Value)" }',
      'Select-String -Path "$env:USERPROFILE\\.claude\\settings.json", ".claude\\settings.json" -Pattern \'SUBAGENT_MODEL\' -ErrorAction SilentlyContinue | ForEach-Object { $_.Line }',
      'Select-String -Path "$env:USERPROFILE\\.claude\\agents\\*.md", ".claude\\agents\\*.md" -Pattern \'^model:\' -ErrorAction SilentlyContinue | ForEach-Object { "$($_.Path):$($_.LineNumber):$($_.Line)" }',
    ].join('\n'),
  },
];

/** Picks the tab for the visitor's platform. Call it only in the browser. */
export const detectCommandSet = (platform: string): CommandSet['id'] =>
  /win/i.test(platform) && !/darwin/i.test(platform) ? 'windows' : 'unix';
