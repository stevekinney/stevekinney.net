---
title: 'Skills, Rules, and Hooks: Which Layer Should Fix It'
description: Claude Code gives you three ways to steer the agent — rules, skills, and hooks. They solve different problems, and picking the wrong one wastes effort. Here's when to reach for each.
modified: 2026-04-14
date: 2026-04-14
---

By this point you know what a good `CLAUDE.md` looks like. That file is one of three layers Claude Code gives you to shape how the agent behaves. The other two are **skills** and **hooks**, and the most common mistake I see is picking the wrong layer for the problem.

Before the next lesson drops you into Git hooks, let's get the taxonomy right. All three layers can point at the same outcome. The question is who pulls the trigger: the agent itself (rule), the agent when it recognizes a cue (skill), or the system (hook).

## The three layers at a glance

| Layer  | Format                           | Enforcement | When it runs              | Best for                                                 |
| ------ | -------------------------------- | ----------- | ------------------------- | -------------------------------------------------------- |
| Rules  | Markdown (`CLAUDE.md`, memory)   | Advisory    | Session start             | Conventions the agent follows by default                 |
| Skills | `.claude/skills/<name>/SKILL.md` | On demand   | When the agent invokes it | Named, multi-step workflows worth packaging              |
| Hooks  | `.claude/settings.json` + script | Enforced    | Every matching tool call  | Hard boundaries and automatic context on specific events |

## Rules: "Read this before you act"

`CLAUDE.md` is the flagship. Anything you put in it becomes part of the conversation context before the agent does anything else. We covered what separates a useful rule from a useless one in the [instructions lesson](instructions-that-wire-the-agent-in.md): every line has to be something the agent can mechanically act on.

Trade-offs:

- _Cheap to write._ You can add a line in thirty seconds.
- _Zero enforcement._ The agent can skim, forget, or reinterpret.
- _Compounds with length._ The longer the file gets, the less reliably each rule is followed.

Use rules when the behavior is frequent, easy to describe, and you trust the agent to comply most of the time. Most conventions belong here. Skip rules when compliance has to be 100% — a security boundary, a branded commit requirement, a file that must not be edited. Promote those to a hook.

## Skills: "Here is a packaged workflow"

Skills live as named directories under `.claude/skills/<name>/`, each with a `SKILL.md` file plus optional scripts and documentation. The agent (or a user typing `/skill-name`) invokes the skill when the context matches.

The minimum viable skill is a markdown file with frontmatter:

```markdown
---
name: triage-failing-test
description: Invoke when a Playwright test fails. Classify the flake into one of four buckets and propose the matching fix.
---

Run `npm run dossier`. Read `playwright-report/dossier.md`.

For each failing test, classify the failure into one bucket:

1. **Timing race** — fix with `page.waitForResponse`, never by bumping timeouts.
2. **Shared state leak** — fix with a fixture teardown, not `beforeEach` discipline.
3. **Locator ambiguity** — fix with a region-scoped locator.
4. **Config / auth mismatch** — fix the project, storage state, or `dependencies: ['setup']`.

Name the bucket, cite the line, and propose the minimal fix.
```

Trade-offs:

- _Packageable._ Reusable across projects, shareable, versionable.
- _Invocation depends on context._ If the agent does not recognize when to reach for the skill, it sits in the directory untouched.
- _Bigger authoring surface._ You are writing a small prompt, not a bullet.

Use skills when a task recurs, has distinct steps, and benefits from a dedicated prompt. The dossier-reading loop, the trace triage procedure, and the "verify the shelf page" probe are all good skill candidates. Skip skills when the workflow is a one-off, or when you genuinely need the agent to run it _every_ time — that's a hook.

## Hooks: "The system will enforce this"

Hooks register against tool calls. The previous lesson covered the mechanics (`PreToolUse`, `PostToolUseFailure`, `$CLAUDE_PROJECT_DIR`, the JSON contract). The short version: a hook is a JSON registration plus an executable script that runs before or after a tool call and can deny it, allow it, or inject context.

Trade-offs:

- _Deterministic._ The agent cannot skip a hook.
- _Operational cost._ Breaking one breaks the agent loop. Too aggressive and you create tickets for yourself.
- _Runs every time._ If the check is slow, the agent loop is slow.

Use hooks when bypass would be expensive, or when you want the agent to _always_ receive certain context on a specific event. Blocking `--no-verify`, denying edits to `eslint.config.js`, and auto-attaching the failure dossier after a test run are all natural hook use cases. Skip hooks when a rule plus a lint rule would do the same job — the static layer you build later in the course is often the right answer, and hooks are the next level up from that.

## A concrete comparison

Let's take one scenario — _the agent should consult the failure dossier when a Playwright test fails_ — and show all three layers solving it.

### As a rule

```markdown
## When a test fails

- Run `npm run dossier` first. Read `playwright-report/dossier.md` before proposing a fix.
- Do not modify the assertion to make the test pass.
```

Easy to write. Works most of the time. Fails when the agent tries the "obvious" fix first and reaches for the dossier only after the second or third try.

### As a skill

`.claude/skills/test-failure-dossier/SKILL.md`:

