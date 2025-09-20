---
title: Installing and Getting Started with Cursor
description: >-
  Download, install, and configure Cursor AI code editor with VS Code migration
  and core interaction modes.
modified: '2025-07-30T07:29:10-05:00'
date: '2025-07-29T15:09:56-06:00'
---

You can [download Cursor here](https://cursor.com). The installation process is straightforward and feels similar to installing Visual Studio Code (and for a good reason, right?): download, run, and it's done.

## Initial Setup and Onboarding

A neat part of onboarding with Cursor is its **one-click migration feature**, which automatically imports all your existing extensions, settings, themes, and keybindings from a Visual Studio Code installation. This ensures the new environment is immediately familiar and configured for productivity. While the initial setup is easy, mastering advanced features like `.cursor/rules` or background agents might take some time, requiring experimentation—trust me.

## Core Workflow and Interaction Modes

Cursor's daily usage revolves around three fundamental interaction modes:

- **Inline Edit (Cmd/Ctrl+K)**: This is considered a "killer feature" for surgical, in-place code modifications. You select a block of code, press `Cmd/Ctrl+K`, and issue a natural language instruction (e.g., "Refactor this function to use async/await"). The AI proposes changes directly within the editor with a color-coded diff view for clear additions and deletions before acceptance. It's ideal for quick, targeted changes and generation.
- **AI Chat (Cmd/Ctrl+L)**: This opens a conversational interface, similar to ChatGPT but with the context of your entire codebase. It's useful for brainstorming, asking questions about the codebase (e.g., "Show me where the database connection string is defined"), and generating larger code blocks. By default, it's aware of the current file, but you can include the whole repository using the "Codebase" button or typing `@codebase`.
- **The Agent (Cmd/Ctrl+I)**: This mode enables true agentic coding for complex, multi-file tasks. You describe a high-level goal, and the agent plans and executes the necessary changes across the entire project. It can create and modify files, run terminal commands, perform semantic code searches, and handle file operations autonomously. By default, the agent will ask for user approval before executing any command, ensuring you remain in control. This mode is now often the default chat mode.

## Customizing Behavior and Context Management

**Prompting Effectively**: The quality of AI-generated code heavily depends on the prompts.

- **Be Specific**: Clearly define the task, language, function/class name, inputs/outputs, and style guidelines. Vague prompts like "Make this better" or "Fix everything" are less effective.
- **Provide Context**: Include relevant code snippets or descriptions. Cursor automatically provides context like the current file, recently viewed files, semantic search results, linter errors, and edit history.
- **Set Constraints**: Specify limitations or requirements (e.g., error handling, edge cases, performance optimization, coding standards).
- **Examples**: "Add TypeScript types to this function. Don't change logic" is a good prompt. Providing a template for new components (e.g., "Create a new `DropdownMenu` component that follows the same style and structure as the Select component in `@components/select.tsx`") helps the AI emulate a concrete pattern.
- **Break Down Problems**: For complex tasks, ask the AI to outline its strategy first (e.g., "First, provide a PLAN with your REASONING. Then, implement the changes step-by-step"). This "Plan-and-Act" approach allows for review and approval of the plan before execution.
- **Iterative Refinement**: Treat the process as a dialogue, refining prompts based on AI output and providing specific feedback on errors.
- **Ask Questions**: Encourage Cursor to ask clarifying questions by ending your prompt with phrases like "Ask any and all questions you might have that makes the instructions clearer".

**`.cursor/rules` Files**: These files allow you to define project-wide rules and styles that Cursor follows every time it edits. They are typically stored in a `.cursor/rules` file at the root of your project.

- They can enforce code style, language preferences (e.g., "Always write code in **TypeScript**"), formatting, and quality guidelines.
- Rules can be configured to apply always, auto-attach based on file patterns, or be requested by the agent.
- **Global AI Rules**: You can establish universal guidelines that the AI should always follow across all projects under `Settings -> Cursor Settings -> Rules -> User Rules`.
- It's recommended to start small and iterate on your rules as you go, adding to them when you notice the AI making the same mistake twice.

**[Notepads](cursor-notepads.md)**: These are like "supercharged sticky notes" for your code.

- They can store frequently used prompts, file references, and explanations for quick reuse.
- You can create dynamic templates and reference them using the `@` syntax (e.g., `@MyNotepad`).
- They are useful for documenting project architecture, development guidelines, or team-specific rules.
- **@ Symbol for Context**: This is Cursor's primary mechanism for providing specific context to the AI.
- **@Files and @Folders**: Reference specific files or entire directories (e.g., `@files:app/services/data_service.py`).
- **@Code and @Symbols**: Reference a specific function, class, or variable within the project (e.g., `@code:processOrder`).
- **@Docs**: Reference official documentation for libraries and frameworks. You can also add your own documentation by URL, and Cursor will index it.
- **@Web**: Allows Cursor to perform a live web search to find relevant, up-to-date information, adding search results to your query's context.

**[Model Context Protocol](mcp.md) (MCP)**: An open standard that allows AI agents to safely and efficiently connect to external tools, data sources, and APIs.

- Cursor integrates MCP as a core extensibility mechanism, transforming context provision into a programmable process.
- It manages MCP server connections via a declarative `mcp.json` file, supporting both project-specific (`.cursor/mcp.json`) and global (`~/.cursor/mcp.json`) toolsets.
- MCP enables integrations with project management tools (Linear, Shortcut), design tools (Figma), browser/debugging tools, and databases like PostgreSQL, allowing the AI agent to access real-time, authoritative context and new capabilities.
- When the agent uses an MCP tool, it usually requires **explicit user approval** by default, showing which tool it wants to call and its arguments.

## Advanced Features and Best Practices

- **AI Models**: Cursor allows you to choose from various models like GPT-3.5, GPT-4, Claude, and Gemini. Each has pros and cons regarding speed, cost, and accuracy. For complex architecture or critical tasks, Claude Opus is recommended, while GPT-4 is good for deep restructuring, and Claude Sonnet for general coding. There is also an "Auto" mode that intelligently selects the most appropriate model. You can use your own API keys for services like OpenAI or Anthropic for more control over costs.
- **Debugging with AI**: Cursor can help debug by analyzing error messages and stack traces, suggesting fixes, and even instrumenting code with logs to trace variable values. It also has a "Bug finder" feature that scans code and recent changes for potential bugs and offers fixes.
- **Test-Driven Development (TDD)**: Cursor can be instructed to "Write tests first, then write the code to implement the feature, and finally, run the tests and update the code until all tests pass". This provides confidence that the generated code meets specifications.
- **Automated Linting Fixes**: With "Iterate on Lints" enabled, the agent can automatically run linters (e.g., ESLint) and attempt to fix violations.

**Git Integration**

- **AI-generated Commit Messages**: Cursor can automatically generate descriptive Git commit messages based on staged changes, often adapting to the repository's existing commit style.
- **AI-assisted Code Reviews**: You can leverage the agent as a code reviewer by providing it with pending changes (e.g., `@Commit (Diff of Working State)` context) and asking it to review like a senior engineer.

**Yolo Mode**: This setting allows the agent to apply changes and run tests without explicit approval. It's recommended only when you trust the AI and context. (So, like _never_.)

- **Managing Context Window**: AI context windows are limited. It's advised to **keep conversations short and focused** and to **commit early and often** to avoid losing context or getting stuck in loops. Breaking down large requests into smaller steps helps manage context.
- **Privacy Mode**: For proprietary or sensitive code, enable "Privacy Mode" in `Settings > General > Privacy Mode`. When active, Cursor guarantees that user code is never stored on its servers or used for model training by third-party providers. For maximum security, "Local/Ghost Mode" ensures all processing happens locally. Cursor is SOC 2 Type II certified, adhering to high industry standards for security and privacy.
