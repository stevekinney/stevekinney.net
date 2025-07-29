---
title: Claude Code Session Management
description: Manage Claude Code sessions, memory, context, and permissions for optimal development workflows and cost efficiency
modified: 2025-07-29T11:10:42-06:00
---

To begin a session, simply open your terminal in your project directory and type `claude`. You can also start a session with an initial prompt directly from the command line, for example, `claude "explain this project"`. It is recommended to open Claude Code within a specific project folder where you are writing code, rather than your root directory, to ensure it has the correct context.

## Managing Session Context and Memory

Claude Code's ability to retain information and understand your project is fundamental to its effectiveness. This is primarily managed through `CLAUDE.md` files and various commands.

- **CLAUDE.md Files: The Project's Memory**
  - `CLAUDE.md` is a special Markdown file that Claude Code automatically reads and includes in its context at the start of every session in that directory. It acts as a **persistent, project-specific memory**.
  - **Purpose**: These files are ideal for documenting common bash commands, core files and utility functions, code style guidelines, testing instructions, repository etiquette, developer environment setup, and any project-specific behaviors or warnings you want Claude to remember.
  - **Locations**:
    - **Project Memory (`./CLAUDE.md`)**: Located in the root of your project, this is the most common place for `CLAUDE.md` and should be checked into version control to share with your team.
    - **User Memory (`~/.claude/CLAUDE.md`)**: Located in your home directory, its contents are loaded for _all_ your projects, making it suitable for personal preferences like coding style or custom tool shortcuts.
    - **Parent/Child Directory Memory**: Claude recursively looks for `CLAUDE.md` files up the directory tree, loading context from parent directories (e.g., in a monorepo) and child directories on demand.
    - `CLAUDE.local.md` (Deprecated): This file, stored locally and git-ignored, was previously used for personal project-specific notes or sandbox URLs.
  - **Creation and Updates**:
    - You can bootstrap a `CLAUDE.md` file for your codebase by running the `/init` command in the Claude Code CLI. This command scans your codebase and generates a high-level summary of your project's architecture, key components, and functions.
    - To quickly add new memories or instructions during a session, you can start your prompt with the `#` symbol, and Claude will ask you which `CLAUDE.md` file to update.
    - For more extensive edits, use the `/memory` command to open the `CLAUDE.md` file in your default editor. Claude can also help maintain documentation by being prompted to update the `CLAUDE.md` file (e.g., "Please update CLAUDE.md to note that we now use library X for logging").
  - **Best Practices for `CLAUDE.md`**: Keep them concise and human-readable, use Markdown headings and bullet points for organization, and explicitly define code style, common commands, and project workflows. You can use `@` syntax to import other Markdown files for modularity, which helps keep the main file clean and prevents context overload.

### Clearing Conversation History (`/clear`)

- The `/clear` command resets the current chat conversation, effectively wiping the agent's short-term memory.
- **Why it's important**: Large language models are stateless; they reprocess the entire conversation history with every message in the same window, which quickly consumes tokens and can make responses less focused or accurate.
- **When to use it**: Use `/clear` as often as possible, ideally whenever you finish a task, to reduce unnecessary token usage and prevent unrelated tasks from piling up in the same chat.

### Compacting Conversation History (`/compact`)

- The `/compact` command allows you to reduce token usage by summarizing your current conversation and starting a new chat with that summary preloaded.
- **Automatic Compaction**: Claude Code will auto-compact your conversation when it reaches 95% capacity. This setting can be toggled via `/config`.
- **Customization**: You can provide specific instructions for how Claude should summarize, such as "summarize just the to-do items" or "keep the summary to a max of 500 words".
- **Techniques for Long Context Recall**: Beyond `CLAUDE.md` and compaction, effectively utilizing Claude's long context involves summarizing key information or asking Claude to perform targeted searches within your codebase (e.g., "grep and list results").

## Resuming and Continuing Sessions

Claude Code provides commands to continue or resume past conversations, allowing for persistence across work periods.

- **Continue Most Recent Conversation**: Use `claude -c` or `claude --continue`.
- **Resume by Session ID**: Use `claude -r "abc123"` or `claude --resume abc123` to pick up a specific session by its ID.
- **Conversation Picker**: Simply type `claude --resume` to view a list of recent conversations and select one.

