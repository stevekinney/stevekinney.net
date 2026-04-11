---
title: Structured CLI Output as Pipeline Glue
description: When your scripts need the agent's judgment in a shape they can parse, a JSON schema turns "ask an LLM" into a pipeline step.
modified: 2026-04-10
date: 2026-04-10
---

The MCP lesson taught one direction of the structured-contract idea: you wrap your verification logic in a tool, and the agent calls it. The agent gets a typed result it can reason about. That's your code serving the agent.

This lesson is the other direction. Your _scripts_ call the agent and get typed JSON back. The agent's judgment—"is this failure a flake or a real bug," "does this diff introduce a security issue," "which of these five errors is the root cause"—becomes a pipeline step you can `jq`, branch on, and feed into the next stage. Same thesis as the MCP lesson: structured contracts between code and LLMs. Different direction.

## The mechanics

The primary tool is [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) in print mode with a JSON schema constraint. The invocation looks like this:

```sh
SCHEMA=$(jq -c . schema.json)

claude -p --bare \
  --output-format json \
  --json-schema "$SCHEMA" \
  "Analyze the following test output and classify each failure." \
  < playwright-report/dossier.md
```

A few things to unpack.

`--bare` makes the invocation hermetic. It skips `CLAUDE.md` discovery, local hooks, MCP servers, and auto-memory. When you're running Claude as a pipeline step, you don't want ambient state leaking into the result. The command should produce the same output on your laptop, in CI, and on a teammate's machine.

`--output-format json` tells Claude to return JSON instead of plain text. The outer envelope has metadata about the run, and your structured data lives in the top-level `structured_output` field.

`--json-schema "$SCHEMA"` constrains the response to match your schema. Claude can still use tools and reasoning to get there, but the final output is validated JSON conforming to the shape you defined.

To extract just your data:

```sh
claude -p --bare \
  --output-format json \
  --json-schema "$SCHEMA" \
  "Classify these failures." \
  < dossier.md \
  | jq '.structured_output'
```

That's the whole handshake. You define the shape, Claude fills it, your script reads it.

