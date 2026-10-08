---
title: Setting Up OpenClaw
description: Choose sensible default models for your OpenClaw instance and optionally require approval before the agent runs commands.
---

Once we've finished up with [installation](installation.md), we're going to want to do a little of setup in order to get our OpenClaw instance rocking.

The first thing we're going to want to do is set up which models we're going to use. This, of course, is a personal decision—but, here are some sensible defaults.

![The model settings showing a primary model, a utility model, a decision model, a fallback model, thinking, and fast mode](assets/openclaw-model-defaults.png)

## Tweaking Your Security Settings

**Optional**: Out of the box, OpenClaw has full access to run commands. One thing you _might_ want to consider doing is to have it ask you for permission.

```bash
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.ask on-miss
```
