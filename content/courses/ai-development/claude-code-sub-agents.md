---
title: Claude Code Sub-Agents
description: Create and manage specialized sub-agents for parallel task execution, code review, debugging, and multi-agent development workflows
modified: 2025-07-28T07:24:16-06:00
---

The primary goal of using sub agents is to parallelize work and leverage specialized expertise, leading to increased efficiency, precision, and throughput in complex development workflows.

Key benefits include:

- **Accelerated Development**: Sub agents allow for efficient task division, such as debugging, testing, and documentation. By executing tasks in parallel, they can make certain workflows significantly faster.
- **Specialized Expertise**: Sub agents can be fine-tuned with detailed instructions and specific roles (e.g., `code-reviewer`, `debugger`), leading to higher success rates on designated tasks and allowing multiple expert perspectives to analyze problems.
- **Context Preservation**: Each sub agent operates in its own isolated context, preventing pollution of the main conversation. This keeps the main thread focused on high-level objectives, reduces context-switching overhead, and can lead to more efficient token usage.
- **Enhanced Quality Assurance**: Using a separate "Validator" sub agent in a clean context to scrutinize the output of a "Builder" agent creates a built-in, unbiased peer review loop, improving code quality and catching issues early.
- **Reusability and Consistency**: Once created, sub agents can be saved, reused across different projects, and shared with a team, ensuring consistent workflows.
- **Flexible Permissions**: Each sub agent can be granted access to a specific set of tools, allowing you to limit powerful or sensitive tools to only the agents that require them for their designated function.
- **Scalability**: Sub agents enable the system to handle large-scale, complex projects by breaking down massive tasks into smaller, manageable components that can be executed concurrently.

## Some High-Level Advice

I should probably put this in a slide, but here it is for now so I don't forget to say it out loud:

1. **Start Simple**: Begin with 3-4 core agents, add more as needed
2. **Clear Boundaries**: Each agent should have a distinct, non-overlapping role
3. **Structured Output**: Define expected output formats for easy handoffs
4. **Iterative Refinement**: Adjust system prompts based on results
5. **Context Preservation**: Pass relevant context between agents

## How to Create and Manage Sub Agents

Sub agents are stored as Markdown files and can be managed through a command-line interface or by editing the files directly.

### Using the `/agents` Command

The `/agents` command provides a comprehensive, interactive interface for all sub agent management tasks.

```ts
/agents
```

This opens a menu where you can:

- View all available sub agents (built-in, user, and project-level).
- Create new sub agents with a guided setup.
- Edit existing custom sub agents, including their prompts and tool access.
- Delete custom sub agents.
- Easily manage tool permissions with a complete list of available tools.

### Sub Agent Configuration

Sub agents are defined in Markdown files with YAML frontmatter, stored in one of two locations:

| Type        | Location            | Scope                                 | Priority |
| ----------- | ------------------- | ------------------------------------- | -------- |
| **Project** | `.claude/agents/`   | Available only in the current project | Highest  |
| **User**    | `~/.claude/agents/` | Available across all your projects    | Lower    |

When a project-level and user-level sub agent have the same name, the project-level agent takes precedence.

#### File Format

Each sub agent is defined in a `.md` file with the following structure:

Markdown

```ts
---
name: your-sub-agent-name
description: A clear description of when this sub agent should be used.
tools: tool1, tool2 # Optional - inherits all tools from the main agent if omitted.
---

Your sub agent's system prompt goes here.

This section should clearly define the sub agent's role, capabilities, personality, and approach to solving problems. Include specific instructions, best practices, and any constraints the sub agent should follow.
```

| Field         | Required | Description                                                                                                                                                 |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | Yes      | A unique identifier for the agent, using lowercase letters and hyphens.                                                                                     |
| `description` | Yes      | A natural language description of the agent's purpose, used by Claude for automatic delegation.                                                             |
| `tools`       | No       | A comma-separated list of specific tools the agent can use. If omitted, it inherits all tools from the main agent, including any connected via MCP servers. |

## How to Use Sub Agents

### Automatic Delegation

Claude Code can proactively delegate tasks to the most appropriate sub agent based on the `description` field in its configuration file. To encourage this, use action-oriented phrases in the description, such as "Use proactively to run tests and fix failures."

### Explicit Invocation

You can directly instruct Claude to use a specific sub agent or to parallelize a task.

