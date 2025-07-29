---
title: Referencing Files and Resources in Claude Code
description: Master the @ symbol system in Claude Code to reference files, directories, and MCP resources effectively.
modified: 2025-07-24T15:30:36-06:00
tags: [123]
---

In Claude Code—just like in Cursor, the `@` symbol is a powerful mechanism used to **reference files, directories, and even external Model Context Protocol (MCP) resources**, enabling Claude to access and integrate relevant information directly into its context. This feature significantly enhances Claude Code's ability to understand your project, execute tasks, and provide accurate responses by providing it with explicit, structured context.

## What is `@` Referencing?

`@` referencing serves as a shortcut within Claude Code's interactive sessions and custom commands to specify files or resources that Claude should read or consider. Instead of copying and pasting file contents or providing lengthy descriptions, you can simply use the `@` prefix followed by the path or resource identifier. Claude Code will then automatically fetch and include the content of the specified file or resource into its context.

## Syntax for Referencing Files and Directories

The basic syntax involves typing `@` followed by the file or directory path:

- **Referencing a specific file**: `@path/to/your/file.js`
  - This will include the **full content** of the file in the conversation context.
- **Referencing a directory**: `@path/to/your/directory/`
  - This will provide a **directory listing with file information**, but not the contents of all files within it.

### Tips for File Path Input

- File paths can be **relative or absolute**.
- You can use **tab-completion** in the Claude Code CLI to quickly insert file paths into your prompt, making it easy to reference files or folders anywhere in your repository.
- You can reference **multiple files** in a single message (e.g., `@file1.js and @file2.js`).
- You can also **drag and drop a file** directly into the Claude Code window, which will automatically insert its path.

## Referencing MCP Resources

Beyond local files, `@` also allows you to reference resources exposed by connected MCP servers. This extends Claude's reach to external services like GitHub issues, databases, or API documentation.

- **Syntax for MCP Resources**: `@server:protocol://resource/path`
  - **Examples**:
    - `@github:issue://123`: To analyze GitHub issue #123.
    - `@docs:file://api/authentication`: To review API documentation.
    - `@postgres:schema://users`: To compare a PostgreSQL schema.
- **Functionality**: Resources are automatically fetched and included as attachments when referenced. Claude Code provides tools to list and read MCP resources if servers support them, and these resources can contain various content types (text, JSON, structured data).

## How `@` Enhances Context and Memory

The `@` referencing mechanism is deeply integrated with Claude Code's memory system, particularly with `CLAUDE.md` files:

- **`CLAUDE.md` Imports**: `CLAUDE.md` files, which serve as persistent, project-specific memory, can directly import additional Markdown files using the `@path/to/import` syntax.
  - This allows you to **modularize your project's knowledge base**, preventing the main `CLAUDE.md` file from becoming too large and consuming excessive context.
  - For example, you can link to `docs/testing.md` from your main `CLAUDE.md` for specific testing guidelines.
  - This also enables **hierarchical memory**, where Claude recursively loads `CLAUDE.md` files from parent directories and on-demand from child directories when you interact with files within them.
  - This approach is recommended over the deprecated `CLAUDE.local.md` for multi-git worktrees.
- **Dynamic Context Priming**: When you use `@` to reference a file in a prompt, Claude Code not only includes the file's content but also automatically pulls in any `CLAUDE.md` files present in that file's directory and its parent directories. This ensures that Claude has the most relevant, localized context for the specific task.

## Benefits and Use Cases

Using `@` to reference files offers several key benefits in Claude Code workflows:

1. **Reduced Prompt Overhead**: Instead of repeatedly pasting large code sections or verbose instructions, a simple `@filename` provides Claude with immediate access to the necessary context.
2. **Improved Accuracy and Relevance**: By explicitly directing Claude to specific files or documentation, you minimize guesswork and ensure its responses are more accurate and tailored to your project's specifics.
3. **Enhanced Codebase Understanding**: For tasks like onboarding to a new codebase or deep analysis, you can ask Claude to read relevant files (e.g., "explain the logic in `@src/utils/auth.js`").
4. **Structured Workflows**: `@` can be used within custom slash commands to create highly structured and reusable workflows. For instance, a `/project:fix-github-issue 1234` command might reference the issue details from GitHub via an MCP and then automatically search relevant codebase files.
5. **Efficient Data Handling**: It provides a streamlined way to feed data (like code snippets, logs, or configuration files) into Claude's context, especially when dealing with multiple files.
6. **Multi-Agent Collaboration**: In multi-agent setups, `@` references can be used to pass shared plans, instructions, or artifacts between different Claude instances (e.g., an Architect agent creating a `MULTI_AGENT_PLAN.md` that a Builder agent references).

## Practical Tips for Effective Use

- **Be Specific**: While Claude Code is good at discovering information, explicitly pointing it to relevant files with `@` ensures it focuses on the right content.
- **Combine with `CLAUDE.md`**: Leverage `CLAUDE.md` for high-level project guidelines and common commands, and use `@` imports for more granular, modular documentation.
- **Use for Debugging and Code Review**: When debugging an error or requesting a code review, direct Claude to the specific files involved using `@` for a more targeted and efficient analysis.
- **Visual Context**: You can also provide image paths using `@` (or drag-and-drop screenshots) for UI or design-related tasks, allowing Claude to interpret visual intent.
