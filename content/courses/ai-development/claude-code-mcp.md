---
title: Claude Code and MCP
description: Extend Claude Code's capabilities with Model Context Protocol servers for database access, cloud services, and specialized development tools
modified: 2025-07-24T15:42:12-06:00
---

MCP is an **open protocol** designed to standardize how AI applications, including Claude Code, connect with external tools and data sources. Unlike traditional AI coding assistants that might offer advanced autocompletion or chatbot features, Claude Code, when combined with MCP servers, transforms into an active, autonomous development partner that can manage complex workflows.

## Benefits of Using MCP Servers with Claude Code Include

- **Extending capabilities**: They enable Claude Code to use specialized development tools, access a wide range of APIs and SaaS platforms, and integrate with custom workflows.
- **Real-time information**: They solve the problem of static training data by allowing Claude to access real-time information from databases, documentation, and monitoring systems, grounding its responses in reality and preventing "hallucinations".
- **Enhanced reasoning and interaction**: Claude can reason about, query, or even modify external systems (like a PostgreSQL database) by interacting with them through the structured interface provided by an MCP server.
- **Automation**: MCP servers can be integrated into custom slash commands and hooks for advanced automation.

## MCP Architecture and Types of Servers

The MCP architecture operates on a **client-server model**. Claude Code acts as the **host** and **client**, managing client instances and enforcing security policies, while **servers** are independent programs exposing specific capabilities (tools, resources, or prompts) from external systems. Servers are isolated and only receive necessary context for their tasks, enhancing security and privacy.

The MCP ecosystem is diverse, categorizing servers by their function:

- **Core Utility Servers** provide foundational capabilities for local interaction:
  - **Filesystem** allows reading, writing, creating, and listing files and directories within the sandboxed project scope.
  - **Sequential Thinking** helps Claude break down complex problems into logical steps.
  - **Memory** enables persistent storage and retrieval of information across sessions, allowing Claude to build long-term understanding.
- **Development & DevOps Servers** integrate Claude Code into the Software Development Lifecycle (SDLC):
  - **Version Control** (e.g., GitHub, Azure DevOps) enables managing repositories, issues, and pull requests.
  - **CI/CD and Testing** (e.g., Playwright, Sentry, Codacy) provide capabilities for automated browser testing, real-time error data, and static analysis.
  - **Framework-Specific Servers** (e.g., shadcn) encapsulate best practices for specific UI frameworks.
- **Data & Infrastructure Servers** connect Claude Code to backend systems:
  - **Database Integration** (e.g., Oracle, PostgreSQL) allows querying schemas, retrieving live data, and planning database migrations.
  - **Cloud Services** (e.g., Azure, AWS, Terraform) enable managing cloud resources and Infrastructure as Code.
- **Knowledge & Productivity Servers** link Claude to human context and project management:
  - **Documentation Access** (e.g., Context7, Microsoft Learn) provides real-time, semantic search access to the latest documentation, preventing hallucinations.
  - **Knowledge Bases** (e.g., Notion, Confluence, Figma) connect Claude to internal wikis, design systems, and notes.
  - **Project Management** (e.g., Jira, Linear, Asana, Zapier) allows Claude to interact with project management platforms and automate tasks.

## Setting Up MCP Servers with Claude Code

Setting up MCP servers with Claude Code is straightforward.

1. **Installation**: You register MCP servers using the `claude mcp add` command. This can be done interactively, by providing a JSON configuration with `claude mcp add-json`, or by importing configurations from Claude Desktop using `claude mcp add-from-claude-desktop` (on macOS and WSL). Often, `npx` (for Node.js servers) or `uvx` (for Python servers) are used to run them.
2. **Configuration Scopes**: MCP servers can be configured at three scope levels:
   - **Local (default)**: Temporary and only available in the current session.
   - **User**: Available across all projects for a given user, stored in `~/.claude.json`. This is recommended for personal utilities.
   - **Project**: Shared with the entire team and stored in a `.mcp.json` file at the project's root, which can be version-controlled.
3. **Authentication for Remote Servers**: Many remote MCP servers require authentication. Claude Code supports OAuth 2.0. You add the server, and then use the `/mcp` command within Claude Code to manage authentication. This opens a browser for the OAuth flow, and Claude Code securely stores the access token.

## Using MCP Servers for Control Flow: Returning JSON and Providing Reasons

Hooks are a crucial component for achieving **deterministic control** over Claude Code's behavior, enforcing application-level policies. Hooks communicate status and control flow back to Claude Code primarily through **shell exit codes** and **structured JSON output** to standard output (stdout) [Previous conversation, 81].

### Control Flow with Exit Codes [Previous Conversation, 81, 87]:

