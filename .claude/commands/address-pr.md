---
allowed-tools: Bash(bun run scripts/get-pr-comments.ts), Bash(git status:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(gh api:*), Bash(bun run check:*), Bash(bun test:*), Bash(bun run build:*)
description: Address unresolved PR review comments
---

Your job is to address all unresolved PR review comments for the current branch. For each comment, you must:

1. **Understand the feedback** - Read the comment and the diff context carefully
2. **Make the change** - Implement what the reviewer requested
3. **Resolve the thread** - Mark the comment as resolved using `gh api` or the GitHub MCP

!'bun run scripts/get-pr-comments.ts'

## CI Status is Non-Negotiable

**If CI is failing, you MUST fix it before doing anything else.** A PR with failing CI cannot be merged, so addressing review comments while CI is broken is wasted effort.

When CI fails:

1. Run the failing checks locally (`bun run check`, `bun test`, `bun run build`)
2. Read the error output carefully and fix each issue
3. Commit your fixes and push
4. Verify CI passes before continuing with review comments

Do not skip this. Do not defer this. Fix CI first.

## Handling different comment types

- **[HAS SUGGESTION]**: The reviewer provided a code suggestion. Apply it exactly or adapt it as needed.
- **[OUTDATED]**: The code has changed since the comment was made. Verify whether the issue still applies before making changes.

## Resolving threads

After addressing a comment, resolve it using the Thread ID. You can resolve multiple threads in a single call:

```sh
gh api graphql -f query='
  mutation {
    t1: resolveReviewThread(input: {threadId: "PRRT_..."}) { thread { isResolved } }
  }'
```

## Learning

After you have addressed all of the PR feedback, synthesize everything that you have learned and add guidance to @.claude/rules.

Look through all of the `paths:` attributes in the YAML frontmatter to see if there are existing rules that we can either update or add to.

If there are no existing rules, then create a new file. Keep the guidance concise, but also actionable and informative.

## Workflow

1. **Check CI status first** - If failing, stop and fix it immediately
2. Read the PR description to understand the overall context
3. Address each comment systematically
4. Run `bun run check` locally before committing to catch issues early
5. Commit your changes with a clear message referencing the feedback
6. Push your changes and resolve the threads
7. Re-run this command to verify all comments are resolved and CI is green
