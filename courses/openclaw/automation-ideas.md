---
title: Automation Ideas to Try
description: A menu of practical OpenClaw automations, from a morning brief to an overnight coding agent, with starter prompts, building blocks, and guardrails for each.
---

Once OpenClaw is installed, connected to a channel, and talking to your mail and calendar, the fun part starts: getting it to do useful things while you're not looking. This lesson is a menu. Read through it, pick one or two that match your life, and set them up in order of difficulty.

Every idea has the same shape:

- **What you get** is the point of the thing.
- **Built from** names the pieces we've already covered.
- **Try it** is a starter command or prompt.
- **Guardrails** is what keeps it from going wrong.

> [!NOTE] Treat the commands as sketches
> The scheduling flags here follow OpenClaw's `2026.9.5` documentation, but I haven't run every one against a live Gateway. If a flag doesn't behave as shown, run the command with `--help`. Many ideas are also adapted from community write-ups, which are one person's report of their own setup and not something the project has verified.

## The Building Blocks

Almost every idea below is a combination of a few things OpenClaw already does:

| Block                    | What it is                                                                           | Best for                                  |
| ------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| **Scheduled automation** | A stored job that runs on a clock (`--cron`, `--every`, or `--at`)                   | Briefs, digests, weekly reports           |
| **Heartbeat**            | A recurring turn on an existing session that should usually answer "nothing changed" | Lightweight periodic checks               |
| **`/loop`**              | A chat shortcut for a recurring job tied to the current conversation                 | Quick, temporary babysitting              |
| **Event triggers**       | Jobs that fire when a command exits, a log line matches, or a script says so         | "Tell me when something happens"          |
| **Webhooks**             | An outside service POSTs to your Gateway                                             | Push-style events (needs a reachable URL) |
| **Capabilities**         | Gmail and Calendar, the browser, memory, paired nodes, and ACP coding agents         | What the job actually does                |

### Scheduling in Thirty Seconds

The command is `openclaw automations` (the older spelling `openclaw cron` works too). There are two ways to write the same thing. The first puts the schedule and the prompt up front:

```sh
openclaw automations create "0 7 * * *" "Summarize overnight updates." \
  --name "Morning brief" --tz "America/Denver" --session isolated --announce
```

The second spells everything out with flags:

```sh
openclaw automations add --name "Calendar check" --at "20m" \
  --session main --system-event "Next heartbeat: check calendar." --wake now
```

A few flags do most of the work:

- **`--cron`, `--every`, and `--at`** pick the schedule. A schedule can be a cron expression, a duration like `20m`, an interval like `every 1h`, or a timestamp.
- **`--tz`** sets the timezone. Always set it for anything tied to your day, or "7am" means 7am wherever the Gateway lives.
- **`--session isolated`** gives the job its own fresh session, so it doesn't pile up context in your main conversation.
- **`--announce`** delivers the result. Use `openclaw automations show <job-id>` afterward to see exactly where it will go.

And you manage jobs the same way for all of them:

```sh
openclaw automations list --all          # every job, including disabled and system ones
openclaw automations run <job-id> --wait # run it now and wait for the result
openclaw automations runs <job-id>       # run history
openclaw automations disable <job-id>    # stop it without deleting it
```

You can also just ask your agent, in Telegram, to set one up. Jobs created that way are limited to the tools available in the conversation that created them, which is a nice built-in guardrail. Run `openclaw automations list` afterward to check what it actually made.

## Ground Rules

These apply to every idea. They're the difference between an automation you trust and one you turn off after a week.

