---
title: Instructions That Wire the Agent In
description: The one rule for instruction files in this workshop—if the agent can't mechanically act on it, it doesn't belong there.
modified: 2026-04-12
date: 2026-04-06
---

> [!NOTE] Lets talk about what _not_ to do.
> Writing a perfect set of instructions is an art in and of itself. Our focus today is what to do when your instructions _aren't_ delivering the results you expect and how to build a system to enforce our preference. That said, it does make sense for us to look at some patterns and anti-patterns so that we're on the same page and we have a shared understanding for _why_ we're doing what we're doing.

If you've used [Claude Code](https://docs.claude.com/en/docs/claude-code/overview), [Cursor](https://cursor.com), or Codex for more than an afternoon, you've written some flavor of instruction file. [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory), `AGENTS.md`—they're all the same idea with different filenames. A markdown file at the root of the repo that the agent reads before it does anything else.

I have written a lot of these, and most of mine were _bad_. Not bad in the "wrong information" sense—bad in the "the agent couldn't actually do anything with what I wrote" sense.

This lesson is the one rule I want you to take home about instruction files. Other courses can teach you the full taxonomy of [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory) patterns. We're going to focus on one thing: **how to use the instruction file to wire the agent into the feedback loop we're going to spend the rest of the day building**.

## The rule

> Anything the agent can't mechanically act on doesn't belong in the instructions file.

That's it. That's the whole rule. If you can't imagine the agent reading a line and doing something specific in the next thirty seconds because of it, the line is taking up space.

## What that excludes

Most of what people write in instruction files, honestly. It turns out that vague instructions don't work for humans or AI agents pretending to be humans.

- **"Write clean code."** Clean by what measure? The agent has no rubric.
- **"Follow best practices."** Whose? Best practices for what stack, what era, what team?
- **"Use good variable names."** This is an aesthetic preference dressed up as a directive.
- **"Be concise."** The agent will be concise for one response and verbose for the next.
- **"Think carefully before making changes."** It's an LLM. It doesn't have a "think more carefully" lever you can pull from a markdown file.

I'm not picking on these because they're _wrong_—they're not wrong, exactly. They're just not actionable. The agent can't tell whether it's followed them. You can't tell whether it's followed them. They're vibes, and vibes don't survive the next session.

The other tell is when you find yourself writing instructions that are really instructions to _yourself_—things you wish you'd remembered. Those belong in a checklist or a code review template, not in the agent's prompt.

## What that includes

The good news is that the rule is generative, not just restrictive. Once you're only writing things the agent can act on, a lot of useful stuff opens up.

Things the agent _can_ act on, mechanically:

- "Run `npm run test` before declaring a task done. If anything fails, read the failure output and fix it before reporting back."
- "Write a failing test before you write the implementation. The first commit on a task should be the test."
- "When a Playwright test fails, read the trace file at `playwright-report/trace.zip` before guessing at a fix."
- "Never use `page.waitForTimeout`. If you're tempted, use `page.waitForResponse` or a `getByRole` with `expect` instead."
- "The `green` state for this codebase means: `npm run typecheck`, `npm run lint`, `npm run knip`, and `npm run test` all exit zero. Don't say a task is done until all four are green."

Notice what these have in common. Every one of them references a specific command, a specific file path, or a specific API. There's nothing to interpret. The agent reads the rule and either complies or doesn't, and you can tell which from the diff.

In Shelf, those concrete rules come straight from real files. The "green means green" commands live in `package.json`, and the stronger rules point at actual places in the tree like `src/lib/components` or `tests/end-to-end/` instead of hand-wavy ideas like "the components folder." If a rule cannot name the command or path it depends on, it is probably still too vague.

## The "what does green mean" anchor

If you only put one thing in your `CLAUDE.md` after this workshop, make it this: **a definition of what 'green' means in this codebase, with the exact commands.**

A version that does the work:

```markdown
# Shelf Starter Instructions

Shelf is the starter repository for the **Self-Testing AI Agents** course. It is a real SvelteKit + TypeScript book application, not a generated scaffold.

## What "done" means

A task is not done until all four exit zero, in this order:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run knip`
4. `npm run test`

Do not report a task complete with any of these failing. If a failure looks unrelated, say so explicitly and link the failing test name in your summary.
```

That block alone catches more bad agent output than any number of "write clean code" directives. It's mechanical. It's checkable. It encodes the loop.

## A non-example, before and after

Here's a real `CLAUDE.md` I would have written two years ago. I'm not proud of it.

```markdown
# Project Guidelines

- Write clean, readable code
- Follow best practices for TypeScript
- Use descriptive variable names
- Add comments where appropriate
- Test your changes
- Consider edge cases
- Be mindful of performance
```

Every one of those bullets is true. Every one of them is also useless to the agent. There is no command to run, no file to open, no rule that fails loudly when broken.

Here is the opening half of the current Shelf `CLAUDE.md`:

```markdown
# Shelf Starter Instructions

Shelf is the starter repository for the **Self-Testing AI Agents** course. It is a real SvelteKit + TypeScript book application, not a generated scaffold.

## What "done" means

