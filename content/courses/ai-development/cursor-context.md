---
title: Mastering Context Management in Cursor
description: Comprehensive guide to providing effective context to Cursor's AI using @ symbols, rules, and notepads.
modified: 2025-07-29T09:25:33-06:00
---

Cursor's design is based on providing the LLM with two fundamental types of context: "intent context" (what the user wants to achieve) and "state context" (the current state of the environment, such as code snippets, error messages, or project structure). Effectively combining both intent and state in your prompts is crucial for optimal results, as providing one without the other can lead to guesswork, hallucinations, or inefficient code.

Cursor aims to make your codebase "known" to the AI, rather than just glimpsed. This project-wide contextual awareness allows the AI to reason about dependencies, structures, and patterns, dramatically accelerating development and enabling effortless navigation of unfamiliar codebases.

## Automatic Context Gathering

Behind the scenes, Cursor automatically augments your requests with a rich composite of information that defines the AI's role, behavioral rules, and available tools. This "invisible" context includes:

- The **full content of the current file**.
- A list of **recently viewed files**.
- Results from a **semantic search** of the codebase.
- **Active linter or compiler errors**.
- The **recent edit history**.

## Explicit Context Provisioning (The @ Symbol System)

While automatic context is powerful, precision often requires explicit guidance. The `@` symbol is Cursor's primary mechanism for providing surgical context, allowing you to direct the AI's attention accurately and prevent incorrect assumptions or "hallucinations".

Here's how to use various `@` symbols effectively:

- **`@Files`**: References one or more **specific files** as context. This is far more precise than letting the AI guess and is useful for general file-level edits or questions.
  - _Example:_ "Using the patterns in `@src/components/Button.tsx`, create a new Link.tsx component".
- **`@Folders`**: References an **entire directory's structure and contents**. This is handy for providing broad context, such as a large-scale refactor where most files in a folder are relevant.
  - _Example:_ "Review the `@src/api/v1` folder and identify any missing authentication middleware".
- **`@Code` / `@Symbols`**: Provides granular control by referencing a **specific function, class, or variable** within the project. This focuses the AI on a very specific piece of logic.
  - _Example:_ "Refactor the `@useUserData hook` to use React Query instead of a local state".
- **`@Docs`**: Extends the AI's knowledge beyond the local codebase by referencing **official documentation** for libraries and frameworks. You can even add your own documentation by URL for Cursor to index, which is invaluable when using unfamiliar libraries.
  - _Example:_ "Using the `@React Router Docs`, create a protected route that requires authentication".
- **`@Web`**: Empowers the agent to perform a **live web search** to retrieve up-to-date information or answers to general questions. It acts like a research assistant built into Cursor, adding search results to your query's context.
  - _Example:_ "What is the latest stable version of Node.js? `@Web`".
- **`@Git`**: References **Git information** like commit history or diffs. It can be used for tasks like generating descriptive Git commit messages based on staged changes or assisting with code reviews.
  - _Example:_ "Write a commit message for the changes in `@Commit (Diff of Working State)`".
- **`@Linter Errors`**: Provides the **current linter errors** as context, allowing the agent to focus on fixing validation issues.
  - _Example:_ "Fix all issues listed in `@Linter Errors`".
- **`@Past Chats` / `@Recent Changes`**: Helps maintain continuity in a long-running task.
- **`@pr`**: An experimental feature that allows you to reference a **GitHub pull request** for AI-powered reviews, requiring local scripts and GitHub CLI setup.

## Persistent Context (Rules and Notepads)

For consistent, project-specific guidance, Cursor provides ways to define persistent context:

- **`.cursorrules` and `.cursor/rules`**: These files act as a "constitution" for how the AI should behave within a specific project, enforcing consistent code style, language preferences, and quality guidelines.
  - **Project Rules (`.cursor/rules`)**: Stored as Markdown files within the project's repository, these are version-controlled and shared with the entire team. They can specify preferred frameworks, style guidelines, or persistent instructions (e.g., "always write docstrings"). They can be configured to apply "always," "auto-attach" based on file patterns, be "agent requested," or invoked "manually".
  - **User Rules**: Global rules configured in Cursor's settings that apply to all projects, best for personal preferences like tone of response.
  - `.cursorrules` (Legacy): A single-file system located at the project root, still supported but newer project rules are recommended for flexibility.
  - **Best Practices for Rules**: Start small and add to your rules file when you notice Cursor making the same mistake twice. Define them clearly and concisely. You can find examples at `cursor.directory` or `awesome-cursorrules` GitHub repository.