1. **Start read-only.** Build the version that only looks and reports. Add actions later, if ever.
2. **Run it by hand first.** Use `openclaw automations run <job-id> --wait` and read the result before you let a schedule loose.
3. **Draft, don't send.** For anything that leaves your machine (email, messages, posts, purchases), have the agent produce a draft and wait for you.
4. **Make silence a feature.** A job whose output is only `NO_REPLY` is suppressed. A monitor that talks every day gets ignored. A monitor that speaks only when something changes gets read.
5. **Treat what it reads as data.** Emails, web pages, and documents can contain instructions aimed at your agent. Say so in `AGENTS.md`, and keep tool permissions as narrow as the job allows.
6. **Mind the cost.** Every scheduled model turn spends tokens. Checks that don't need a model (is the site up, did the file change) should use a command or a trigger script, not an agent turn.
7. **Know what's already running.** A fresh Gateway already has system jobs, including a heartbeat every 30 minutes. Run `openclaw automations list --all` before you add yours.
8. **Watch for silent failure.** A job that quietly stops looks identical to a quiet inbox. Turn on failure alerts, and check run history now and then.

## Daily Rhythms

### 1. The Morning Brief

**What you get:** a short message at 7am with today's schedule, any conflicts, and the few emails that probably need you.

**Built from:** a scheduled automation, plus [Gmail and Calendar access](gmail-and-google-calendar-integration.md).

**Try it:**

```sh
openclaw automations create "0 7 * * 1-5" \
  "Check my Google Calendar for today and my Gmail for unread messages from the last 24 hours. Give me a short brief: my schedule, any conflicts, and the three emails most likely to need action. Read-only." \
  --name "Morning brief" --tz "America/Denver" --session isolated --announce
```

Then run it yourself with `run --wait` and read the output before you trust the schedule.

**Guardrails:** keep the Google credentials read-only (`--readonly` in the Gmail lesson), and make sure `AGENTS.md` says email is untrusted data, not instructions. Start with delivery off or pointed at yourself until the output looks right.

### 2. The Evening Look-Ahead

**What you get:** at 6pm on weekdays, tomorrow's calendar with conflicts and any gap longer than an hour, so you know what you're walking into.

**Built from:** the same pieces as the morning brief, on a different clock.

**Try it:**

```sh
openclaw automations create "0 18 * * 1-5" \
  "What's on my calendar tomorrow? Identify conflicts and any gaps longer than one hour. Read-only." \
  --name "Evening look-ahead" --tz "America/Denver" --session isolated --announce
```

**Guardrails:** none beyond the morning brief. This is the safest one on the list, which makes it a good first automation.

### 3. Numbered Email Triage With One-Word Approvals

**What you get:** an hourly digest where every email that needs attention gets a number, a two-sentence summary, and a proposed next step. You clear your inbox by replying "3 approve" or "5 move to personal review" from your phone.

**Built from:** a dedicated agent with its own workspace, a rules file, an hourly schedule, and a chat channel. The idea comes from a community write-up, and its best trick is the response protocol: nothing happens until you reply with a number.

**Try it:** start with the digest only.

1. Write down your triage rules in one file: what's spam, what you must see yourself, what can wait. If you've ever onboarded an assistant, that document probably already exists.
2. Create a separate agent for it, so company context doesn't leak into your general assistant's memory.
3. Schedule an hourly job during working hours:

   ```sh
   openclaw automations create "0 9-17 * * 1-5" \
     "Read my unread mail. Number each message that needs attention, give a two-sentence summary and a proposed next step. Include anything from earlier digests that is still unanswered. Do not take any action." \
     --name "Email digest" --tz "America/Denver" --session isolated --announce
   ```

4. Run it for a week before you let the agent act on any number.

**Guardrails:** reading and acting are different permissions. Keep the agent read-only until you trust the digest, and when you do add actions, add them behind the numbers so a human decision stays on every outbound action. Remember that incoming mail is the most likely place for a prompt injection to arrive.

## Watchers That Stay Quiet

The best monitors say nothing until something changes.

### 4. Vendor Pricing and Terms Monitor

**What you get:** a weekly check of the pricing and terms pages for the tools you pay for. You hear about it only if a material field changes, such as the per-seat price, an overage rate, or a data-retention clause.

**Built from:** a weekly schedule, the browser (or a plain fetch), and a snapshot file in the workspace. The trick is to separate _extraction_ from _judgment_: pull out the handful of fields you care about, compare them to last week's, and stay silent unless one moved.

