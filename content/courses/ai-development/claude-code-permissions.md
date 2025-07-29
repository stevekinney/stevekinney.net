---
title: Claude Code Permissions
description: Configure and manage Claude Code's permission system to balance safety and productivity while maintaining security boundaries
modified: 2025-07-28T07:25:27-06:00
---

By default, Claude Code takes a **conservative approach to safety**, requiring your permission for actions that could modify your system, such as writing files, executing many bash commands, or using Model Context Protocol (MCP) tools. When Claude Code attempts one of these actions, it will pause and prompt you for approval.

Claude Code recognizes and allows you to configure permissions for four main types of tools:

- **Bash Commands**: These are terminal instructions like running scripts, searching files, editing text, or installing packages. You can allow specific commands using exact matches or wildcards (e.g., `npm run test:*`).
- **Read and Edit**: These permissions control which files Claude Code can read from and write to. They often follow `.gitignore` filters.
- **Web Fetch**: Claude Code can fetch information from the web. You can allow it to access specific websites without prompting you for permission each time.
- **MCP Tools**: These permissions manage access to external tools and services integrated via the Model Context Protocol. You can allow or restrict specific tools within an MCP server.

## Managing Permissions and Best Practices

To optimize your workflow and manage costs, it's crucial to proactively configure Claude Code's permissions. Here are several methods and best practices:

### Interacting with Permission Prompts

- When prompted during a session, you can **select "Always allow"** for that specific action to add it to your allowlist.
- You can interrupt Claude Code's autonomous operations at any time (e.g., by pressing `Esc`) to course-correct its actions or clarify instructions, preventing it from going down the wrong path and potentially saving tokens.

### Using the `/permissions` Command

- The `/permissions` command allows you to **add or remove tools from the allowlist**. For example, you can add `Edit` to always allow file edits or `Bash(git commit:*)` to allow Git commits.
- This command helps you specify which commands Claude is allowed to run automatically without asking for manual approval, and which still require it.

### Configuring via Settings Files

- Permissions can be **manually edited in your `.claude/settings.json` (project-specific) or `~/.claude.json` (user-specific) files**. It is recommended to check project-level `settings.json` files into source control to share with your team, ensuring consistent behavior across developers.
- You can set a **`defaultMode`** within `settings.json` to define the default permission behavior when opening Claude Code. For instance, `acceptEdits` will approve most plain file edits automatically.

### Using CLI Flags for Session-Specific Permissions

- The `--allowedTools` CLI flag allows you to specify a **list of tools that should be allowed without prompting** for a specific session.
- Conversely, the `--disallowedTools` flag allows you to **explicitly deny certain tools** for a session.

### Understanding "YOLO Mode" and Its Risks

The `--dangerously-skip-permissions` flag, often referred to as "YOLO mode," **bypasses all permission checks**, allowing Claude Code to execute all operations (including file modifications and command execution) without any prompts.

**This mode should be used with extreme caution** and is generally reserved for trusted local development or controlled environments like CI/CD pipelines, where safeguards like `max_turns` and `timeout_minutes` can prevent runaway costs. Using it on your main development machine is not recommended for most cases due to the risk of unintended consequences, including potential damage to your development environment.

**The `allowedTools` configuration is superior** to "YOLO mode" because it offers granular control and transparency, allowing you to explicitly specify safe operations while retaining oversight for risky ones.

### Security and Isolation Considerations

**Principle of Least Privilege**: Claude Code is sandboxed by default, only accessing the directory where it was launched and its subfolders. Extend this principle to all integrations; for example, give MCP servers connecting to a database only the minimum necessary permissions (e.g., read-only access).

- **Threats and Mitigations**:
  - **Prompt Injection**: Malicious prompts could trick the agent into executing harmful commands or exfiltrating data.
  - **Untrusted MCP Servers**: Compromised external servers could introduce malware or data theft. **Only use MCP servers from trusted providers** or audit open-source server code. Claude Code requires explicit user trust verification for new MCP servers.
  - **Insecure Hooks**: Poorly written hook scripts can lead to command injection vulnerabilities. **Always quote shell variables** (e.g., `"$VAR"`) and **validate/sanitize all inputs** in hook scripts to prevent attacks.

**PreToolUse Hooks as a Firewall**: These hooks execute _before_ a tool is used and are the most powerful mechanism for enforcing custom security policies, such as blocking dangerous bash commands or preventing modifications to sensitive files.

### Leveraging Context and Automation for Efficiency

- **`CLAUDE.md` Files**: These special Markdown files, automatically loaded at the start of a session, provide **persistent, project-specific memory**. By documenting coding standards, architectural patterns, and known pitfalls in `CLAUDE.md`, you can guide Claude's behavior, reduce repetitive instructions, and enhance consistency, which in turn **reduces token consumption**.
- **Custom Slash Commands**: Create reusable prompt templates in `.claude/commands/`. These can encapsulate complex multi-step workflows into a single command, reducing repetitive instructions and saving tokens.
- **Hooks**: User-defined shell commands that execute automatically at specific lifecycle events (e.g., `PreToolUse`, `PostToolUse`) provide **deterministic control** over Claude's behavior. This allows you to enforce code quality (e.g., running linters or tests after file edits) or custom permissions without relying on the LLM to remember and follow instructions, leading to more efficient and reliable automation.
