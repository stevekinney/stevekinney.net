---
title: Routines and Schedules
description: 'Scheduled and event-triggered agents fail silently. Write an unattended run contract first, and in CI let the agent propose while a gate decides.'
---

A prompt that runs while you're asleep is a different kind of thing from a prompt you watch. Nobody is there to notice the weird output, and a green status light doesn't tell you the work happened. This lesson is about what to write down before you hand an agent a schedule.

The idea is inspired by [OpenClaw](https://openclaw.ai), and Claude Code, Codex, and other tools now support it: kick off a prompt on a schedule or an external event. In Claude Code, there are three different things, and "scheduled task" alone is ambiguous, so we'll keep them apart:

- **`/loop` task**: A recurring prompt that fires only while its session is running. Unexpired fixed-interval tasks return with `claude --resume` or `--continue`; self-paced loops do not. Expired recurring tasks and elapsed one-shot tasks are not restored. ([Goals and Loops](goals-and-loops.md) covers it.)
- **Desktop scheduled task**: A prompt that the Claude desktop app runs on a schedule on your machine. It persists across sessions.
- **Cloud routine**: A prompt Anthropic runs on a schedule or an event, in the cloud, without your machine. See the [routines documentation](https://code.claude.com/docs/en/routines) and the [scheduled tasks documentation](https://code.claude.com/docs/en/scheduled-tasks).

## What can trigger a run

- **Time**: Daily, weekly, or every N minutes or hours.
- **Event**: Typically Git events at this point, like a failing CI run, a new pull request, or a new review comment.
- **On demand**: You schedule something yourself and fire it by hand.

One thing to watch out for right away. Schedules can create infinite loops by accident, like an agent whose own commit triggers the event that starts the next run. Guard against it with all four of these. The first three stop the cycle, and the fourth limits the damage if one slips through:

- **Actor filters**: Ignore events that the automation itself caused.
- **Idempotency keys**: A stable ID for the work, so running it twice does it once.
- **Run caps**: A hard limit on how many times it can fire.
- **Explicit integration authority**: A written list of what the automation may touch.

## The unattended run contract

A green status means the process exited. It doesn't mean the task in your prompt succeeded. Before anything runs without you, write down:

- **Trigger and initiator**: Who, or what, can fire it? Authenticating a trigger isn't the same as trusting its contents.
- **Input trust**: Event payloads are data, not instructions. By default, a routine treats text you send with a fire request (an API call, or **Run now** in the web interface) as information. It arrives wrapped in a `<routine-fire-payload>` tag and labeled untrusted. The routine only acts on it if your saved prompt explicitly says to.
- **Environment and credentials**: What does it run with, and when does that expire?
- **Authority**: What can it read, what can it write, and what's irreversible?
- **Governors**: Time, agentic turns (each model request and the tool calls it makes), spend, concurrency, and retries. (A governor is whatever forces a run to stop.)
- **Oracle**: Something other than the agent that decides whether it worked.
- **Notification**: On success, on failure, on ambiguity, and on _absence_. The hardest failure to notice is the run that never happened. Use a **dead-man's switch**, a check-in that only pings on a clean exit, so silence raises the alarm.
- **Stop path**: A kill switch, and a way to undo what it did.

## Tasting notes

These are the details that don't show up until the third week:

- **Missed runs work differently depending on the scheduler.** A desktop scheduled task runs exactly one catch-up for the most recent miss. A `/loop` task that comes due while Claude is busy fires once when it's idle again, with no catch-up. A cloud routine just skips. Plain old cron does nothing.
- **A cloud routine has one more rule.** Each run starts from a fresh clone of your GitHub repository, so if its GitHub connection is missing or expired, it skips runs until you reconnect. After 72 hours without a connection, it turns itself off.
- **Scheduled runs start late, by an amount that depends on the kind.** The offset is called jitter, and the scheduler adds it to each task's start time. A fixed-interval `/loop` task can fire up to 30 minutes late (or up to half the interval, if it runs more often than hourly). A self-paced loop gets no jitter. Desktop scheduled tasks and cloud routines start a few minutes late. Make your alert window at least as wide as the offset for the kind you use.
- **There's no idempotency key on a manual fire.** Key the work on something stable like the head commit SHA, not the pull request number. The number stays the same across pushes, so a new push would look like work you'd already done. The SHA changes with every push.
- **Start read-only.** Before the first cloud run, inspect the routine's connectors: all currently connected account connectors are included by default, and their tools can run without individual approval. Remove every unnecessary connector and restrict retained ones to read-only tools or read-only service credentials; if that restriction is unavailable, remove the connector. Also review repository `.mcp.json` servers. Read-only GitHub access does not limit Slack, Linear, or other external tools. The [routine connector reference](https://code.claude.com/docs/en/routines#connectors) describes these defaults. Promote to write actions only after explicitly authorizing that broader scope.
- **A fleet of paused jobs with broken paths is _worse_ than no fleet at all,** because it looks like coverage. I know this because I built 11 scheduled Codex automations, and all 11 ended up paused. Several of them pointed at skill paths that no longer existed.

## Agents in CI

A CI agent is a credential-bearing process whose prompt is partly written by anyone who can open an issue. That sentence is the whole threat model. Here's what follows from it:

- **Use `pull_request`, not `pull_request_target`**: By default, fork `pull_request` jobs receive a read-only `GITHUB_TOKEN` and no secrets. Private repositories can override both: keep **Send write tokens to workflows from pull requests** and **Send secrets to workflows from pull requests** disabled in the [fork workflow settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#enabling-workflows-for-forks-of-private-repositories), and set explicit minimal job `permissions`. Without its credentials, an agent job may be unable to run, and that's the safe outcome. `pull_request_target` uses the trusted base context with potentially elevated credentials; never check out and execute untrusted head code in that context. An agent merely _reading_ attacker-controlled text can also be manipulated into using its authority.
- **Don't infer authorization from a string**: Anyone can create a GitHub App whose name ends in `[bot]`. A trigger that trusts any actor with that suffix lets a stranger's app pass as trusted. This exact bug shipped in a real GitHub Action for Claude Code.
- **Keep secrets out of the agent's job**: Keep the proposing agent uncredentialed, including no `id-token: write` permission. OIDC federation does not remove authority: code in a job with that permission can request and misuse a federated credential while the job runs. Perform privileged actions in a separate downstream job that independently authorizes the action and consumes only a narrowly validated artifact, without executing agent-produced code. Use short-lived OIDC credentials there to limit credential lifetime; expiration limits persistence after compromise, not abuse during the job.
- **Check the process, then the result**: As the [headless reference](https://code.claude.com/docs/en/headless#basic-usage) specifies, a failed `claude -p` run exits nonzero. Fail CI on that status first, including startup or transport failures with no parseable result. After a successful process exit, require valid result JSON and inspect `is_error`, `permission_denials`, and the requested work's evidence before accepting it. A successful process can still have been denied an action the task needed. Keep the independent _oracle_ checks from [Running a Ralph Loop](running-a-ralph-loop.md) too.
- **Token-triggered CI needs an explicit check**: A push made with the default `GITHUB_TOKEN` doesn't trigger another `push` workflow. There are [documented exceptions](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs): `workflow_dispatch` and `repository_dispatch` run, and `pull_request` events of type `opened`, `synchronize`, or `reopened` create runs that require approval from a user with write access. Distinguish a suppressed run from one awaiting approval. Require specific _named_ checks in branch protection and verify those checks actually passed on the current head SHA before merging.
- **Enforce code-owner review for workflows and tests**: Add those paths and the `CODEOWNERS` file itself to `CODEOWNERS`, with owners outside the agent's control. Then enable **Require review from Code Owners** in branch protection or a ruleset for the target branch, and keep bypass authority away from the agent. As [GitHub explains](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners#codeowners-and-branch-protection), the file alone requests reviews; the branch rule enforces them.

The pattern is: **automate proposing, gate disposing.** An agent can open the pull request, write the review comment, and propose the fix. A human or a deterministic check decides what merges.

[Blast Radius](blast-radius.md), about how much damage an agent can do when it's compromised, goes further on why an agent's input can't be trusted.