> [!NOTE] Portability
> [Codex](https://openai.com/index/codex/)'s non-interactive mode uses a file path instead of an inline string: `codex exec --output-schema ./schema.json -o ./result.json "Classify these failures." < dossier.md`. The schema file is the same—one checked-in `schema.json`, two CLIs. Claude reads it via shell variable, Codex reads it via flag. If you're working across model families, the schema is the portable contract.

## The schema is the contract

Here's what I mean by "contract." A schema like this:

```json
{
  "type": "object",
  "properties": {
    "failures": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "test_name": { "type": "string" },
          "root_cause": { "type": "string" },
          "suggested_fix": { "type": "string" },
          "confidence": { "type": "string", "enum": ["high", "medium", "low"] },
          "related_files": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["test_name", "root_cause", "suggested_fix", "confidence"]
      }
    }
  },
  "required": ["failures"]
}
```

That schema is doing the same job as the `outputSchema` in the MCP wrapper lesson's `verify_shelf_page` tool. It cages the LLM's flexibility inside a shape your script can consume. The LLM decides _what_ the root cause is. The schema decides _how_ the answer is shaped. Your downstream script never has to parse free-form text.

Check the schema into the repo alongside the script that uses it. When someone asks "what does the triage step produce?", the answer is `schema.json`.

## Dossier triage

This is the pattern I reach for most. The [failure dossier lesson](failure-dossiers-what-agents-actually-need-from-a-red-build.md) taught you to generate `dossier.md`—a structured markdown summary of every failing test, with error messages, screenshot paths, and reproduction commands. That dossier is already good enough for the agent to read interactively.

But sometimes you want a script to do the reading. Maybe you're triaging ten failures at once and you want them sorted by confidence. Maybe you want to open GitHub issues for the low-confidence ones and hand the high-confidence ones to the agent in a separate, verified step. Maybe it's 2 AM and the nightly run failed and you want a machine-readable summary waiting for you in the morning.

```sh
#!/usr/bin/env bash
set -euo pipefail

SCHEMA=$(jq -c . scripts/triage-schema.json)

claude -p --bare \
  --output-format json \
  --json-schema "$SCHEMA" \
  --append-system-prompt-file prompts/triage-system.md \
  "Triage every failure in this dossier." \
  < playwright-report/dossier.md \
  | jq '.structured_output.failures[] | select(.confidence == "low")' \
  > needs-human-review.json

echo "$(jq length needs-human-review.json) failures flagged for human review"
```

Notice `--append-system-prompt-file`. Since `--bare` skips `CLAUDE.md`, the system prompt file is where your repository-specific context goes: what categories to use, what "confidence" means in your project, which test names are known flakes. It layers on top of Claude's default system prompt rather than replacing it. The user prompt—the dossier itself—comes via stdin. Version-control both files. That's the hermetic equivalent of `CLAUDE.md` for pipeline calls.

The script stops at classification. It does not auto-apply fixes. Model-reported confidence is useful for routing, not for unsupervised code changes. The lesson on [failure dossiers](failure-dossiers-what-agents-actually-need-from-a-red-build.md) gives the agent a reproduction command for each failure—_that's_ where the fix loop happens, one failure at a time, with tests gating each step.

## CI annotation generation

Shorter pattern, big payoff. GitHub Actions supports `::error file=...,line=...::message` annotations that render inline on PR diffs. A structured output step can turn an LLM review into native annotations:

```sh
SCHEMA=$(jq -c . scripts/annotation-schema.json)

claude -p --bare \
  --output-format json \
  --json-schema "$SCHEMA" \
  "Review this diff for correctness issues. Be specific about file and line." \
  < <(git diff HEAD~1) \
  | jq -r '.structured_output.annotations[] | "::\(.level) file=\(.file),line=\(.line)::\(.message)"'
```

Where `annotation-schema.json` enforces `{ annotations: [{ file, line, level, message }] }` with `level` constrained to `"error" | "warning" | "notice"`. The `jq` one-liner formats each finding as a GitHub annotation. Drop this in a CI step and the LLM's review shows up as inline comments on the PR, same as any linter.

This pairs well with the [CI lesson](ci-as-the-loop-of-last-resort.md). The structured schema is what makes the step composable with the rest of the workflow.

## Two more patterns, briefly

**Nightly health checks.** The [nightly verification lesson](nightly-verification-loops.md) teaches scheduled checks that run unattended. Structured output turns their results into machine-readable status reports: `{ status: "healthy" | "degraded" | "broken", checks: [...], action_required: boolean }`. A cron wrapper reads `action_required`, opens a GitHub issue if true, and goes back to sleep. Five lines of `jq`, not a bespoke parser.

**Semantic review gate.** Same shape as the CI annotation pattern, but used as a pre-push hook or CI-only step—not pre-commit. The course's [ten-second rule for pre-commit hooks](git-hooks-with-lefthook.md) rules out networked LLM calls. Pre-push or CI is where the latency budget exists. The schema gives you `{ pass: boolean, issues: [...] }`, the script exits non-zero if `pass` is false, and you've built a semantic lint pass that catches things no AST rule can express.

## When structured output is the wrong tool

Same heuristic as the [MCP lesson](writing-a-custom-mcp-wrapper.md)'s "What to wrap and what to leave alone."

**Wrong tool when:** the task is open-ended generation (not verification), the schema would be more complex than the parser it replaces, the LLM's judgment isn't reliable enough for the domain, or you need sub-second latency. Git hooks that run on every save, editor integrations that need instant feedback—those can't wait for a network round-trip.

**Right tool when:** verification, triage, classification—anywhere you'd otherwise parse free-form text and can tolerate a few seconds of latency. The sweet spot is "I need the LLM's judgment, but I also need the result in a shape my script can branch on."

## The one thing to remember

A JSON schema turns "ask an LLM" into a pipeline step. The schema is the contract: the LLM's flexibility stays inside the shape, your script's need for predictability is satisfied by the shape. Check in the schema, check in the prompt file, run with `--bare`, and the whole thing is hermetic, version-controlled, and composable with every other loop in the stack.

## Additional Reading

- [Writing a Custom MCP Wrapper](writing-a-custom-mcp-wrapper.md)
- [Failure Dossiers: What Agents Actually Need From a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md)
- [Nightly Verification Loops](nightly-verification-loops.md)