```markdown
---
name: test-failure-dossier
description: Invoke after a Playwright test fails. Produces a structured dossier and names likely root causes.
---

Run `npm run dossier`. Read `playwright-report/dossier.md`. For each failing test, output:

- the failing assertion,
- the most recent non-test file in the stack,
- the three most likely root causes with file paths,
- the bucket from the flaky-triage framework (timing, state, locator, or config).
```

The agent now has a named entry point. When it sees "Playwright test failed," the skill is a reasonable next step and the steps are encoded once. Better than a rule because the workflow is packaged. Still depends on the agent recognizing the cue and reaching for it.

### As a hook

`.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUseFailure": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/dossier-on-failure.mjs\""
          }
        ]
      }
    ]
  }
}
```

And `.claude/hooks/dossier-on-failure.mjs`:

```js
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';

if (!/playwright|npm run test|pnpm test/.test(command)) {
  process.exit(0);
}

try {
  execSync('npm run dossier', { stdio: 'ignore' });
} catch {
  // Dossier generation is best-effort; fall through and let the agent see
  // whatever the test runner already produced.
}

if (fs.existsSync('playwright-report/dossier.md')) {
  const dossier = fs.readFileSync('playwright-report/dossier.md', 'utf8');
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUseFailure',
        additionalContext: dossier.slice(0, 8000),
      },
    }),
  );
}

process.exit(0);
```

Fires every time a Playwright run fails. The dossier lands in the agent's next turn whether the agent asked for it or not. No forgetting, no "I'll check the trace later."

Notice that none of the three versions replaces the others. The hook guarantees the context shows up. The skill gives the agent (or you) a named entry point for manual invocation when the hook did not fire — say, a local reproduction you ran outside the tool call path. The rule provides the fallback language when neither is available, and it's the thing a teammate reads when they want to understand the loop without digging through `.claude/`. I use all three at once more often than I use any one alone.

## How to choose

My heuristic, in order:

1. **If lint, types, or tests can enforce it, do that.** The static layer is the cheapest enforcement and it catches humans and agents equally. Everything in the [Lint and Types as Guardrails](lint-and-types-as-guardrails.md) lesson wins before any agent-specific control.
2. **If the behavior has to fire every time, use a hook.** Cost of bypass determines how aggressive it should be.
3. **If the behavior is a recurring multi-step workflow, write a skill.** Skills earn their weight when invoked more than twice a week.
4. **Otherwise, write a rule.** Expect compliance to decay over time. Revisit the file quarterly.

## Where this course leans on each layer

Now that you have the taxonomy, here's a map of where each layer already shows up in the workshop — and where I would reach for a different layer if I were starting over.

- **Rules — heavily used, appropriately.** The [rewrite lab](lab-rewrite-the-bad-claude-md.md) is entirely about the rules layer. The locator hierarchy, the "what done means" list, the "never use `--no-verify`" ban, and the "user-facing copy stays about books" rule all live in `CLAUDE.md`. That is the right home for each of them.

- **Hooks — used where bypass is expensive.** The [next lesson](git-hooks-with-lefthook.md) wires the Claude Code `PreToolUse` hook that blocks `--no-verify`, and [Making It Hard to Cheat the Guardrails](making-it-hard-to-cheat-the-guardrails.md) extends that pattern to `HUSKY=0` and `LEFTHOOK=0`. The [visual regression lesson](visual-regression-as-a-feedback-loop.md) uses a `PostToolUseFailure` hook to surface screenshot diffs automatically. These are all cases where "the agent might forget" would be expensive.

- **Skills — the current gap.** This is the layer the course leans on least, and it's the one I'd invest in next. Three concrete candidates:
  - **`/dossier`** — the dossier-reading loop in [Failure Dossiers](failure-dossiers-what-agents-actually-need-from-a-red-build.md) is currently documented as a CLAUDE.md procedure and a script. A named skill makes it invocable by any agent reading the skills directory and carries the "read the trace before proposing a fix" rule with it.
  - **`/triage-flake`** — the four-bucket framework in [Flaky-Test Triage](flaky-test-triage.md) is structured enough that the agent benefits from a dedicated prompt. A skill encodes the classification step and the "never bump retries" rule together.
  - **`/verify-shelf`** — the custom MCP from [Writing a Custom MCP Wrapper](writing-a-custom-mcp-wrapper.md) is a real tool, but the prompt scaffolding around _when_ to call it ("after any change to `/shelf/*`, run this and read the JSON") is currently prose. A skill makes the trigger conditions explicit.

If you only remember one line from this lesson: **rules are advisory, skills are packaged, hooks are enforced**. Pick the layer whose enforcement shape matches the cost of bypass. The rest of the workshop will keep showing you the pattern in practice.

## Additional Reading

- [Instructions That Wire the Agent In](instructions-that-wire-the-agent-in.md)
- [Git Hooks with Lefthook](git-hooks-with-lefthook.md)
- [Making It Hard to Cheat the Guardrails](making-it-hard-to-cheat-the-guardrails.md)
- [Writing a Custom MCP Wrapper](writing-a-custom-mcp-wrapper.md)
