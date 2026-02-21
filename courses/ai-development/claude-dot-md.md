---
title: CLAUDE.md
description: >-
  Create and maintain CLAUDE.md files as persistent project memory and
  authoritative system rules for consistent AI behavior
modified: '2025-07-29T15:09:56-06:00'
date: '2025-07-29T15:09:56-06:00'
---

`CLAUDE.md` files are fundamental to Claude Code's operation and are treated as **authoritative system rules** that define operational boundaries, taking precedence over user prompts.

- **Automatic Loading**: Claude Code automatically loads the contents of `CLAUDE.md` files into its context at the start of every session within a given directory. This provides Claude with immediate project context and helps it remember information across different chat sessions.
- **Hierarchical Memory System**: Claude recursively looks for `CLAUDE.md` files in multiple locations, merging their contexts. This layered approach allows for granular control and shared settings:
  - **User Memory (`~/.claude/CLAUDE.md`)**: Located in your home directory, its contents are loaded for _all_ your projects, ideal for personal preferences, coding styles, or custom tool shortcuts you use everywhere.
  - **Project Memory (`./CLAUDE.md`)**: Placed in the root of your project, this is the most common location. It should be checked into Git to share project-specific instructions, commands, and style guides with your entire team.
  - **Parent/Child Directory Memory**: Claude can load `CLAUDE.md` files from parent directories (useful for monorepos) and also discovers them in subdirectories on demand when interacting with files within those subtrees.
  - **Local Overrides (`CLAUDE.local.md`)**: This file, usually `.gitignore`'d, allowed for personal project-specific preferences not committed to source control. It has been deprecated in favor of using imports, which work better across multiple Git worktrees.
- **Contextual Persistence**: `CLAUDE.md` ensures context is maintained throughout the session, leading to consistent execution of process steps. It helps prevent "instruction bleed" and reduces context pollution by controlling file access.

## Purpose and Content of `CLAUDE.md`

Think of `CLAUDE.md` as the **central source of truth** and a dynamic task board for your AI team. It helps Claude align with the overall project vision and provides persistent memory across sessions.

You should use `CLAUDE.md` to document:

- **Project Architecture and Overview**: High-level descriptions of your project's structure, key components, and what it does.
- **Coding Standards and Style Guidelines**: Explicitly state conventions like indentation, naming, use of ES modules, or type annotations.
- **Common Commands**: List frequently used build, test, and lint commands, or even developer environment setup commands (e.g., `npm run build`, `npm run typecheck`, `go install`).
- **Project Workflows**: Detail processes like Git branching strategies, testing strategies, or how to handle specific issues.
- **Known Pitfalls and Warnings**: Document any unexpected behaviors, limitations, or specific instructions Claude should be aware of (e.g., "always check documentation for breaking changes").
- **AI Behavior Rules**: Include specific instructions on how Claude should behave, such as error handling, API conventions, or problem-solving approaches.
- **Architectural Decision Records (ADRs)**: Keep track of important technical decisions and their rationale.

## Best Practices, Tips, and Tricks for `CLAUDE.md`

1. **Start with `/init`**: When beginning a new project, run the `/init` command in your project root. This command analyzes your codebase and automatically generates a foundational `CLAUDE.md` file with a high-level summary of your project. It's recommended to commit this generated file to version control.
2. **Be Concise and Structured**: Use Markdown headings and bullet points to keep the file organized and readable. Be explicit and detailed in your instructions, avoiding vague requests.
3. **Refine Constantly**: Treat your `CLAUDE.md` as a living document and a frequently used prompt that you constantly refine. Experiment to determine what produces the best instruction following from the model.
4. **Tune Instructions**: Add emphasis (e.g., "IMPORTANT," "YOU MUST") to improve Claude's adherence to critical instructions.
5. **Use `#` for Quick Additions**: The fastest way to add a memory during a session is by starting your input with the `#` character. Claude will then prompt you to select which memory file (`CLAUDE.md` or `CLAUDE.local.md`) to store it in.
6. **Edit Directly with `/memory`**: For more extensive additions or organization, use the `/memory` slash command to open the `CLAUDE.md` file in your default editor.
7. **Modularize with `@` Imports**: For larger documents or to include specific information only when relevant, use the `@path/to/file.md` syntax to import other Markdown files into your `CLAUDE.md`. This keeps your main `CLAUDE.md` clean and prevents overloading Claude's context window with unnecessary information, saving tokens.
8. **Distinguish Between "Nouns" and "Verbs"**: A good rule of thumb is to use `CLAUDE.md` for "nouns" (where and what things are: project overview, architecture, coding standards) and slash commands for "verbs" (how to do things: specific tasks, workflows). `CLAUDE.md` provides the consistent baseline, while slash commands handle specific tasks within that context.
9. **Periodically Review and Update**: If Claude repeatedly asks for certain information or makes wrong assumptions, add that clarification to `CLAUDE.md` so it's pre-loaded next time. Claude can even assist with its own maintenance, for example, by updating `CLAUDE.md` to note new library usage.

## Examples and Non-Examples

### Decision Records

Document the "why" behind technical choices:

```markdown
## Architectural Decision Records

### ADR-001: Chose PostgreSQL over MongoDB

**Date:** 2024-01-15  
**Status:** Accepted
**Context:** Need ACID compliance for financial transactions
**Decision:** PostgreSQL with JSONB for flexible schemas
**Consequences:** Stronger consistency, slightly more complex queries

### ADR-002: Implemented Soft Deletes

**Date:** 2024-02-01  
**Status:** Accepted
**Context:** Legal requirement to retain data for 7 years
**Decision:** All tables have `deleted_at` timestamp
**Consequences:** All queries must filter by `deleted_at IS NULL`
```

