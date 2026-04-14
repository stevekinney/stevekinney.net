---
title: Review Portability Beyond Bugbot
description: Bugbot is the example, not the law. This appendix translates the second-opinion loop into portable review primitives you can carry to other tools.
modified: 2026-04-14
date: 2026-04-06
---

I like Bugbot. I also do not want your review loop to collapse the minute your team uses a different tool.

That is the point of this appendix.

The names change. The underlying loop does not. [Cursor Bugbot](https://docs.cursor.com/en/bugbot), [GitHub Copilot code review](https://docs.github.com/en/copilot/tutorials/optimize-code-reviews), and [Codex automatic review](https://help.openai.com/en/articles/11369540-codex-in-chatgpt) all live on the same skeleton: a second agent reads the diff, leaves findings, and the authoring agent or human turns repeated findings into upstream rules.

> [!NOTE] Prerequisite
> Start with [The Second Opinion](the-second-opinion.md) and [Tuning Bugbot for Your Codebase](tuning-bugbot-for-your-codebase.md). This appendix assumes you already understand why the second-opinion loop matters. The only thing changing here is the vendor-specific surface area.

## The portable parts of the loop

When I move from one review tool to another, these are the things I map first:

- **Trigger**: when does the review happen?
- **Instruction surface**: where does the reviewer learn the repository rules?
- **Finding policy**: which comments are blocking, and which are advisory?
- **Duplicate handling**: what happens when three pull requests in a row trip on the same category of issue?
- **Re-review rule**: how does the tool know it should look again after a fix?

That is the real interface. Everything else is product chrome.

## Trigger models

Some tools review automatically on pull request open. Some re-review on every push. Some need a comment or an explicit action.

The portability rule is simple: **document the trigger in the repository, not just in your head.**

If the reviewer only runs when someone types a magic phrase, that is not self-testing. That is a ritual.

## Instruction surfaces vary more than people expect

This is the part that bites teams.

Bugbot might read `.cursor/BUGBOT.md`. Copilot might read `.github/copilot-instructions.md` plus any repository instructions you expose through GitHub. Codex might run from a repository-level prompt, a connected workflow, or a manual "review this diff" instruction. Plain GitHub review comments have no built-in instruction file at all, which means you need a playbook in the repo if you want consistency.

Different entry points. Same job: give the reviewer enough context that it catches your problems instead of inventing new ones.

So, when you port the loop, do not start with "which button do I click?" Start with "where does this reviewer read the rules?"

## Normalize the findings, not the tool

The fastest way to make review tooling portable is to normalize how findings are interpreted.

I like three buckets:

- **Blocking**: security, data loss, broken auth, correctness issues
- **Needs judgment**: architecture fit, naming, unclear logic, suspicious patterns
- **Noise**: low-value style chatter or duplicate comments that do not change the patch

If you classify findings this way, the vendor matters less. The agent or human author now knows how to respond even if the comment came from a different product. For the mechanical version of this normalization, a shared JSON schema passed to `claude -p --json-schema` or `codex exec --output-schema` forces every review tool into the same output shape—see [Structured CLI Output as Pipeline Glue](structured-cli-output-as-pipeline-glue.md).

## The rule of three still applies

This part does not change just because the logo did.

If three pull requests trip the same review finding:

- first, add or tighten the instruction
- next, add a lint rule or static check if the problem is mechanical
- finally, add a test if the problem is behavioral

That is how review feedback stops being repetitive and starts becoming infrastructure.

The important thing is that the escalation policy lives in the repository. Otherwise every tool migration resets the team back to folklore.

## A portable review matrix

Here is the matrix I actually want written down:

| Surface             | Trigger                                       | Rule source                                      | Re-review mechanism                         | Best use                            |
| ------------------- | --------------------------------------------- | ------------------------------------------------ | ------------------------------------------- | ----------------------------------- |
| Bugbot              | automatic on pull request activity            | `.cursor/BUGBOT.md` plus repo conventions        | push a fix or use the tool's follow-up flow | sharp diff-level findings           |
| Copilot review      | repository or pull request workflow setting   | `.github/copilot-instructions.md` plus repo docs | push a fix and rerun review                 | lower-friction GitHub-native review |
| Codex review        | automatic or delegated review depending setup | repository prompt plus repo docs                 | push a fix or rerun the review workflow     | code-review-plus-fix loop           |
| Plain GitHub review | human or manual agent review                  | repo playbook and reviewer judgment              | request re-review                           | fallback that always exists         |

The point is not that this table is perfect forever. The point is that you now have something explicit to port.

> [!NOTE] Product drift
> Availability, pricing, and exact setup steps for hosted review tools change fast. Re-check the current product docs before making any one tool a required merge gate.

## What goes in the repository

If I want this loop to survive tool churn, I keep three artifacts in the repository:

- the tool-specific instruction file for whichever review surface I actually use
- a vendor-neutral review playbook describing severity buckets, duplicate handling, and escalation rules
- one place that says how repeated findings flow back into the agent rules, lint rules, and tests

That is enough to keep the process portable even if the product does not stay still.

### What the review playbook looks like

The review playbook is the vendor-neutral artifact. Its job is to describe the loop in terms any reviewer (human, Bugbot, Copilot, Codex) can apply. Shelf's lives at `docs/review-loop-playbook.md` and has this shape:

```markdown
# Review loop playbook

## Finding categories

### Blocking

A finding is blocking when it matches one of these patterns:

- Any API handler reading user identity from the request body instead
  of `locals.user`.
- Any Drizzle query on user-owned data that does not scope by the
  current user.
- Any Playwright spec that uses `page.waitForTimeout` or a raw CSS
  `page.locator`.

Blocking findings must be fixed before merge.

### Judgment

A finding needs judgment when it is symptom-level — naming, error
messaging, helper extraction. Worth reading, worth considering,
not automatically required.

### Noise

A finding counts as noise when it applies to generated artifacts
(`playwright-report/`, `build/`), test snapshot PNGs, or the
allowlisted `sample-config.json` bait file. If the reviewer keeps
producing noise here, update its instruction surface.

## The rule of three

- First two occurrences: fix the PR.
- Third occurrence: add a rule to the agent instructions.
- Still recurring: add a lint rule, test assertion, or CI gate.

## Re-review path

After a fix lands, the reviewer reruns on the next push. If it stays
silent on a remaining blocking pattern, update its instructions
file.
```

Short. Explicit. Mechanical. The whole file fits on a page and every reviewer follows the same three-bucket categorization regardless of which tool is in the reviewer's seat.

## How You Know the Review Loop Travels

You have a portable review loop when:

- at least one alternate review surface is documented alongside Bugbot
- the repository defines blocking versus advisory findings explicitly
- repeated findings have an agreed path back into upstream rules

## The one thing to remember

The review bot brand is not the loop. The loop is "a second set of eyes finds things the author missed, and repeated findings become repository rules." Write _that_ down, and the tooling can change without taking your process with it.

## Additional Reading

- [The Second Opinion](the-second-opinion.md)
- [Lab: Port the Review Loop Beyond Bugbot](lab-port-the-review-loop-beyond-bugbot.md)
