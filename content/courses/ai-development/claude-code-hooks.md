---
title: Claude Code Hooks
description: Learn how to use event-driven hooks to provide deterministic control over Claude's behavior and automate development workflows
modified: 2025-07-24T15:39:58-06:00
---

Claude Code Hooks are **user-defined shell commands that trigger automatically based on specific events** within a Claude Code session. They provide a **deterministic control layer** over the agent's behavior, ensuring that certain actions or rules are _always_ enforced, rather than relying on the Large Language Model (LLM) to remember or choose to run them. This deterministic enforcement is a key distinction from mere prompting instructions.

## Why Use Hooks?

Hooks are crucial for building robust, efficient, and semi-autonomous development workflows. Their benefits include:

- **Enforcing Rules and Standards**: Hooks transform suggestions into application-level policies, guaranteeing that best practices like running linters or adhering to security policies are executed every time, without fail.
- **Automation**: They enable automated tasks such as running code formatters, executing tests, or sending notifications.
- **Quality Control**: Hooks can act as quality gates, preventing actions (like creating a Pull Request) if certain criteria (e.g., passing tests) are not met.
- **Security Enforcement**: They allow for custom permissions and can **block modifications to sensitive files** or prevent dangerous shell commands, acting as a firewall.
- **Feedback**: Hooks can provide automated feedback to Claude when it produces code that doesn't follow conventions.
- **Workflow Integration**: They seamlessly integrate Claude Code with existing toolchains and services.

## Hook Lifecycle and Events

Hooks are triggered by several distinct lifecycle events, each offering different control capabilities:

- **PreToolUse**: This hook runs _before_ a tool (like `edit_file` or `Bash`) is executed. It is the **most powerful point of control for preventative measures** and is the _only_ event that can proactively **block a tool's execution**.
- **PostToolUse**: This hook runs _after_ a tool has successfully completed. It's ideal for reactive tasks like automatic formatting, running tests, or logging. It cannot block execution but can provide feedback to Claude.
- **Notification**: This hook triggers whenever Claude Code sends a notification to the user, for example, when it's waiting for input or has completed a long task. It is purely informational and cannot block execution.
- **Stop**: This hook runs when the **main Claude Code agent finishes responding**. It can be configured to **prevent the agent from terminating**, forcing it to continue working until a specific condition is met.
- **SubagentStop**: This hook runs when a sub-agent task completes its work. Like the `Stop` hook, it can block the sub-agent from stopping.

## Configuration

Hooks are configured in Claude Code's settings files, typically in JSON format. These files can be:

- `~/.claude/settings.json`: For **user-scoped settings** that apply to all Claude Code sessions for a given user.
- `.claude/settings.json`: For **project-specific shared settings** within a project's root directory, intended to be version-controlled and shared with a team.
- `.claude/settings.local.json`: For **local, git-ignored settings** specific to a user's environment within a project.

Hook configurations are organized by **matchers**, where each matcher can have multiple hooks. Matchers filter when a hook should run, based on criteria like `tool_name` (e.g., `Edit`, `Bash`), `file_paths` (using glob patterns), or the query passed to a tool.

An example of a hook configuration in `settings.json` might look like this (though actual syntax can vary):

```ts
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '\\(.tool_input.command) - \\(.tool_input.description // \"No description\")' >> ~/.claude/bash-command-log.txt"
          }
        ]
      }
    ]
  }
}
```

This example logs Bash commands before they are executed.

## Hook Input and Output

Hooks receive JSON data via standard input (stdin) that provides session information and event-specific data, such as `session_id`, `transcript_path`, and `tool_name`. They communicate status back to Claude Code primarily through **shell exit codes** and, for more advanced control, **structured JSON output** to stdout.

- **Exit Code 0**: Indicates success. Any output to stdout is shown to the user in the transcript, but _not_ to the model.
- **Exit Code 2**: Signals a **blocking error**. This tells Claude Code to halt the current action (for `PreToolUse` hooks) and processes the feedback from `stderr` as new input for Claude to understand the error and adjust its plan. It is crucial that error messages for blocking errors are sent to `stderr`.
- **Other Non-Zero Exit Codes**: Indicate a non-blocking error. The hook failed, but execution continues. The error message from `stderr` is shown to the user, but not to Claude.

Structured JSON output allows for more granular control with fields like `decision` (e.g., "block", "approve"), `reason` (explaining the decision to Claude), `continue` (to stop all processing), and `suppressOutput`.

## Practical Use Cases and Examples

Hooks enable a wide range of automations and policy enforcements:

### Automatic Formatting and Linting

- **Use Case**: Ensure consistent code style and quality after Claude modifies files.
- **Example**: A `PostToolUse` hook that triggers on edits to Python files (`*.py`) and runs `black` and `ruff` to enforce style consistency.

### Security Guardrails/File Protection