A task is not done until all four exit zero, in this order:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run knip`
4. `npm run test`

Do not report a task complete with any of these failing. If a failure looks unrelated, say so explicitly and link the failing test name in your summary.

## Routes

- Public: `/`, `/login`, `/design-system`, `/playground`
- Protected: `/search`, `/shelf`, `/admin` — gate server-side on `locals.user`, never with client guards
- `/playground` is the lab fixture for `lab-locator-challenges`. It ships three intentional a11y violations (div-as-button, icon-only button with no accessible name) that trip svelte-check warnings on every typecheck and build. Do not "fix" them — they are the bad examples the lab targets.
- `/admin` is the protected fixture for `lab-bugbot-on-a-planted-bug`. The planted permission bug lives on branch `planted-bug/admin-feature`; `main`'s admin route is the clean baseline.
- Do not reintroduce `src/routes/demo/` or any generated starter pages
- New routes must match the Shelf product domain (books, shelves, ratings)

## How tests get written

- Write a failing test before the implementation. Commit the test first.
- Unit tests live next to the file under test as `<name>.test.ts` and run with Vitest.
- End-to-end tests live in `tests/end-to-end/` and run with Playwright.
- Test fixtures live in `tests/fixtures/` (including HAR files). Share data there instead of redefining it per spec.

## Playwright locator rules

- `getByRole` first. `getByLabel` or `getByText` second. `data-testid` only when semantics genuinely don't exist.
- Never use raw CSS or XPath selectors in specs.
- Never use `page.waitForTimeout` or `page.waitForLoadState('networkidle')`. Use `expect(locator).toBeVisible()`, `page.waitForResponse`, or `page.waitForRequest`.
- When a Playwright test fails, open `playwright-report/index.html` and its trace before proposing a fix.
```

The rest of the shipped file keeps going with authentication, seeding, HARs, accessibility, failure triage, static analysis, hooks, and "do not" rules. The important thing for this lesson is the pattern: every section names specific commands, paths, APIs, or forbidden edits.

Notice the last rule family in the real file. Instructions files have to keep the agent honest about more than just commands and lint rules — they also have to keep the agent from leaking the scaffolding into the product. An agent that helpfully writes "Loading seeded fixtures..." into a real shelf page is not being clever; it is bleeding the test layer into the product surface. One mechanically-checkable rule prevents that ("do not mention Playwright, seeded fixtures, test IDs, HARs, or course material in rendered page copy") in a way that "keep the UI clean" cannot.

This is the same shape as the other rules in the file. It names a specific class of strings the agent must not produce, and you can spot a violation by reading the diff. It is also exactly the kind of rule the lab in this section will ask you to add to your own `CLAUDE.md`.

Every line in the second version is something the agent can _do_. The first version is a vibe statement. The second version is a loop.

## How this maps to other agents

The same pattern works in [Cursor](https://cursor.com/) (`.cursor/rules/*.mdc`), Codex (`AGENTS.md`), and Copilot (`.github/copilot-instructions.md`). The filenames change, the directory changes, the syntax for nesting and scoping changes. The rule does not. If your rules file is full of adjectives, you're going to have a bad time regardless of which agent is reading it.

We'll come back to instruction files in almost every lesson from here on. The [locator hierarchy](locators-and-the-accessibility-hierarchy.md) ends up as a rule in this file. The [lint config](lint-and-types-as-guardrails.md) ends up as a rule in this file. The [canonical CI command](ci-as-the-loop-of-last-resort.md) ends up as the "what green means" in this file. The instruction file is where the rest of the workshop's loop gets _named_ to the agent.

## Setting Permissions

Permissions are where "please don't touch this" stops being a polite request and becomes an actual boundary. If a file is genuinely off limits, do not hide that rule in prose. Put it in the agent's access model so the read or edit fails before it turns into a diff.

Use permissions for static boundaries:

- secrets the agent should never read
- configuration files the agent should treat as read-only
- generated output the agent should not rewrite by accident

### Claude

Claude Code gives you direct path-scoped permission rules in `.claude/settings.json` or `.claude/settings.local.json`.

If you want Claude to stay out of secrets entirely, deny the relevant `Read(...)` calls:

```json
{
  "permissions": {
    "deny": ["Read(./.env)", "Read(/content/private/**)", "Read(//Users/you/.ssh/**)"]
  }
}
```

If you want Claude to be able to _see_ a file but never rewrite it, deny the write-side tools instead:

```json
{
  "permissions": {
    "deny": [
      "Edit(/eslint.config.js)",
      "Edit(/eslint.config.ts)",
      "Edit(/.eslintrc*)",
      "Write(/src/generated/**)"
    ]
  }
}
```

That second example is the common pattern: make the repo broadly readable, then carve out a few paths that are read-only or completely off limits.

The nuance that matters: Claude's `Read(...)`, `Edit(...)`, and `Write(...)` rules apply to Claude's built-in tools. They do _not_ stop a Bash subprocess from doing `cat .env` or `sed -i eslint.config.js`. If you need OS-level enforcement, pair the rules with sandboxing.

### Codex

Codex's public controls are a little different. The documented sandbox model is workspace-based, not the same per-file denylist grammar Claude exposes. In `workspace-write` mode, the current working directory is writable by default. `writable_roots` _adds_ directories on top of that—it does not replace the workspace root.

That means the tightest setup is: start Codex from the directory you want it to write in.

```bash
codex --cwd /Users/you/project/courses/self-testing-ai-agents
```

Now the workspace root _is_ the lesson directory. Everything outside it is visible but not writable. If you need to add a second writable location (say, a shared `tmp/` directory), use `writable_roots`:

```toml
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
writable_roots = [
  "/Users/you/project/tmp"
]
```

That is the important distinction to understand: Claude lets you say "never read _this file_" directly. Codex's filesystem controls are coarser—you shrink the workspace to shrink the blast radius.

- [Claude Code permissions](https://code.claude.com/docs/en/permissions)
- [Codex config reference](https://developers.openai.com/codex/config-reference)

## Using Hooks for Runtime Policy Checks

Permissions answer **which paths are in bounds**. Hooks answer **given this exact tool call, should we allow it right now**. That is the layer you use when the rule depends on file contents instead of just a pathname.

In this example we want two runtime checks:

1. never let the agent change lint configuration
2. never let the agent edit a file whose contents include the word `autogenerated`

### Claude

Claude can do this directly because `PreToolUse` hooks can intercept `Edit` and `Write` before they run.

Register the hook in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/block-protected-edits.js"
          }
        ]
      }
    ]
  }
}
```

Then implement the policy script:

```js
#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const filePath = input.tool_input?.file_path;