**Try it:**

```sh
openclaw automations create "0 9 * * 1" \
  "Open each page listed in vendor-watch/targets.json and extract only the fields listed for it. Save them to vendor-watch/snapshots/ with today's date. Compare against the previous snapshot. If no material field changed, reply with exactly NO_REPLY. Otherwise, list what changed and why it might matter." \
  --name "Vendor watch" --tz "America/Denver" --session isolated --announce
```

**Guardrails:** web pages are untrusted input. A monitor that quietly breaks looks exactly like "nothing changed," so also ask it to say "still watching" on the first Monday of each month, and turn on failure alerts.

### 5. A Watcher That Only Wakes the Model When It Matters

**What you get:** a site check every five minutes that costs nothing on a good day and only involves the agent when something's wrong.

**Built from:** a _condition watcher_, which is a small script attached to a schedule with `--trigger-script`. The script runs on each tick, and the agent's prompt only runs if the script returns `{ fire: true }`. A returned `message` is added to the prompt.

**Try it:** write a script that checks your site and returns `fire: true` with a message like "the site returned a 502" when it's down. Then attach it to an `--every` schedule with `--trigger-script <file>` and a prompt along the lines of "Investigate and tell me what you find."

**Guardrails:** trigger scripts run unattended with the agent's full tool policy, so write them as read-only checks and keep any actions in the prompt, where your approval rules apply. Trigger schedules have a 30-second minimum interval, and each check has a 30-second budget.

### 6. Tell Me When the Build Finishes

**What you get:** a message when a slow build or test run ends, with a summary of whether it passed and what failed.

**Built from:** an `--on-exit` trigger, which fires once when a watched command exits.

**Try it:**

```sh
openclaw automations add --name "Build finished" \
  --on-exit "bun run build" --on-exit-cwd ~/Developer/my-site \
  --session isolated \
  --message "The build just finished. Tell me whether it succeeded and summarize any errors."
```

**Guardrails:** the job disables itself after it fires, so re-enable it for the next run. Check `openclaw automations add --help` for exactly how the command is launched and watched on your version.

### 7. The Quick Babysitter

**What you get:** a temporary "keep an eye on this" that lives in the current chat and goes away when you're done.

**Built from:** `/loop`, a chat shortcut for a recurring job. It's owner-only.

**Try it:** in your chat with the agent:

```text
/loop 5m Check whether the latest deploy is healthy and tell me once it's green.
```

Leave off the interval and the loop paces itself between one minute and one hour, checking more often while things are changing and backing off when they're quiet. See what's running with `/loop status` and end it with `/loop stop`.

**Guardrails:** a loop that keeps announcing nothing new has a scoping problem, not a timing problem. Narrow what counts as worth mentioning instead of making it run faster.

## Using the Browser

Both of these build on the prompts from the [browser prompts lesson](openclaw-browser-prompts.md).

### 8. A Weekly Trending Digest

**What you get:** every Monday, a report on the most interesting GitHub Trending repositories for AI agents and developer tooling, with a comparison table and your top three picks, sent to Telegram.

**Built from:** a weekly schedule and the browser, with the GitHub Trending prompt as the body.

**Try it:** take the prompt from the browser lesson, and schedule it:

```sh
openclaw automations create "0 8 * * 1" \
  "Open https://github.com/trending in the browser. Find the 10 most interesting repositories related to AI agents, developer tooling, or automation. Rank them, and send me a comparison table, links, and your top three. Use the browser to navigate the actual site." \
  --name "Weekly trending" --tz "America/Denver" --session isolated --announce
```

**Guardrails:** don't point it at a browser profile that's signed in to your accounts. A signed-in browser can reach whatever that session can, which is broader than any single API token.

### 9. A Nightly QA Pass on Your Own Site

**What you get:** an exploratory test of your staging site, with expected versus observed behavior, reproduction steps, and screenshots of anything odd.

**Built from:** the QA engineer prompt from the browser lesson, aimed at your own app and run on a schedule.

