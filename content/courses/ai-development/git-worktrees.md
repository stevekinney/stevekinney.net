---
title: Using Git Worktrees for Parallel AI Development
description: Set up Git worktrees to run multiple Claude Code instances simultaneously for parallel development workflows.
modified: 2025-07-28T07:43:02-06:00
---

[Git Worktree](https://git-scm.com/docs/git-worktree) is a Git feature that allows developers to create multiple working directories from a single Git repository. Each working directory is linked to a specific branch within the repository, enabling concurrent work on different branches or features without constantly switching between them. This feature was introduced with Git version 2.5 and helps streamline workflows, save time, and reduce the risk of accidentally committing changes to the wrong branch.

## Why Use Git Worktrees with Claude Code?

The primary benefit of using Git Worktrees with Claude Code is to **run multiple Claude Code instances simultaneously on different parts of your project**, each focused on its own independent task. This addresses the challenge of working on the same codebase and Git branch, which can lead to conflicts, especially when implementing features that cross multiple files.

- **Parallelization**: You can have one Claude instance refactoring an authentication system while another builds a completely unrelated data visualization component. This allows agents to work at full speed without waiting for each other's changes or dealing with immediate merge conflicts.
- **Isolation**: Each worktree has its own independent file state, preventing Claude instances from interfering with each other.
- **Increased Impact**: By parallelizing the efforts of multiple LLMs, you can get different versions of a feature or codebase, allowing you to select the best one.
- **Efficiency**: It enables you to **continue your own development in one worktree while Claude works on a long-running task in another**.

## Setting Up Git Worktrees with Claude Code

Setting up Git Worktrees for use with Claude Code involves a few steps, ranging from manual creation to advanced automation:

### Manual Creation of a Git Worktree

- First, **create a new branch** for your feature, for example, `git branch feature-name`.
- Then, create a separate directory for your worktree using `git worktree add <path> <branch>`. For instance, `git worktree add ../project-feature-a feature-a` will create a new directory named `project-feature-a` adjacent to your main project folder, containing a complete copy of your codebase on the `feature-a` branch.
- **It is recommended to create a dedicated "worktrees" folder adjacent to your main project folder** to keep things organized and avoid confusing Git with nested repositories or accidental commits of copied codebases.
- Navigate into the newly created worktree directory: `cd ../project-feature-a`.
- To see a list of all current worktrees, use `git worktree list`.
- Once inside the worktree, you can start Claude Code: `claude`.

### Automating Worktree Setup with Claude Code (Limitations and Workarounds)

- You can attempt to create a custom slash command in Claude Code (e.g., in `.claude/commands/create_worktree.md`) to automate the worktree creation process.
- However, Claude Code typically operates within the confines of the main project folder and its subfolders. **It generally does not have the security permissions to move out of the main project folder to create directories elsewhere on your file system**. This means Claude itself cannot `cd` into the newly created worktree folder outside its current scope.
- A more effective approach for full automation is to **use a terminal alias with an external script** (e.g., a ZSH script). This script can perform all the necessary steps, including creating the adjacent worktree folder, creating the Git Worktree, and opening the new worktree in a separate IDE window or terminal tab. You can even have Claude write this script for you.

### Initializing Claude Code in New Worktrees

- When you create a worktree, it copies the entire codebase, including your `.claude/CLAUDE.md` file if it exists in the root.
- It's a good practice to run `/init` in each new worktree session to ensure Claude Code is properly oriented with the codebase within that specific worktree, populating its project-specific `CLAUDE.md` file.

## Using Multiple Claude Code Instances with Worktrees

Once your Git Worktrees are set up, you can leverage them for multi-agent workflows:

1. **Open Each Worktree in Separate Terminal Tabs/IDE Windows**: Create multiple instances of Claude Code by opening each worktree folder in a separate terminal tab or IDE window (e.g., VS Code or Cursor). This allows you to visually differentiate between the working environments.
2. **Start Claude in Each Folder with Different Tasks**: Assign distinct tasks to each Claude instance. For example, one Claude can work on adding a new feature (like "drums" to a music app), while another adds a different one (like "bases"), all in parallel without immediate file conflicts.
3. **Cycle Through to Check Progress**: Regularly check the progress of each Claude instance and approve or deny any permission requests.
4. **Track Work**: You can use a `tasks.md` file to track what each branch is working on, with a "main" branch's Claude Code instance handling merges and overall planning/testing.
5. **Merge Changes**: When work is completed on a worktree branch, you can merge it back into the main branch, just like you would with a regular Git branch. However, be mindful that eventually, these outputs must be integrated, which can lead to complex logical conflicts or difficult Git merges that may require human intervention.

## Best Practices and Tips

To maximize the effectiveness of Git Worktrees with Claude Code:

- **Organized Directory Structure**: Use consistent naming conventions for your worktree directories (e.g., `project-feature-a`) to easily identify the associated task or branch.
- **Limit Active Worktrees**: Create worktrees only for active tasks and remove them once a branch or job is complete to prevent clutter.
- **Routine Maintenance**: Regularly use `git worktree prune` to clean up metadata from old or deleted worktrees and ensure each worktree stays updated with the latest changes from the main repository to prevent conflicts.
- **Commit Often**: Frequently commit changes within each worktree to safeguard against data loss and maintain a granular version history.
- **CLAUDE.md for Project Context**: Utilize the `CLAUDE.md` file in each worktree to provide persistent, project-specific context, coding standards, and workflows. This file is automatically read by Claude at the start of every session. You can even link to other relevant markdown files within `CLAUDE.md` using the `@` syntax to manage large amounts of documentation without overloading the main file.
- **Leverage Headless Mode**: For automation and scripting, use Claude Code in headless mode with the `-p` flag (`claude -p`).
- **Notifications**: Set up notifications (e.g., using iTerm2 on Mac) to be alerted when Claude needs attention or completes a long-running task.
- **Plan Before Coding**: Encourage Claude to first explore the codebase, then create a detailed step-by-step plan, and only then proceed with coding. This "Explore, Plan, Code, Commit" workflow is a foundational best practice. For complex problems, explicitly asking Claude to "think hard" can encourage deeper consideration.
- **Role Specialization**: For multi-agent systems, design agents with narrow, well-defined roles (e.g., Architect, Builder, Validator, Scribe) and use shared planning documents for coordination.

## Challenges to Be Aware Of

While powerful, Git Worktrees can present some challenges:

- **Learning Curve**: They can be complex for those new to Git, requiring a steeper learning curve.
- **Management Overhead**: With multiple active worktrees, it's easy to confuse them, potentially leading to changes in the wrong directory or branch. They also require regular maintenance to prune old ones.
- **Syncing Issues**: There's an increased risk of worktrees becoming outdated if not regularly updated from the main repository, which can lead to merge conflicts or redundant work. While worktrees minimize _overlaps_, integration and merging outputs can still lead to complex logical conflicts.
- **Tooling Compatibility**: Not all development tools or Git GUIs are fully optimized for Git Worktrees, which might cause inconsistencies.
- **Resource Consumption**: Running a large number of Claude Code instances, even with worktrees, can be resource-intensive in terms of CPU, memory, and API costs.