- **Notepads**: These are "supercharged sticky notes" that allow you to store frequently used prompts, file references, and explanations for quick reuse. They can bridge the gap between composer and chat interactions, and a key advantage is their ability to contain and reference `@` symbols themselves, creating reusable context bundles. Notepads can be used for documenting project architecture, development guidelines, reusable code templates, or team-specific rules.

## Context in Different AI Interaction Modes

Cursor's AI features are designed to use context differently depending on the interaction mode:

- **Tab (Predictive Autocomplete and Smart Rewrites)**: This advanced system uses contextual understanding of recent changes and surrounding code to offer multi-line edits and automatically correct minor errors. It helps you code at "the speed of thought" by anticipating your intent.
- **Inline Edit (Cmd/Ctrl+K)**: This tool is for "surgical, in-place code modifications". When used without selection, it generates new code from a natural language prompt, leveraging its understanding of your project. When a code block is selected, it uses the selected code as direct context for targeted refactoring or editing. The proposed changes are shown as a diff.

### AI Chat (Cmd/Ctrl+L) and Agent Mode (Cmd/Ctrl+I)

- **AI Chat (Cmd/Ctrl+L)**: Opens a "project-aware collaborator" interface. It's aware of the current file by default, but you can explicitly include the entire codebase by clicking the **"Codebase" button or typing `@codebase`**. This mode is ideal for high-level questions, brainstorming, understanding complex codebases, and generating larger code segments.
- **Agent Mode (Cmd/Ctrl+I)**: This mode is for **complex, multi-file tasks**, where you describe a high-level goal, and the AI plans and executes changes across the entire project. It builds its understanding by employing custom retrieval models to analyze the codebase for relevant files, functions, and patterns without manual input. The agent can autonomously run terminal commands, create/modify files, and iterate to fix errors or linting issues. Agent mode is now often the default chat mode.

## Context Optimization and Limitations

While Cursor aims for comprehensive context, LLM context windows have limitations. Cursor employs strategies to manage this:

- **Partial File Reading**: In Agent mode, Cursor defaults to reading the first 250 lines of a file, occasionally extending by another 250 lines if needed. For specific searches, it returns a maximum of 100 lines. This is a trade-off to conserve context length and reduce costs.
- **Summarization**: In `@codebase` mode, Cursor may use a smaller model to analyze and summarize each file, potentially leading to incomplete coverage of necessary code, especially for detailed "trap" questions.
- **User Management**: For complex projects with files exceeding 600 lines, it's more effective to explicitly `@` relevant files in Cursor rather than relying on `@codebase` for full file understanding.
- **Shortening Conversations**: Keeping chat conversations short and focused helps prevent long contexts from polluting the project and reduces the risk of losing context. Restarting conversations after completing a feature or fixing a bug can be beneficial.
- **Project Documentation**: Regularly documenting your project's state and structure in files like `README.md` allows Cursor to quickly understand its status when conversations are restarted, minimizing unnecessary context.

## Best Practices for Context Management

To maximize Cursor's effectiveness, consider these practices:

- **Review Diffs**: Always **review the diff preview** before accepting AI-generated changes, as the AI might add or modify more than expected.
- **Use Version Control**: Commit early and often, especially before any significant AI-driven tasks. Git serves as your essential safety net.
- **Be Specific and Detailed in Prompts**: Avoid vague prompts. Explicitly state intent, constraints, and desired outcomes. Providing examples helps the AI emulate desired patterns.
- **Break Down Problems**: For complex tasks, ask the AI to first provide a step-by-step plan and reasoning (Chain-of-Thought or Plan-and-Act), then instruct it to execute. This helps avoid flawed strategies.
- **Iterative Refinement**: Treat interactions as a dialogue. Start broad, then refine prompts based on the AI's output, providing specific feedback.
- **Manage Open Files**: Only open relevant files in the editor to keep the AI focused, or use "Reference Open Editors" to quickly add them to context.
- **Keep Files Small**: Keep code files under 500 lines where possible, making it easier for Cursor's Agent mode to read them completely.
- **Document Functions Clearly**: Document the function and implementation logic in the first 100 lines of files to help the Agent index and understand the purpose.
- **Use Inline Comments**: Guide edits by placing comments like `// AI: Add error handling without breaking existing logic` directly in your code.
- **Adjust Rules as Project Evolves**: Update your `.cursorrules` as your project changes to ensure continued adherence to standards.
- **Test Your Changes**: The AI can help write tests, which can be run in YOLO mode for automated iteration until tests pass.
- **Understand Models**: Choose the right AI model for the task, as different models have different strengths (e.g., Claude for refactoring, GPT for complex reasoning).