- **Exit Code 0**: Indicates success, and execution continues normally. `stdout` output is shown to the user but not seen by Claude [Previous conversation].
- **Exit Code 2**: Signals a **blocking error**, halting the current action (especially for `PreToolUse` hooks). The feedback is read from `stderr` and is fed back to Claude as new input for it to adjust its plan [Previous conversation, 87].
- **Other Non-Zero Exit Codes**: Indicate a non-blocking error. The hook failed, but the agent's execution continues. `stderr` messages are shown to the user but not fed back to Claude [Previous conversation].

### Advanced Control with JSON Output [Previous conversation]:

Hooks can return structured JSON to `stdout` for more granular control:

- `"continue": false`: This is the ultimate override; Claude stops all processing after the hook. A `"stopReason"` string can accompany this, shown to the user but not Claude.
- `"suppressOutput": true`: Hides the hook's `stdout` from the user's transcript.

**Specific `decision` control fields** vary by hook event:

#### `PreToolUse` Hooks

    - `"decision": "approve"`: Bypasses the permission prompt, allowing the tool call to proceed.
    - **`"decision": "block"`**: **Prevents the tool call from executing**. The `reason` field is critical here, as its content is **fed back to Claude**, explaining why the action was blocked and guiding its next steps [Previous conversation, 106].

#### `PostToolUse` Hooks

    - **`"decision": "block"`**: **Automatically prompts Claude with the `reason` provided**. Since the tool has already run, this provides feedback for future actions, not a prevention of the current one [Previous conversation].

#### `Stop`/`SubagentStop` Hooks

    - **`"decision": "block"`**: **Prevents Claude from stopping**. A `reason` field **must be provided** to instruct Claude on how to proceed and continue its work [Previous conversation].

#### Practical Examples of JSON Control Flow with Reasons

- **Enforcing Project Standards**: A `PreToolUse` hook could block Claude from using a disallowed package manager (`npm` in a `bun`-only project) by returning `"decision": "block"` and a `reason` like: `"Project convention violation: Do not use npm. This project uses the bun package manager."` [Previous conversation]. Claude would then receive this feedback and adapt to use `bun`.
- **Security Policies**: A `PreToolUse` hook could prevent modifications to sensitive files (e.g., `.env`) by returning `"decision": "block"` and a `reason`: `"Error: Direct modification of sensitive configuration files (.env) is blocked by policy."` [Previous conversation].
- **Quality Gates**: A `PreToolUse` hook could prevent creating a pull request (`mcp__github__create_pr`) if tests are failing, returning `"decision": "block"` with a `reason` detailing test failures [Previous conversation, 106].
- **Ensuring Task Completion**: A `Stop` hook could prevent Claude from stopping until a checklist is fully completed, returning `"decision": "block"` with a `reason` like: `"The main task is not yet complete. Please continue working on the remaining items in the checklist."` [Previous conversation].

## Debugging and Advanced Workflows

To verify MCP server configuration and debug issues, you can use `claude mcp list` or `claude --mcp-debug`. The `/mcp` command within Claude Code displays the connection status of each MCP server. For general Claude Code issues, `/doctor` checks the installation health.

**Advanced workflows** often combine MCP servers, hooks, and other features:

- **Custom Slash Commands**: These are user-defined, reusable prompts stored as Markdown files in `.claude/commands/`. They can leverage MCP tools and effectively become codified expertise for frequent or complex tasks, initiated by typing `/command_name`. MCP servers can even expose their own prompts as slash commands, prefixed with `/mcp__servername__promptname`.
- **CLAUDE.md**: This special file is automatically pulled into Claude's context at the start of every session in a directory, providing persistent, project-specific memory. It's ideal for documenting project architecture, coding standards, and known pitfalls.
- **Multi-Agent Systems**: MCP is the fundamental communication backbone for coordinating multiple AI agents. Specialized MCP servers, like "Claude Swarm," can orchestrate teams of agents with defined roles, enabling intelligent handoffs and shared contexts. Hooks can automate coordination and enforce workflow rules in these systems.

Using MCP servers with Claude Code is akin to giving a highly skilled artisan a **toolkit of specialized instruments**. While Claude Code is already a powerful craftsman, the MCP servers provide it with a wide array of precision tools—from a magnifying glass for inspecting database schemas (PostgreSQL server) to a sturdy hammer for building web UI components (shadcn server), or even a security scanner for checking vulnerabilities (Codacy server). When you add hooks into the mix, you're not just handing the artisan the tools; you're also providing a **blueprint with strict quality checks and clear instructions**. This blueprint dictates exactly when and how certain tools should be used, and if any step deviates from the plan, it immediately signals the artisan, providing a detailed reason and guiding them back on track, ensuring every piece of work meets your exact standards.
