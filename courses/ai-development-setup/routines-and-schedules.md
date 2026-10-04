---
title: Routines and Schedules
description: 'Scheduled and event-triggered agents fail silently. Write an unattended run contract first, and in CI let the agent propose while a gate decides.'
---

A prompt that runs while you're asleep is a different kind of thing from a prompt you watch. Nobody is there to notice the weird output, and a green status light doesn't tell you the work happened. This lesson is about what to write down before you hand an agent a schedule.

The idea is inspired by [OpenClaw](https://openclaw.ai), and Claude Code, Codex, and other tools now support it: kick off a prompt on a schedule or an external event. In Claude Code, there are three different things, and "scheduled task" alone is ambiguous, so we'll keep them apart:

- **`/loop` task**: A recurring prompt inside one open session. It dies when the session ends. ([Goals and Loops](goals-and-loops.md) covers it.)
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
- **Start read-only.** Promote to write actions once it has earned it.
- **A fleet of paused jobs with broken paths is _worse_ than no fleet at all,** because it looks like coverage. I know this because I built 11 scheduled Codex automations, and all 11 ended up paused. Several of them pointed at skill paths that no longer existed.

## Agents in CI

A CI agent is a credential-bearing process whose prompt is partly written by anyone who can open an issue. That sentence is the whole threat model. Here's what follows from it:

- **Use `pull_request`, not `pull_request_target`**: On `pull_request` from a fork, GitHub withholds your secrets and makes `GITHUB_TOKEN` read-only. For an agent, that usually means the job can't run on fork pull requests at all, and that's the safe outcome. `pull_request_target` runs with your secrets against code you didn't write, and _reading_ attacker-controlled code is enough to cause trouble.
- **Don't infer authorization from a string**: Anyone can create a GitHub App whose name ends in `[bot]`. A trigger that trusts any actor with that suffix lets a stranger's app pass as trusted. This exact bug shipped in a real GitHub Action for Claude Code.
- **Keep secrets out of the agent's job**: Use OIDC federation (short-lived tokens that your CI provider issues to a single job) where you can. A static token in a process that can be talked into misbehaving stays valid after the job ends, so one leak is a lasting leak. A job token expires with the job.
- **Exit `0` can hide failure**: A failed `claude -p` run can still exit `0`, with the failure text in its JSON output. So branch on the `is_error` and `permission_denials` fields of that JSON result, not on the agent process's exit code. (That's different from an _oracle's_ exit code, the one from a test or search command you wrote, which [Running a Ralph Loop](running-a-ralph-loop.md) relies on.)
- **Commits made with the default `GITHUB_TOKEN` don't trigger CI**: So "the checks passed" might mean "no checks ran." In branch protection, require specific _named_ checks. "Require status checks" with no names listed is satisfied when nothing ran.
- **Put CODEOWNERS on your workflows and tests**: CODEOWNERS is the file that requires named reviewers for given paths, so the agent can't quietly rewrite the checks that judge it.

The pattern is: **automate proposing, gate disposing.** An agent can open the pull request, write the review comment, and propose the fix. A human or a deterministic check decides what merges.

[Blast Radius](blast-radius.md), about how much damage an agent can do when it's compromised, goes further on why an agent's input can't be trusted.