- **By Name**: Mention the agent in your prompt.

  ```ts
  > Use the code-reviewer sub agent to check my recent changes.
  ```

- **By Task**: Instruct Claude to use multiple agents for a general task.

  ```ts
  > Use 5 agents in parallel to analyze this codebase for duplicates, complexity, and dead code.
  ```

## Multi-Agent Workflows and Coordination

For complex projects, structuring agent collaboration is key. This often involves mirroring real-world agile teams.

- **Defining Distinct Roles**: Assign specialized roles to each agent. Common roles include:
  - **Architect/Planner**: Performs high-level system analysis and design (often uses a powerful model like Claude Opus).
  - **Builder/Developer**: Translates plans into functional code (can use a cost-effective model like Claude Sonnet).
  - **Validator/Tester**: Scrutinizes the Builder's output, runs tests, and reviews for quality.
  - **Scribe/Documenter**: Maintains project documentation like `README` files.
- **Shared Communication Files**: Agents can coordinate through shared planning documents like `PLAN.md` or `ISSUE.md`. These files act as a central source of truth and persistent memory for the agent team.
- **Git Worktrees for Isolation**: To prevent conflicts when running multiple agents on the same codebase, using **Git worktrees is highly recommended**. This allows each agent to work in its own isolated branch without interference.
- **Chaining Sub Agents**: For multi-step workflows, you can instruct agents to execute in sequence.

```markdown
> First use the code-analyzer to find performance issues, then use the optimizer to fix them.
```

## Best Practices and Tips

- **Start with Claude-Generated Agents**: Use the `/agents` command to have Claude generate an initial sub agent configuration. Then, customize the prompt and settings to fit your exact needs.
- **Plan Diligently**: For complex tasks, always start with a detailed plan. Instruct the main agent _not to write code yet_ and use "Plan Mode" (Shift+Tab) to focus its efforts on creating a roadmap.
- **Write Detailed Prompts**: Include specific instructions, examples, and constraints in your sub agent system prompts. The more guidance you provide, the better the agent will perform.
- **Limit Tool Access**: For security and focus, only grant the tools that are necessary for the sub agent's purpose.
- **Version Control Sub Agents**: Check your project-level agents (`.claude/agents/`) into Git so your team can benefit from and improve them collaboratively.
- **Leverage `CLAUDE.md`**: This special file is automatically read by Claude and serves as a persistent, project-specific memory for coding standards, architecture, and key workflows.
- **Frequent Context Clearing**: Use the `/clear` command frequently to wipe the current chat conversation (short-term memory) and start fresh, especially when switching between unrelated tasks.
- **Commit Often**: Regularly commit changes with Git. This creates checkpoints to revert to if an agent goes off track and provides a clear history of the agent's work.
- **Utilize Hooks and MCP Servers**: Integrate Claude Code with external tools, APIs, and real-time documentation using Model Context Protocol (MCP) servers. Use Claude Code Hooks to execute custom scripts at key lifecycle events (e.g., `PreToolUse`, `PostToolUse`, `SubagentStop`) to enforce standards or automate testing.
- **Debug Systematically**: Use `/debug` for verbose output on Claude's thought process, `/doctor` to check your installation's health, and `/hooks` to confirm loaded hook configurations.

## Example Sub Agents

### Code Reviewer

```markdown
---
name: code-reviewer
description: Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code.
tools: Read, Grep, Glob, Bash
---

You are a senior code reviewer ensuring high standards of code quality and security.

When invoked:

1. Run git diff to see recent changes.
2. Focus on modified files.
3. Begin review immediately.

Review checklist:

- Code is simple and readable
- No duplicated code
- Proper error handling
- No exposed secrets or API keys
- Good test coverage

Provide feedback organized by priority: Critical, Warning, and Suggestion. Include specific examples of how to fix issues.
```

### Debugger

```markdown
---
name: debugger
description: Debugging specialist for errors, test failures, and unexpected behavior. Use proactively when encountering any issues.
tools: Read, Edit, Bash, Grep, Glob
---

You are an expert debugger specializing in root cause analysis.

When invoked:

1. Capture error message and stack trace.
2. Identify reproduction steps.
3. Isolate the failure location and implement a minimal fix.
4. Verify the solution works.

For each issue, provide a root cause explanation, evidence, the specific code fix, and prevention recommendations. Focus on fixing the underlying issue, not just symptoms.
```
