---
title: Plan-Implement-Verify Pattern
description: Structure AI coding tasks using the Plan-Implement-Verify pattern for better results and fewer errors.
modified: 2025-07-29T14:36:07-06:00
---

When you ask AI to write code immediately, it makes assumptions—often wrong ones. The **Plan → Implement → Verify** pattern forces AI to:

1. **Think through requirements** before writing code
2. **Identify dependencies** and potential issues early
3. **Create testable success criteria** upfront
4. **Build incrementally** with verification at each step

## Phase 1: Plan

AI analyzes the request and creates a structured approach:

- Breaks down the task into steps
- Identifies required files and dependencies
- Considers edge cases and error handling
- Defines success criteria

## Phase 2: Implement

AI executes the plan systematically:

- Follows the planned steps in order
- Creates/modifies files as specified
- Implements error handling
- Writes tests alongside code

## Phase 3: Verify

AI confirms the implementation works:

- Runs tests to ensure correctness
- Checks for type errors or linting issues
- Validates against success criteria
- Identifies any remaining issues

## Formatting and an Example

It honestly doesn't matter too much, I typically use Markdown checklists because I am lazy, but you can use YAML too if that makes you happier.

```yaml
Task: Add a health check endpoint to the Express server

Steps:
  1. Create basic Express server setup
     - File: src/server.ts
     - Set up Express app with TypeScript
     - Configure basic middleware

  2. Create health check route
     - File: src/routes/health.ts
     - Implement GET /health endpoint
     - Return status, timestamp, uptime

  3. Add types for response
     - File: src/types/health.ts
     - Define TypeScript interface

  4. Create tests
     - File: tests/health.test.ts
     - Test endpoint returns 200
     - Validate response structure

  5. Update package.json scripts
     - Add dev script
     - Add test script

Success Criteria:
  - GET /health returns 200 status
  - Response includes: status, timestamp, uptime
  - TypeScript compiles without errors
  - Tests pass
```

## What Makes a Good Plan?

- **Specific files:** Names the exact files to create/modify
- **Clear sequence:** Steps build on each other logically
- **Test inclusion:** Tests are part of the plan, not an afterthought
- **Success criteria:** Measurable outcomes defined

Weak plans—on the other hand—have these qualities:

- Vague steps like "implement the feature"
- Missing file locations
- No consideration of testing
- Unclear dependencies between steps