## Permissions and Security

By default, Claude Code prioritizes safety and will ask for permission before performing actions that might modify your system, such as file writes or many bash commands.

- **Managing Allowed Tools**: You can manage permissions in four ways:
  1. Select "Always allow" when prompted during a session.
  2. Use the `/permissions` command in Claude Code to add or remove tools from the allowlist (e.g., `/permissions add Edit` or `/permissions add "Bash(git commit:*)"`).
  3. Manually edit your `.claude/settings.json` (for project-specific shared settings) or `~/.claude.json` (for global user settings).
  4. Use the `--allowedTools` CLI flag for session-specific permissions.
- **"Accept all" mode**: You can toggle auto-accept mode (sometimes referred to as "YOLO mode") with `Shift+Tab` to let Claude work autonomously without requesting explicit permission for each action.
- **`--dangerously-skip-permissions`**: This flag, enabled when starting Claude Code from the command line, bypasses all permission barriers, allowing Claude to execute any operation without confirmation. This mode is primarily recommended for CI/CD pipelines or well-controlled development container setups due to the inherent security risks.

## Advanced Session Management Concepts

- **Multi-Agent Collaboration**: Claude Code excels at coordinating multiple AI agents within a single project. By setting up shared communication files (like `coms.md` and `cloth.md`), different agents can be assigned specific roles such as debugging, testing, or documentation, ensuring efficient task division and high-quality outcomes. This fosters both efficiency and precision, making it a cornerstone of effective project management.
- **Git Worktrees**: For working on multiple tasks simultaneously with complete code isolation, developers can use Git worktrees. You can launch separate Claude Code instances in each worktree, maintaining one terminal tab per worktree for better organization.
- **Headless Mode (`claude -p`)**: This non-interactive mode is designed for automation in contexts like CI/CD, pre-commit hooks, and build scripts. It can be used for tasks like issue triage or as a linter. Headless mode does not persist between sessions, so it must be triggered each time.
- **Custom Slash Commands**: For repeated workflows, you can store prompt templates as Markdown files in the `.claude/commands` folder. These become available as slash commands (e.g., `/project:fix-github-issue`) and can be version-controlled and shared with your team.
- **Model Context Protocol (MCP)**: MCP allows Claude Code to connect to external tools and services, vastly extending its capabilities beyond its built-in functionalities. MCP servers can provide access to databases, web browsers, project management tools (like Jira), documentation, and more.

## Troubleshooting and Pro Tips

- **Course Correct Early and Often**: While auto-accept mode allows autonomy, being an active collaborator yields better results. You can interrupt Claude at any time (Ctrl+C or Esc) if it's going off track and then clarify instructions or correct its misunderstanding. You can also double-Esc to revise your previous prompt.
- **Commit Often**: It is a best practice to commit your code changes frequently, especially with Claude Code, as this helps with version control and reviewing changes.
- **Structured Workflows**: Adopt workflows like "explore, plan, code, commit" where Claude first gathers information, then creates a detailed plan for your approval before implementing the solution. This "strategic planning" significantly improves the quality of the final output.
- **Prompt Specificity**: Be explicit and direct in your prompts. Clearly describe the task, constraints, and desired output to guide Claude effectively.
- **Cost Efficiency**: Use memory files (like `CLAUDE.md`) to provide persistent context and reduce repetitive prompting, which saves tokens. The `/cost` command can help monitor token usage if you're concerned about API costs.
- **IDE Integration**: Integrate Claude Code with your IDE (like VS Code or Cursor) for a smoother experience, allowing quick launch, diff viewing, and automatic sharing of selection context.

Think of managing Claude Code sessions like conducting an orchestra. Each `CLAUDE.md` file is a sheet of music, providing the foundational score for the entire performance (your project). Clearing a session is like resetting the stage for a new act, ensuring the musicians aren't distracted by previous melodies. Compacting is like a skilled editor, refining the score to keep it concise and focused, while `MCP` servers introduce new instruments and sounds, allowing the orchestra to play a wider range of compositions. The conductor (you) guides the entire performance, making sure each section plays its part precisely, leading to a harmonious and successful creation.