- **Use Case**: Prevent Claude from modifying sensitive files or executing dangerous commands.
- **Example**: A `PreToolUse` hook matching `Edit` tool calls for file paths containing `.env`, `.git/`, or `package-lock.json`. The hook exits with code 2 to **block the edit** and provides an error message to Claude, forcing it to reconsider.

### Enforcing Conventions and Corrective Feedback

- **Use Case**: Guide Claude towards correct project-specific behaviors (e.g., using a specific package manager).
- **Example**: A `PreToolUse` hook matching `Bash` commands. If the command contains `npm` in a project that uses `bun`, the hook exits with code 2 and an error message like "Error: This project uses bun, not npm. Please use bun install." Claude receives this feedback and corrects its subsequent commands.

### Automated Test Execution/Quality Gates

- **Use Case**: Automatically run tests after code changes or prevent pull requests if tests are failing.
- **Example**: A `PostToolUse` hook that triggers on edits to source or test files and runs `pytest` (for Python). Alternatively, a `PreToolUse` hook matching the `mcp__github__create_pr` tool could execute the project's test suite and block PR creation if tests fail.

### Custom Notifications

- **Use Case**: Integrate with external notification systems to be alerted when Claude needs input or finishes a long task.
- **Example**: A `Notification` hook that uses a tool like `ntfy` to send a push notification to a user's device when Claude requires attention.

### Automated Git Operations

- **Use Case**: Automatically create git commits after successful file modifications, providing a detailed history of the agent's work.
- **Example**: A `PostToolUse` hook configured to automatically commit changes with a descriptive message after Claude performs an edit.

### Session Management

- **Use Case**: Automate processes at the beginning or end of a Claude Code session.
- **Example**: `session-start` hooks to restore previous context or `session-end` hooks to generate summaries and persist state.

## Advanced Hook Implementation

For complex scenarios, such as managing monorepos with specific tooling requirements, hooks can become quite sophisticated. Developers might need to handle mismatches in exit codes or output streams between their custom scripts and Claude Code's expectations (e.g., ensuring error messages are directed to `stderr` for blocking errors).

## Integration with MCP Tools

Claude Code Hooks work seamlessly with Model Context Protocol (MCP) tools. MCP provides Claude Code with access to external tools and services (e.g., databases, web browsers, project management systems), while hooks provide the policies that govern how Claude uses these tools. For example, a `PreToolUse` hook can be configured to block specific MCP tool calls that target sensitive resources, like `mcp__prod-db__*`.

## Debugging Hooks

Troubleshooting hooks is essential for effective use:

- **Verify Loading**: Use the `/hooks` slash command in Claude Code to display all loaded hook configurations and confirm the settings file was parsed correctly.
- **Test in Isolation**: Run the hook's shell command directly in your terminal to ensure it works as expected outside Claude Code.
- **Check Permissions**: Ensure any scripts called by the hook have necessary execute permissions (e.g., `chmod +x`).
- **Enable Debug Logging**: Launch Claude Code with the `--debug` flag (`claude --debug`) to get verbose output, including details on hook execution and errors.
- **Review `stdout` and `stderr`**: Pay attention to where your hook's output is being directed, especially for blocking errors (exit code 2 needs `stderr`).

## Security Considerations

Since Claude Code hooks execute arbitrary shell commands with your full user permissions without confirmation, **security is paramount**. Users are solely responsible for the commands they configure. Best practices include:

- **Principle of Least Privilege**: When integrating external services or databases via MCP, configure them with the minimum necessary permissions.
- **Secure Hook Authoring**: Treat hook scripts as production code. Always quote shell variables (e.g., `"$VAR"`), validate and sanitize all inputs, and use absolute paths for executables to prevent common vulnerabilities.
- **Use PreToolUse Hooks as a Firewall**: Implement these hooks to create a deny-list for dangerous Bash commands (e.g., `rm`, `curl`) or to block sensitive MCP tool calls.
- **Vet MCP Servers**: Only use MCP servers from trusted providers or after a thorough code audit.

## Community and Future Outlook

The development of hooks is fostering a growing "hook ecosystem," with users creating and sharing installable hook packages and custom behaviors. This trend suggests the emergence of community-driven marketplaces for composable, deterministic control modules, which will significantly enhance the power and reliability of the Claude Code platform. Hooks are considered a core component of advanced orchestration frameworks like Claude-Flow v2, which uses them to automate coordination and enforce workflow rules.

---

**Analogy:** Think of Claude Code Hooks as the **"immune system"** of your AI-powered development workflow. Just as an immune system automatically detects and responds to threats or maintains the body's internal balance without explicit instructions for every single cell, hooks automatically enforce your coding standards, security policies, and testing requirements. They provide a vital layer of automated defense and consistent operation, ensuring your code remains healthy and your development process stays on track, even when the AI agent is given more freedom.
