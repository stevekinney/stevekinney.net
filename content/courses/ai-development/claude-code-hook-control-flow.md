---
title: Claude Code Hook Control Flow
description: Master hook communication through exit codes and JSON output to control Claude's behavior with blocking, approval, and continuation mechanisms
modified: 2025-07-24T15:42:01-06:00
---

Hooks communicate status back to Claude Code primarily through **shell exit codes** and, for more sophisticated control, **structured JSON output** to standard output (stdout). Hooks receive JSON data via standard input (stdin) that provides session and event-specific information, such as `session_id`, `transcript_path`, `tool_name`, `tool_input`, and `tool_response` (depending on the hook event).

## Simple Control: Exit Code

The most fundamental way hooks communicate status is through their **shell exit code**.

- **Exit Code 0**: Indicates success. The hook ran without issues, and execution continues normally. Any output sent to `stdout` is shown to the user in the transcript view (Ctrl-R) but **is not seen by Claude**.
- **Exit Code 2**: Signals a **blocking error**. This is a critical signal that tells Claude Code to **halt the current action** (especially for `PreToolUse` hooks) and process the feedback provided by the hook. This feedback is read from the **`stderr` stream**, not `stdout`. Claude uses this feedback as new input to understand the error and adjust its plan.
- **Other Non-Zero Exit Codes**: Indicate a non-blocking error. The hook failed, but the agent's execution continues. An error message from `stderr` is shown to the user, but it is **not fed back to Claude**.

A common pitfall is that many standard CLI tools write error messages to `stdout` by default, requiring developers to explicitly redirect their output to `stderr` (e.g., `command >&2`) for Claude to receive blocking error feedback.

## Advanced Control: JSON Output

Beyond simple exit codes, hooks can return **structured JSON** to `stdout` for more granular control over Claude's flow.

### Common JSON Fields (for All Hook types)

- `"continue"`: A boolean (default `true`). If set to `false`, **Claude stops all processing after the hook runs**. This is the ultimate override and takes precedence over any `"decision": "block"` output.
- `"stopReason"`: A string message that accompanies `continue: false`. This reason is shown to the user, but **not to Claude**.
- `"suppressOutput"`: A boolean (default `false`). If `true`, the hook's `stdout` is hidden from the user's transcript view.

**Specific Decision Control Fields (depending on hook event):**

## `PreToolUse` Decision Control

- `"decision": "approve"`: Bypasses the standard permission prompt and allows the tool call to proceed. The `reason` is shown to the user but not to Claude.
- `"decision": "block"`: **Prevents the tool call from executing**. The `reason` field is crucial here, as its content is **fed back to Claude**, explaining why the action was blocked and guiding it on how to proceed.
- `"decision": undefined`: Leads to the existing permission flow. The `reason` is ignored.

## `PostToolUse` Decision Control

- `"decision": "block"`: **Automatically prompts Claude with the `reason` provided**. Note that for `PostToolUse` hooks, the tool has already run successfully, so this cannot prevent the action but can provide feedback for future actions.
- `"decision": undefined`: Does nothing. The `reason` is ignored.

## `Stop`/`SubagentStop` Decision Control

- `"decision": "block"`: **Prevents Claude from stopping**. The `reason` field **must be provided** for Claude to know how to proceed and continue its work. This provides a powerful mechanism for ensuring complex tasks are fully completed.
- `"decision": undefined`: Allows Claude to stop. The `reason` is ignored.

The layered system has a clear priority: `continue: false` overrides everything, followed by a JSON `"decision": "block"`, then the simpler exit code 2 mechanism.

## Practical Examples of Returning JSON and Providing Reasons

Using `decision: "block"` with a `reason` is highly effective for enforcing rules and guiding Claude:

- **Enforcing Project Conventions (PreToolUse)**: If Claude tries to use a disallowed package manager like `npm` in a `bun`-only project.
  - **Hook Logic**: A `PreToolUse` hook matching `Bash` commands could check the command input for "npm". If found, it would output JSON with `"decision": "block"` and a `reason` like: `"Project convention violation: Do not use npm. This project uses the bun package manager."`.
  - **Outcome**: Claude receives this explicit, machine-driven feedback and corrects its subsequent commands to use `bun` instead, without relying on prompt instructions.
- **Security Boundaries (PreToolUse)**: Preventing modifications to sensitive files.
  - **Hook Logic**: A `PreToolUse` hook matching `Edit` tool calls for file paths like `.env` or `.git/`. The hook would exit with code `2` (or JSON `decision: "block"`) and output to `stderr` a `reason` such as: `"Error: Direct modification of sensitive configuration files (.env) is blocked by policy."`.
  - **Outcome**: The edit is blocked, and Claude receives clear instructions to reconsider its plan.
- **Quality Gates (PreToolUse)**: Preventing pull requests if tests are failing.
  - **Hook Logic**: A `PreToolUse` hook matching the `mcp__github__create_pr` tool (if using MCP GitHub integration). The hook would execute the project's test suite (e.g., `pytest`). If tests fail, it outputs JSON with `"decision": "block"` and a `reason` detailing the test failures.
  - **Outcome**: PR creation is blocked, and Claude is instructed to fix the failing tests before proceeding.
- **Forcing Task Continuation (Stop/SubagentStop)**: Ensuring complex tasks are fully completed.
  - **Hook Logic**: A `Stop` hook that checks for a specific condition (e.g., all tasks in a checklist are marked done). If the condition is not met, it outputs JSON with `"decision": "block"` and a `reason` like: `"The main task is not yet complete. Please continue working on the remaining items in the checklist."`.
  - **Outcome**: Claude is prevented from stopping and receives a clear instruction to continue its work.

## Configuration and Debugging

Hooks are configured in Claude Code's settings files, typically `~/.claude/settings.json`, `.claude/settings.json`, or `.claude/settings.local.json`. They are organized by matchers (which can be tool names, regex patterns, or empty for all events) and an array of commands to execute.

To debug hooks, you can use the `/hooks` slash command to verify configuration, test commands manually, check exit codes, ensure `stdout` vs. `stderr` expectations are met, and use `claude --debug` for verbose output.

Using hooks for control flow is like setting up a **smart, automated gatekeeper** in your development pipeline. Instead of just letting your AI agent run freely and hoping it follows all your complex instructions, you're placing intelligent checkpoints. If the agent tries to do something you don't want (like modify a crucial file) or something that isn't ready (like create a PR with failing tests), the gatekeeper springs into action, not only stopping the problematic action but also telling the agent _exactly why_ it was stopped and _what it needs to do next_ to get back on track. This ensures consistency, quality, and security, allowing you to "steer" the AI effectively without constant manual oversight.