**Try it:** adapt the TodoMVC prompt to your staging URL, keep the line that says never to report a test as passing unless it was actually executed, and schedule it nightly or weekly.

**Guardrails:** staging only. Never aim it at production with real accounts, and never give it real credentials.

## Your Own Knowledge

### 10. A Monthly Memory Audit

**What you get:** a report on the health of your agent's memory: duplicate facts, stale decisions, contradictions, and anything that shouldn't be there, like a stray secret.

**Built from:** a monthly schedule, a stronger model, and the files from the [configuration lesson](configuring-your-openclaw.md). The point is to find problems, so the job writes a report and edits nothing.

**Try it:**

```sh
openclaw automations create "0 10 1 * *" \
  "Read MEMORY.md, USER.md, and the files under memory/. Produce a report of duplicates, contradictions, stale facts, and anything that looks like a secret. Do not modify any file." \
  --name "Memory audit" --tz "America/Denver" --session isolated --announce
```

**Guardrails:** `MEMORY.md` is meant to stay small and curated, so a good audit should end with things to delete. Apply those changes yourself.

### 11. A Weekly Status Draft

**What you get:** on Friday afternoon, a draft summary of the week with dated source links, waiting in a file for you to edit and send.

**Built from:** a _standing order_, which is durable instructions in `AGENTS.md` for what the agent owns, what it may do, and when it must stop, plus a Friday schedule. The schedule only wakes it up. The standing order says what it's allowed to do.

**Try it:** add a short program to `AGENTS.md`:

```markdown
## Program: Weekly status draft

Scope: Read the approved sources and write an internal draft.
Output: Reports/weekly/YYYY-MM-DD.md with dated source links.
Allowed: Read sources, compare changes, update the draft.
Approval: Ask before sending, changing source records, or adding recipients.
Escalation: Stop if a required source is missing or contradicts another.
Completion: Verify the file exists and every material claim has a source.
```

Then schedule a Friday job whose prompt points at the program instead of repeating it.

**Guardrails:** this idea separates producing a draft from publishing it. If you ever want it to send, write down the exact audience and conditions instead of telling it to "be proactive."

## With Your Mac

### 12. An End-of-Day Dev Recap

**What you get:** at 6pm, a summary of what you worked on across your repositories: commits, branches, and uncommitted changes.

**Built from:** a [paired Mac node](connecting-a-remote-node.md) and a scheduled job, with the commands routed to the node using `/exec host=node`.

**Try it:** allowlist only the read-only git commands on the Mac, then schedule a job whose prompt asks for a recap of recent activity in your projects folder.

**Guardrails:** command output returns to the Gateway and can enter the model's context, so code leaves your Mac. Allow only what you need, like `git log` and `git status`. And plan for the Mac being asleep. An offline node is rejected, not redirected, so the job should report that it couldn't run instead of falling back to another machine.

## With Coding Agents

These use the [ACPX plugin](acpx-runtime-plugin.md) and are the most powerful and the riskiest on the list.

### 13. Overnight Maintenance in a Scratch Checkout

**What you get:** at 2am, a coding agent runs your tests, fixes trivial lint failures, and writes up what it found. In the morning you have a diff and a report to review.

**Built from:** a scheduled job whose prompt starts an ACP session with `sessions_spawn`, a throwaway checkout of your repository on the Gateway host, and the `approve-all` permission mode scoped to that checkout only.

**Try it:** clone a copy of a repository into a scratch directory on the Gateway host, then schedule a job like this:

```sh
openclaw automations create "0 2 * * 1-5" \
  "Use sessions_spawn with runtime acp and agentId claude, cwd /workspace/scratch/my-app. Run the test suite, fix only trivial lint failures, and write findings to REPORT.md. Do not push, commit to main, or touch anything outside this directory." \
  --name "Overnight maintenance" --tz "America/Denver" --session isolated --announce
```

**Guardrails:**

