---
title: Routines and Schedules
description: 'Scheduled and event-triggered agents fail silently. Write an unattended run contract first, and in CI let the agent propose while a gate decides.'
---

A prompt that runs while you're asleep is a different animal from one you watch. Nobody is there to notice the weird output, and a green status light doesn't tell you the work happened. So before you hand an agent a schedule, write a few things down.

Claude Code, Codex, and other tools now support an idea inspired by [OpenClaw](https://openclaw.ai): kick off a prompt on a schedule or an external event. In Claude Code, "scheduled task" can mean three different things:

- **`/loop` task**: A recurring prompt that fires only while its session is running. Unexpired fixed-interval tasks return with `claude --resume` or `--continue`; self-paced loops do not. Expired recurring tasks and elapsed one-shot tasks are not restored. See [Goals and Loops](goals-and-loops.md).
- **Desktop scheduled task**: A prompt that the Claude desktop app runs on a schedule on your machine. It persists across sessions.
- **Cloud routine**: A prompt Anthropic runs on a schedule or an event, in the cloud, without your machine. See the [routines documentation](https://code.claude.com/docs/en/routines) and the [scheduled tasks documentation](https://code.claude.com/docs/en/scheduled-tasks).

## What can trigger a run

- **Time**: Daily, weekly, or every N minutes or hours.
- **Event**: Usually a Git event, like a failing CI run, a new pull request, or a new review comment.
- **On demand**: You fire it by hand.

Watch for accidental infinite loops, like an agent whose own commit triggers its next run. Use all four of these guards. The first three stop the cycle, and the fourth limits the damage if one slips through:

- **Actor filters**: Ignore events that the automation itself caused.
- **Idempotency keys**: A stable ID for the work, so running it twice does it once.
- **Run caps**: A hard limit on how many times it can fire.
- **Explicit integration authority**: A written list of what the automation may touch.

## The unattended run contract

A green status means the process exited. It doesn't mean the task in your prompt succeeded. Before anything runs without you, write down:

- **Trigger and initiator**: Who, or what, can fire it? Authenticating a trigger isn't the same as trusting its contents.
- **Input trust**: Event payloads are data, not instructions. By default, a routine treats text sent with a fire request (an API call, or **Run now** in the web interface) as information: it arrives wrapped in a `<routine-fire-payload>` tag, labeled untrusted, and the routine acts on it only if your saved prompt explicitly says to.
- **Environment and credentials**: What does it run with, and when does that expire?
- **Authority**: What can it read, what can it write, and what's irreversible?
- **Governors**: The limits that force a run to stop: time, agentic turns (each model request and the tool calls it makes), spend, concurrency, and retries.
- **Oracle**: Something other than the agent that decides whether it worked.
- **Notification**: On success, on failure, on ambiguity, and on _absence_. The hardest failure to notice is the run that never happened. Use a **dead-man's switch**, a check-in that only pings on a clean exit, so silence raises the alarm.
- **Stop path**: A kill switch, and a way to undo what it did.

## Tasting notes

These are the details that don't show up until the third week:

- **Missed runs**: Each scheduler handles them differently. A desktop scheduled task runs exactly one catch-up for the most recent miss. A `/loop` task that comes due while Claude is busy fires once when it's idle again, with no catch-up. A cloud routine just skips. Plain old cron does nothing.
- **Cloud routines need GitHub**: Each run starts from a fresh clone of your GitHub repository, so if the GitHub connection is missing or expired, the routine skips runs until you reconnect. After 72 hours without a connection, it turns itself off.
- **Jitter**: The scheduler adds an offset to each task's start time, and the size depends on the kind. A fixed-interval `/loop` task can fire up to 30 minutes late (or up to half the interval, if it runs more often than hourly). A self-paced loop gets no jitter. Desktop scheduled tasks and cloud routines start a few minutes late. Make your alert window at least as wide as the offset for the kind you use.
- **Manual fires have no idempotency key**: Key the work on something stable like the head commit SHA, not the pull request number. The number survives a push, so new work would look like work you'd already done. The SHA changes with every push.
- **Start read-only**: Before the first cloud run, inspect the routine's connectors. Every connected account connector is included by default, and its tools can run without individual approval. Remove the ones you don't need and restrict the rest to read-only tools or read-only service credentials; if you can't restrict one, remove it. Review repository `.mcp.json` servers too, because read-only GitHub access does not limit Slack, Linear, or other external tools. The [routine connector reference](https://code.claude.com/docs/en/routines#connectors) describes these defaults. Promote to write actions only after explicitly authorizing that broader scope.
- **Paused fleets look like coverage**: A fleet of paused jobs with broken paths is _worse_ than no fleet at all. I know this because I built 11 scheduled Codex automations, and all 11 ended up paused. Several pointed at skill paths that no longer existed.

## Agents in CI

A CI agent is a credential-bearing process whose prompt is partly written by anyone who can open an issue. That sentence is the whole threat model. ([Blast radius](the-enforcement-ladder.md#blast-radius) goes further on why an agent's input can't be trusted.) Here's what follows from it:

- **Use `pull_request`, not `pull_request_target`**: By default, fork `pull_request` jobs receive a read-only `GITHUB_TOKEN` and no secrets. Private repositories can override both: keep **Send write tokens to workflows from pull requests** and **Send secrets to workflows from pull requests** disabled in the [fork workflow settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#enabling-workflows-for-forks-of-private-repositories), and set explicit minimal job `permissions`. If the agent job can't run without them, that's the safe outcome. `pull_request_target` uses the trusted base context with potentially elevated credentials; never check out and execute untrusted head code in that context. An agent merely _reading_ attacker-controlled text can also be manipulated into using its authority.
- **Don't infer authorization from a string**: Anyone can create a GitHub App whose name ends in `[bot]`. A trigger that trusts any actor with that suffix lets a stranger's app pass as trusted. This exact bug shipped in a real GitHub Action for Claude Code.
- **Keep secrets out of the agent's job**: Keep the proposing agent uncredentialed, including no `id-token: write` permission. OIDC federation does not remove authority: code in a job with that permission can request and misuse a federated credential while the job runs. Do privileged work in a separate downstream job that authorizes the action independently, consumes only a narrowly validated artifact, and never executes agent-produced code. Use short-lived OIDC credentials there to limit credential lifetime; expiration limits persistence after compromise, not abuse during the job.
- **Check the process, then the result**: A failed `claude -p` run exits nonzero, per the [headless reference](https://code.claude.com/docs/en/headless#basic-usage). Fail CI on that status first, including startup or transport failures with no parseable result. After a successful process exit, require valid result JSON and inspect `is_error`, `permission_denials`, and the requested work's evidence before accepting it, because a successful process can still have been denied an action the task needed. Keep the independent _oracle_ checks from [The Ralph Loop](the-ralph-loop.md) too.
- **Token-triggered CI needs an explicit check**: A push made with the default `GITHUB_TOKEN` doesn't trigger another `push` workflow. There are [documented exceptions](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs): `workflow_dispatch` and `repository_dispatch` run, and `pull_request` events of type `opened`, `synchronize`, or `reopened` create runs that require approval from a user with write access. Distinguish a suppressed run from one awaiting approval. Require specific _named_ checks in branch protection and verify those checks passed on the current head SHA before merging.
- **Enforce code-owner review for workflows and tests**: Add those paths and the `CODEOWNERS` file itself to `CODEOWNERS`, with owners outside the agent's control. Then enable **Require review from Code Owners** in branch protection or a ruleset for the target branch, and keep bypass authority away from the agent. As [GitHub explains](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners#codeowners-and-branch-protection), the file alone requests reviews; the branch rule enforces them.

The pattern is: **automate proposing, gate disposing.** An agent can open the pull request, write the review comment, and propose the fix. A human or a deterministic check decides what merges.
