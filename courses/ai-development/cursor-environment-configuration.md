---
title: Cursor Environment Configuration
description: >-
  Configure Cursor Cloud Agent environments with reproducible setup commands,
  dependencies, secrets, and verification expectations.
modified: 2026-06-24
date: 2025-07-29
---

[Cursor Cloud Agents](https://cursor.com/docs/cloud-agent) need a reproducible
environment. If the setup depends on your laptop, the cloud agent will fail or
invent a workaround.

## What to Configure

Use `.cursor/environment.json` for cloud-specific setup. Keep these concerns
explicit:

- Dependency installation.
- Build and test commands.
- Required system packages.
- Environment variables and secrets.
- Startup commands for services.
- Repository-specific notes that a cloud agent needs before work begins.

Do not put secrets in the repository. Use Cursor's secret management for values
that should be available to the cloud environment.

## Make Setup Verifiable

The best environment setup ends with a command that proves the repository is
ready:

```bash
bun install
bun run content:validate
```

Use the same command in prompts:

```text
Before editing, verify the cloud environment by running bun run content:validate.
If setup fails, stop and report the failing command and output.
```

That instruction prevents the agent from spending an hour debugging code in a
broken environment.

## Keep Local and Cloud Close

Cloud setup should mirror the repository's normal local setup. If local
development uses [Bun](https://bun.sh/), configure Bun in the cloud environment.
If tests require a database, use the same migration and seed path the team uses
locally.

When local and cloud setup diverge, agents learn the wrong lessons. They fix the
environment they can see, not the one your team actually uses.
