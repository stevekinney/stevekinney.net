---
title: Claude Code Commands
description: Create and use custom slash commands to encapsulate expertise and workflows into reusable, project-scoped and user-scoped command templates
tags: [1234]
modified: 2025-07-24T15:39:45-06:00
---

At their core, custom slash commands are Markdown files that contain instructions for Claude Code. When you invoke a slash command, its content becomes the prompt sent to Claude. This mechanism allows you to codify expertise and best practices into an executable format, enhancing user convenience and standardizing team knowledge.

Claude Code supports two main types of slash commands:

- **Project-scoped commands**: These commands are specific to a particular project and are stored in the `.claude/commands/` directory within your project's root. They are **version-controlled** and shared with anyone else working on the repository, ensuring consistent procedures and prompts across the team. You access them using the `/project:command_name` or `/project:category:command_name` syntax.
- **User-scoped commands (Personal Commands)**: Stored in your home directory's `~/.claude/commands/` folder, these commands are available to you across all your projects. They are ideal for personal workflow preferences and productivity enhancers. You invoke them with `/user:command_name`.

## How to Create Custom Slash Commands

Creating a custom slash command is straightforward:

1. **Create the directory**: First, create the appropriate directory for your command scope:
   - For project-scoped commands: `mkdir -p .claude/commands`.
   - For user-scoped commands: `mkdir -p ~/.claude/commands`.
2. **Create the Markdown file**: Inside this directory, create a Markdown file (`.md` extension). The filename (without the `.md` extension) will become the command name.
3. **Add instructions**: Populate the Markdown file with the instructions you want Claude to execute.

**Example**: To create a project-scoped command named `optimize`: `echo "Analyze the performance of this code and suggest three specific optimizations:" > .claude/commands/optimize.md`. You would then use `/project:optimize` in your Claude session.

## Key Features and Advanced Usage

Custom slash commands offer several features to enhance their utility:

- **Namespacing**: You can organize commands into subdirectories to create logical and scalable command structures. For instance, a file at `.claude/commands/frontend/component.md` creates the command `/project:frontend:component`.
- **Arguments (`$ARGUMENTS`)**: To create flexible commands that accept user input, include the `$ARGUMENTS` placeholder within your Markdown file. Whatever you type after the command in the Claude Code CLI will be passed as arguments.
  - **Example**: A `fix-issue.md` command could contain: `Find and fix issue #$ARGUMENTS. Follow these steps: 1. Understand the issue…`. You would then invoke it as `/project:fix-issue 1234` to have Claude fix issue #1234.
- **YAML Frontmatter**: Command files can include YAML frontmatter for metadata, such as `allowed-tools` (a list of tools the command can use) and `description` (a brief description of the command).
- **Dynamic Content**: You can include dynamic content using bash commands (`!`) and file references (`@`) within your Markdown files.
- **MCP Prompts as Slash Commands**: Model Context Protocol (MCP) servers can expose prompts that automatically become available as slash commands in Claude Code. These appear with the format `/mcp__servername__promptname`. This allows Claude to access specialized capabilities like controlling a web browser or querying a database via integrated external services.

## Common Slash Command Examples

The community has developed numerous practical slash commands for various tasks:

### GitHub/PR Workflows

    - `/project:fix-github-issue` or `/project:fix-issue`: Analyzes and fixes a GitHub issue by number, including steps for understanding the problem, searching the codebase, implementing changes, running tests, and creating a descriptive commit and PR.
    - `/commit`: Auto-generates a commit message and commits staged changes.
    - `/create-pr`: Handles the entire PR creation process, from branching and committing to formatting code and pushing to GitHub.

### Code Quality and Testing

    - `/project:optimize`: Analyzes code performance and suggests specific optimizations.
    - `/user:security-review`: Reviews code for security vulnerabilities.
    - `/test`: Runs unit tests and reports results.
    - `/check`: Runs a battery of static analysis, security scans, and style checks.
    - `/clean`: Automatically formats code, sorts imports, fixes lint errors, and resolves type-checker complaints.
    - `/repro-issue`: Takes an issue number and generates a failing test case to reproduce the bug.
    - `/tdd`: Guides Claude through a strict Test-Driven Development (TDD) process (red-green-refactor).

### Context and Documentation

    - `/context-prime`: Proactively loads an overview of the project and key design documents to give Claude a "warm start".
    - Commands to generate or update changelogs and `README` files.
    - BMad Method agents are activated by typing `/agent-name` in chat.
    - SuperClaude includes commands like `/user:build` (with flags for `--react`, `--api`, `--tdd`) and `/user:design` (with flags like `--ddd`) for structured project phases. It also offers `/user:analyze` for profiling, security, or architecture analysis, and `/user:troubleshoot` for bug investigation.

## Best Practices, Tips, and Tricks

To maximize the effectiveness of your custom slash commands:

- **Standardize and Share**: For team consistency, store project-scoped commands in your `.claude/commands/` directory and commit them to version control.
- **Conciseness and Structure**: Keep your Markdown files readable and organized using headings and bullet points. A highly effective structure includes distinct sections to constrain the agent's behavior and guide it through a more deterministic process.
- **Encapsulate Complex Instructions**: Use slash commands to turn multi-line, nuanced prompts into single, memorable commands. This helps codify team knowledge and best practices into an executable format.
- **Complement `CLAUDE.md`**: Slash commands complement Claude Code's memory system (`CLAUDE.md`). Use `CLAUDE.md` for guidelines, preferences, and context that apply consistently across many tasks, while slash commands are for specific, repeatable procedures that follow a defined workflow.
- **Optimize Token Usage**: By reducing repetitive instructions, custom commands can lead to more efficient interactions and potentially lower token consumption.
- **Guide the LLM**: Simply providing a one-line prompt might give the LLM too much creative freedom. Structure your commands to explicitly guide Claude's behavior and provide clear direction.
- **Leverage Discoverability**: Commands automatically appear when you type `/` in the Claude Code CLI, making them easy to discover and use.
- **Automate Beyond Prompts**: While slash commands influence Claude's reasoning via structured prompting, they can also be combined with **hooks** for more deterministic control. Hooks are user-defined shell commands that execute automatically at specific points in Claude Code's lifecycle (e.g., `PreToolUse`, `PostToolUse`). This allows you to enforce quality control, security, and workflow integration without relying on the LLM to remember procedural instructions. For example, a `PreToolUse` hook can block dangerous actions, and a `PostToolUse` hook can automatically run a linter or tests after a file is edited.
- **Human Oversight**: Even with advanced automation, human oversight is crucial, especially for broader architectural decisions. You can interrupt Claude's autonomous operations at any time (`Esc`) to course-correct its actions or clarify instructions, preventing it from going down the wrong path.