if (!filePath) {
  process.exit(0);
}

const lintRuleFiles = new Set([
  'eslint.config.js',
  'eslint.config.ts',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
]);

function deny(reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

if (lintRuleFiles.has(path.basename(filePath))) {
  deny('Editing lint rules is blocked by policy.');
}

if (fs.existsSync(filePath)) {
  const currentContents = fs.readFileSync(filePath, 'utf8');

  if (/autogenerated/i.test(currentContents)) {
    deny('Files marked as autogenerated must not be edited by the agent.');
  }
}
```

If neither rule matches, the script exits `0` with no output and Claude continues. If either rule matches, the hook returns `permissionDecision: "deny"` and the edit never happens.

> [!NOTE] If you also allow Bash, remember that Bash is a separate path. A shell command can still rewrite files unless you block it with Bash permissions or sandboxing.

### Codex

Codex hooks are currently more limited—and they are experimental. You need to enable them explicitly in `.codex/config.toml` before anything in this section works:

```toml
[features]
codex_hooks = true
```

Or pass the flag at launch: `codex --enable codex_hooks`.

With hooks enabled, `PreToolUse` and `PostToolUse` only intercept `Bash` calls, not built-in `Write` or `Edit`. So the Codex version is a shell tripwire rather than a complete file-access model.

That means the hard boundary should still live in the sandbox and `--cwd`. The hook is the second line of defense: scan what a Bash command changed and stop Codex from continuing if the command touched a protected file.

Register the hook in `.codex/hooks.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/review-protected-shell-edits.py",
            "statusMessage": "Reviewing shell edits for protected files"
          }
        ]
      }
    ]
  }
}
```

Then inspect the changed files after each Bash command:

```python
#!/usr/bin/env python3

import json
import pathlib
import subprocess
import sys

lint_rule_names = {
    'eslint.config.js',
    'eslint.config.ts',
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.json',
}

changed_paths = subprocess.run(
    ['git', 'diff', '--name-only', '--relative'],
    check=True,
    capture_output=True,
    text=True,
).stdout.splitlines()

violations = []

for relative_path in changed_paths:
    candidate = pathlib.Path(relative_path)

    if candidate.name in lint_rule_names:
        violations.append(f'{relative_path} is a lint configuration file')
        continue

    if candidate.is_file():
        try:
            contents = candidate.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue

        if 'autogenerated' in contents.lower():
            violations.append(f'{relative_path} is marked autogenerated')

if not violations:
    sys.exit(0)

print(json.dumps({
    'decision': 'block',
    'reason': 'Protected shell edits detected.',
    'hookSpecificOutput': {
        'hookEventName': 'PostToolUse',
        'additionalContext': (
            'Revert the protected changes and continue without editing those files: '
            + '; '.join(violations)
        )
    }
}))
```

This is not quite the same as Claude. The Bash command has already run by the time `PostToolUse` fires, so the hook cannot undo side effects. When the script outputs `"decision": "block"`, Codex replaces the tool result with your feedback and lets the agent respond to it—it does not roll back the command. What it _can_ do is stop Codex from blithely continuing as if nothing happened. That is often enough to force a revert-and-try-again loop instead of letting the agent wander farther away from policy.

- [Claude Code hooks](https://code.claude.com/docs/en/hooks)
- [Codex hooks](https://developers.openai.com/codex/hooks)

## Additional Reading

- [The Hypothesis](the-hypothesis.md)
- [Lab: Rewrite the Bad CLAUDE.md](lab-rewrite-the-bad-claude-md.md)
