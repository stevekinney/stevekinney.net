---
title: Cursor Automations
description: >-
  Run Cursor Cloud Agents from schedules and events with explicit prompts,
  permissions, visibility, and quality gates.
modified: 2026-06-24
date: 2026-06-23
---

[Cursor Automations](https://cursor.com/docs/cloud-agent/automations) run Cloud
Agents from a schedule or event. As of
[Cursor 3.8](https://cursor.com/changelog), automations can also be created from
the `/automate` skill.

Automations are useful for repeatable maintenance: dependency checks, flaky test
triage, issue grooming, release readiness, and scheduled reports. They are risky
when the prompt is vague or when the automation can change code without a human
review path.

## Trigger Sources

Cursor supports triggers from schedules, webhooks, version control events,
[Slack](https://slack.com/), [Linear](https://linear.app/),
[Sentry](https://sentry.io/), [PagerDuty](https://www.pagerduty.com/), and
related integrations. [GitHub](https://github.com/) triggers can include issue
comments, pull request review comments, submitted reviews, review thread updates,
and workflow runs.

Pick the trigger that matches the workflow. Do not make an automation poll a
system that can send a precise event.

## Prompt Contract

Every automation prompt should include:

- What it may read.
- What it may change.
- The verification commands it must run.
- Whether it may create a pull request.
- What counts as blocked.
- Where it should report results.

Example:

```text
When a workflow run fails on the main branch, inspect the failing job logs and
open a pull request only if the fix is confined to test configuration. Run
bun run lint and the failing test command. If the failure is product code or
requires a dependency change, report the diagnosis without editing files.
```

## Visibility and Ownership

Automations can be private, team visible, or team owned. Use team ownership for
workflows that affect shared repositories. A private automation that opens pull
requests against a team repository is hard to audit.

## Review the First Runs

Treat the first few automation runs as production tests. Read the branch, pull
request, logs, and comments. Tighten the prompt when the automation does
something technically allowed but operationally unhelpful.
