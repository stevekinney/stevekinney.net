---
title: Claude Code Hook Examples
description: >-
  Practical examples and cookbook for implementing custom hooks to automate
  workflows and enforce development policies
modified: '2025-09-20T10:39:54-06:00'
date: '2025-07-29T15:09:56-06:00'
---

This cookbook shows copy-ready hook configurations and shell scripts for common guardrails and automations. Hooks run shell commands on specific events (see Hook Control Flow) and can block actions in PreToolUse by exiting with code 2 and writing the explanation to stderr.

## Conventions

- Place project-scoped settings in `.claude/settings.json` and scripts in `.claude/hooks/` (mark scripts executable).
- Exit codes: `0` = allow/ok; `2` = block (PreToolUse only, message to stderr for Claude); other non‑zero = non‑blocking error shown to user.
- Keep messages short and actionable; Claude will read stderr on blocks and adjust its plan.

## Firewall: Block Dangerous Bash Commands

Blocks `rm -rf`, `git reset --hard`, and network curls in PreToolUse for `Bash`.

`.claude/settings.json` (excerpt)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/pre-bash-firewall.sh"
          }
        ]
      }
    ]
  }
}
```

`.claude/hooks/pre-bash-firewall.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

# stdin: JSON with .tool_input.command
cmd=$(jq -r '.tool_input.command // ""')

# Block list (add as needed)
deny_patterns=(
  'rm\s+-rf\s+/'
  'git\s+reset\s+--hard'
  'curl\s+http'
)

for pat in "${deny_patterns[@]}"; do
  if echo "$cmd" | grep -Eiq "$pat"; then
    echo "Blocked command: matches denied pattern '$pat'. Use a safer alternative or explain why it's necessary." 1>&2
    exit 2
  fi
done

exit 0
```

## Policy: Enforce Package Manager

Blocks `npm` in repos that use `pnpm` and suggests the replacement.

`.claude/hooks/pre-bash-enforce-pnpm.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
cmd=$(jq -r '.tool_input.command // ""')

if [ -f pnpm-lock.yaml ] && echo "$cmd" | grep -Eq '\bnpm\b'; then
  echo "This repo uses pnpm. Replace 'npm' with 'pnpm' (e.g., 'pnpm install', 'pnpm run <script>')." 1>&2
  exit 2
fi

exit 0
```

Add it alongside the firewall in `PreToolUse` for `Bash`.

## Protect Sensitive Files on Edit

Blocks edits to protected paths and binaries.

`.claude/hooks/pre-edit-protect-paths.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
file=$(jq -r '.tool_input.path // ""')

deny_globs=(
  ".env*"
  ".git/*"
  "package-lock.json"
  "node_modules/*"
  "*.png" "*.jpg" "*.gif" "*.mp4"
)

for g in "${deny_globs[@]}"; do
  if printf '%s\n' "$file" | grep -Eiq "^${g//\*/.*}$"; then
    echo "Edits to '$file' are blocked by policy. Propose changes elsewhere or explain why this is required." 1>&2
    exit 2
  fi
done

exit 0
```

`settings.json` matcher for Edit tool:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{ "type": "command", "command": ".claude/hooks/pre-edit-protect-paths.sh" }]
      }
    ]
  }
}
```

## Auto‑Format, Lint, and Typecheck After Edits

Runs formatting and quality checks after successful edits. If checks fail, writes a concise summary for Claude.

`.claude/hooks/post-edit-quality.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

msg()
{
  echo "$*"
}

if [ -f package.json ]; then
  # Adjust commands to your stack
  npx prettier -w . || true
  if ! pnpm -s lint; then msg "Lint failed. Please fix lint errors."; fi
  if ! pnpm -s typecheck; then msg "Typecheck failed. Please resolve TS errors."; fi
fi

exit 0
```

`settings.json` matcher for PostToolUse on Edit:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{ "type": "command", "command": ".claude/hooks/post-edit-quality.sh" }]
      }
    ]
  }
}
```

## Auto‑Commit After Successful Edit

Creates small commits to keep a trail of agent work. Consider pairing with a pre-commit hook that enforces formatting.

`.claude/hooks/post-edit-commit.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

git add -A
if ! git diff --cached --quiet; then
  # Simple commit message; or generate with a script summarizing the diff
  git commit -m "chore(ai): apply Claude edit"
fi

exit 0
```

Append this command to the `PostToolUse` Edit list after quality checks.

## Block PR Creation if Tests Fail

Prevents `mcp__github__create_pull_request` unless tests pass.

`.claude/hooks/pre-pr-requires-tests.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

if pnpm -s test -- --reporter=dot; then
  exit 0
else
  echo "Tests are failing. Fix tests before creating a PR." 1>&2
  exit 2
fi
```

Matcher example:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__github__create_pull_request",
        "hooks": [{ "type": "command", "command": ".claude/hooks/pre-pr-requires-tests.sh" }]
      }
    ]
  }
}
```

## Log Bash Commands for Audit

Writes each Bash command to a log file with timestamps.

`.claude/hooks/pre-bash-log.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
cmd=$(jq -r '.tool_input.command // ""')
printf '%s %s\n' "$(date -Is)" "$cmd" >> .claude/bash-commands.log
exit 0
```

## Tips

- Test scripts directly in your shell first; then wire into hooks.
- Keep block messages specific and constructive so Claude can self‑correct.
- Prefer PreToolUse for policy guards; PostToolUse for cleanup and feedback.
- Quote variables; avoid unsafe expansions; use absolute paths for critical tools.
