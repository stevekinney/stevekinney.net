---
title: Setting Up Cursor Rules for Consistent AI Behavior
description: >-
  Configure project and user-level rules to enforce coding standards and guide
  AI behavior in Cursor.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-07-29T15:09:56-06:00'
---

Cursor Rules are **persistent instructions that you define for the AI to follow every time it edits or interacts with your codebase**. They act as a **built-in, lightweight linter and style guide for the AI collaborator**, helping to enforce coding conventions, architectural guidelines, and specific preferences across your project. These rules ensure the AI provides more relevant and accurate suggestions by deeply understanding your project's context and your desired coding style.

## Types and Storage of Cursor Rules

Cursor supports different levels of rules:

- **Project-Level Rules:** These are the most powerful and are designed for team collaboration and project-specific conventions.
  - They are stored as **Markdown files within your project's repository**, typically in a `.cursor/rules` folder, allowing them to be version-controlled and shared with the entire team.
  - Examples include specifying preferred frameworks, code style, or architectural guidelines.
- **User-Level Rules (Global Rules):** These are personal preferences configured in Cursor's settings that apply to all projects you work on.
  - They are ideal for individual stylistic choices, such as always preferring functional code over imperative or omitting semicolons in JavaScript/TypeScript.

## Understanding Rule Types

### Project Rules (`.cursor/rules`)

- Live in your repository
- Shared with your team via version control
- Define project-specific conventions
- Examples: testing framework, component patterns, API style

### User Rules (Cursor Settings)

- Personal preferences across all projects
- Not shared with others
- Define your individual coding style
- Examples: preferred language, formatting style, comment preferences

## How Cursor Rules Are Applied

Rules can be configured to apply in various ways, offering flexibility in how the AI adheres to them:

- **Always:** The rule is applied to every request, though this should be used carefully to avoid consuming unnecessary context tokens.
- **Auto Attached:** Cursor automatically attaches the rule when editing files that match specific patterns or extensions.
- **Agent Requested:** The Cursor Agent determines if the rule is relevant and should be applied based on the task description.
- **Manually:** You can manually add specific rules to the context within your chat window with the AI agent.

## What Makes a Good Rule?

- **Specific:** "Use `React.FC` for all components" versus "Use TypeScript"
- **Actionable:** "Add JSDoc comments to exported functions" versus "Document code"
- **Contextual:** "Use React Query for API calls" versus "Handle async properly"

## Real-World Examples of Cursor Rules

```
Personal Coding Preferences:

- Default to TypeScript when language is ambiguous
- Use 2 spaces for indentation, never tabs
- Prefer const over let, never use var
- Add trailing commas in multi-line objects/arrays
- Use explicit return types for all functions
- Write concise comments focusing on intent
- Prefer early returns over nested conditionals
- Use optional chaining (?.) and nullish coalescing (??)
- Format: Prettier with single quotes and no semicolons
```

Cursor Rules can cover a wide range of instructions, from general coding practices to highly specific project requirements:

### Code Style and Quality

- Always write code in TypeScript. Always provide proper type annotations. Do not use `any` unless explicitly allowed.
- Always respect and follow linting rules. Do not introduce new linting errors.
- Prefer functional code over imperative where at all possible.
- Ensure all requested functionality from the plan is fully implemented. Crucially: Leave NO TODO comments, placeholders, or incomplete sections. All code generated must be complete and functional for the planned step.
- Verify code thoroughly before considering a step complete.

### Styling and Design

- Use Tailwind CSS for all styling. Follow consistent utility-first class conventions.
- Ensure the UI is responsive and adapts well to different screen sizes.
- Use consistent color schemes and typography that align with the project using shadcn and tailwind.
- Do consider darkmode and light mode when you design the ui.

### Naming Conventions

- Use snake_case for filenames and variables.
- Keep function names and variable names descriptive and readable.

### Project Structure and Dependencies

- New API endpoints go under `src/api/`.
- For network requests always use fetch instead of a library like axios.

### Commit Messages

- Keep commit messages &lt; 50 chars.
- Use fix, beep, refactor, chore, etc syntax.

### AI Behavior Guidance

- Be concise in logs… Minimize extraneous prose.
- Always respond in a concise, technical tone and avoid conversational filler.
- Ask any and all questions you might have that makes the instructions clearer. (While this is a prompting strategy, it can be embedded within rules to force the AI to seek clarification. **Nota bene**: I have had mixed results on it _actually_ following this one.)
- DO NOT remove or break any existing code. DO NOT modify current logic unless necessary. Only extend or add new code with minimal, safe changes. (**Nota bene**: Again, mixed results here as well.)

## Best Practices for Using Cursor Rules

To maximize the effectiveness of your Cursor Rules:

1. **Start Small and Iterate:** Begin with a few key rules addressing common issues you encounter, and **add to them whenever you notice Cursor making the same mistake twice**. Over-thinking rules initially is unnecessary, as Cursor's models already possess vast knowledge.
2. **Commit Project Rules to Version Control:** For team projects, **commit your `.cursor/rules` folder to Git**. This ensures consistency across the team and enhances the AI's understanding of the repository's style and conventions for all developers.
3. **Be Specific and Concise:** Rules should be focused, actionable, and ideally under 500 lines. The more precise your instructions, the better the AI can deliver.
4. **Prioritize AI Readability:** Organize your rules simply, keeping in mind that the AI needs to process this context efficiently. The goal is to help both engineers and AI tools navigate your codebases effectively.
5. **Provide a Technical Overview:** Include a detailed technical overview of your project in your rules file, describing its purpose, how it works, important files, and core algorithms. This acts as a "constitution" for how the AI should behave.
6. **Combine with Notepads:** Use `.cursor/rules` for "always-on" constraints and Notepads for "sometimes-on" or dynamic context. Notepads can bundle prompts, documentation links, and file references for reusable contexts, but are not currently AI-editable.
7. **Leverage Community Resources:** Explore community-driven collections like `awesome-cursorrules` and `cursor.directory` for pre-built rule sets for popular frameworks.
8. **Regularly Audit:** Rules can become stale as your project evolves. Schedule periodic reviews to remove outdated instructions or links to avoid "context rot" and ensure the AI remains focused.
9. **Use for Agent Mode Directives:** Rules can specify how the AI agent should behave, for example, by outlining a **plan-and-act strategy** where the AI first creates a detailed plan for approval before executing it.

## Resources

- [Awesome Cursor Rules](https://github.com/PatrickJS/awesome-cursorrules)
- [cursor.directory](https://cursor.directory/)
- [Steve's TypeScript rules](https://stevekinney.com/writing/cursor-rules-typescript)