### Performance Notes

Help AI write efficient code:

```markdown
## Performance Considerations

### Database Queries

- **N+1 Prevention:** Always use Prisma's `include` for relations
- **Pagination:** Use cursor-based pagination for large datasets
- **Indexes:** See `prisma/indexes.sql` for custom indexes

### Frontend Optimization

- **Bundle Splitting:** Dynamic imports for routes and heavy components
- **Image Loading:** Use next/image with explicit dimensions
- **State Updates:** Batch React state updates in event handlers
- **Memoization:** useMemo for expensive computations > 1ms

### Caching Strategy

- **Redis:** User sessions (24h), API responses (5 min)
- **CDN:** Static assets, immutable with hash names
- **Browser:** API calls with Cache-Control headers
- **React Query:** 5 minute stale time, 10 minute cache time
```

### Troubleshooting Guide

Help your AI companion diagnose common issues:

```markdown
## Common Issues and Solutions

### "Cannot connect to database"

1. Check Docker is running: `docker ps`
2. Verify `.env` has correct DATABASE_URL
3. Run migrations: `pnpm db:migrate`

### "TypeScript errors after pulling"

1. Clean install: `rm -rf node_modules pnpm-lock.yaml && pnpm install`
2. Clear TS cache: `pnpm typecheck --force`

### "Tests failing locally but not in CI"

1. Reset test database: `pnpm db:test:reset`
2. Check timezone: Tests assume UTC
3. Clear test cache: `pnpm test --clearCache`
```

## Keep CLAUDE.md Living

### Update Triggers

Create a checklist for when to update CLAUDE.md:

```markdown
## Maintenance Guidelines

Update this file when:

- [ ] Adding new major dependencies
- [ ] Changing architectural patterns
- [ ] Modifying directory structure
- [ ] Adding new environment variables
- [ ] Changing API response formats
- [ ] Implementing new testing patterns
- [ ] Discovering performance bottlenecks
- [ ] Making security changes
```

### Version Your Context

Track major changes:

```markdown
## Recent Changes

### 2024-01-20

- Migrated from REST to tRPC for type safety
- Added Redis caching layer
- Implemented event sourcing for audit logs

### 2024-01-15

- Switched from CSS Modules to Tailwind CSS
- Added Playwright for E2E testing
- Implemented feature flags system
```

### Link to Deep Dives

Reference detailed documentation:

```markdown
## Additional Resources

- **Architecture Diagrams:** `/docs/architecture/`
- **API Documentation:** `/docs/api/` (OpenAPI spec)
- **Database Schema:** `/prisma/schema.prisma`
- **Component Storybook:** Run `pnpm storybook`
- **Performance Metrics:** `/docs/performance/benchmarks.md`
```

## Test Your `CLAUDE.md`

### Verify Claude Reads It

```bash
# Ensure you're in project directory
cd ~/code/my-sandbox

# Ask Claude to summarize the project
claude explain "What is this project's architecture?"
```

Claude should reference specific details from your CLAUDE.md file.

### Test Contextual Understanding

Try increasingly specific prompts:

```bash
# Generic request
claude plan "Add user authentication"

# Should use your specific auth patterns, not generic solutions
```

### Measure Improvement

Compare AI responses before and after CLAUDE.md improvements:

1. Save current CLAUDE.md: `cp CLAUDE.md CLAUDE.md.backup`
2. Try a complex request and save the response
3. Enhance CLAUDE.md with more detail
4. Try the same request and compare quality

## Common Pitfalls and Solutions

### Pitfall 1: Too Generic

This maybe seems nice, but it doesn't really give Claude any context.

```markdown
This project uses modern web technologies.
```

Instead, we want to be _really_ specific.

```markdown
Frontend: Next.js 14.1.0 with App Router, TypeScript 5.3.3
State: Zustand 4.4.7 for client, TanStack Query 5.17.9 for server
```

### Pitfall 2: Outdated Information

Add update reminders:

```markdown
<!-- Last verified: 2024-01-20 -->

## Dependencies
```

### Pitfall 3: Missing Context

Instead of this:

```markdown
Run tests with `pnpm test`
```

Be as specific as possible:

```markdown
Run tests with `pnpm test`

- Unit tests use Vitest with React Testing Library
- Integration tests require Docker running
- E2E tests need `pnpm dev` running on port 3000
```

### Pitfall 4: No Examples

Always include code examples for patterns you want AI to follow.

## Pro Tips

### Use Markdown Features

- Code blocks with syntax highlighting
- Tables for structured data
- Collapsible sections for details
- Links to relevant files

### Be Explicit About Preferences

```markdown
**ALWAYS** use named exports, NEVER default exports
**ALWAYS** handle errors with Result<T, E> pattern
**NEVER** use try/catch in components
```

### Include Anti-Patterns

```markdown
## What NOT to Do

- Don't access database directly from components
- Don't store sensitive data in localStorage
- Don't use index as React key in dynamic lists
```

### Add Quick Reference

```markdown
## Quick Commands

- Start dev: `pnpm dev`
- Run specific app: `pnpm dev --filter=web`
- Database GUI: `pnpm db:studio`
- Check types: `pnpm typecheck`
- Update snapshots: `pnpm test -u`
```