- **No push credentials.** The scratch checkout shouldn't be able to push anywhere. You review the diff, then apply what you want.
- **ACP isn't sandboxed.** The harness runs on the host, so keep `approve-all` off everywhere except this job's directory, and turn it back to `approve-reads` when you're not using it.
- **Inspect before you retry.** If the session fails or times out, the harness may have already changed files. Check the session and the diff first.
- **Not from a sandboxed session.** ACP spawns are blocked when the requesting session is sandboxed, so this job needs to run in an unsandboxed one.

### 14. A Second Opinion on Every Diff

**What you get:** a code review from a different model than the one that wrote the code.

**Built from:** two ACP sessions, one per harness, pointed at the same diff and asked the same question. This is exercise 2 from the ACPX lesson, put to work.

**Try it:** ask your agent:

> Spawn two read-only ACP sessions, `codex` and `claude`, with `cwd` set to this repository. Ask each to review the staged changes for bugs and risky assumptions. Show me where they agree and where they disagree.

**Guardrails:** read-only mode is enough, so you don't need `approve-all`. Disagreements are the interesting part. Look at those first.

## Ideas to Be Careful With

**Anything with real-world consequences.** Community showcases are full of agents that negotiate with car dealers, file insurance claims, check in for flights, place grocery orders, and send invoices. It's impressive, but none of the published summaries mentions an approval step. If you want something like that, borrow the numbered-approval pattern from idea 3: the agent prepares the action, and nothing happens until you reply.

**Push-style webhooks on a private Gateway.** A webhook needs the outside service to reach your Gateway, and a Gateway that's reachable only over Tailscale, as in the [Railway lesson](running-openclaw-on-railway-with-tailscale.md), can't be reached by GitHub or Stripe. Public exposure is exactly what we avoided. When you can, prefer the pull-style version of an idea: a schedule that checks every few minutes instead of an event that arrives.

**Anything that browses while signed in.** It's convenient and it's a much bigger grant than it looks.

## Picking Your First Three

| #   | Idea                       | Effort | Risk     | Needs                               |
| --- | -------------------------- | ------ | -------- | ----------------------------------- |
| 2   | Evening look-ahead         | Low    | Very low | Calendar access                     |
| 1   | Morning brief              | Low    | Low      | Gmail and Calendar                  |
| 7   | Quick babysitter (`/loop`) | Low    | Low      | Command owner in chat               |
| 8   | Weekly trending digest     | Low    | Low      | Browser                             |
| 4   | Vendor pricing monitor     | Medium | Low      | Browser, a snapshot file            |
| 10  | Monthly memory audit       | Low    | Low      | A stronger model                    |
| 11  | Weekly status draft        | Medium | Low      | A standing order                    |
| 6   | Build finished             | Medium | Low      | A command to watch                  |
| 5   | Quiet watcher              | Medium | Medium   | A trigger script                    |
| 9   | Nightly QA                 | Medium | Medium   | Browser, a staging site             |
| 3   | Numbered email triage      | High   | Medium   | A dedicated agent, rules, a channel |
| 12  | Dev recap via your Mac     | Medium | Medium   | A paired node                       |
| 14  | Second opinion on a diff   | Medium | Medium   | ACPX, two harnesses                 |
| 13  | Overnight maintenance      | High   | High     | ACPX, a scratch checkout            |

A good path:

1. **Week one:** the evening look-ahead, then the morning brief. Get used to scheduling, run history, and delivery.
2. **Week two:** a quiet watcher, either the vendor monitor or the babysitter, so you learn what "silent unless it matters" feels like.
3. **Week three:** email triage in digest-only mode.
4. **After that:** the coding-agent ideas, once you trust your permissions.

## Living With Your Automations

Once a few are running, give them a weekly check-up:

- Run `openclaw automations list --all` and ask whether you've read the output of each one this month. If not, disable it.
- Look at `openclaw automations runs <job-id>` for anything that keeps failing or quietly doing nothing.
- Revisit anything that has standing permissions, and revoke what you no longer need.
- Keep a short list of what's running and why, so future you can tell the difference between a job you chose and a job you forgot.

The goal isn't the most automations. It's a small set that you'd notice immediately if they stopped.
