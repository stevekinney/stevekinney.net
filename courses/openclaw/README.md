---
title: OpenClaw
description: 'Install, configure, and extend OpenClaw: connect Telegram, Gmail, and Calendar, give your agent memory, and let it drive a browser.'
date: '2026-10-08'
---

OpenClaw is a personal AI assistant that lives on your own machine. It runs a background **Gateway**, connects to the model provider of your choice, and reaches you through the chat apps you already use. This course walks through getting it installed, shaping how it behaves, and giving it the access it needs to be useful.

## What We'll Cover

- **Installing and setting up:** Get OpenClaw running locally, connect a model provider, and tighten up its permissions.
- **Configuring your agent:** Understand the workspace files that define how your agent operates, behaves, and remembers.
- **Security and approvals:** Decide what your agent may do on its own and what it has to ask you about first.
- **Channels:** Talk to your agent from Telegram, and decide who else gets to.
- **Automations:** Put it to work on a schedule, with a menu of ideas to choose from.
- **Integrations:** Let it read your Gmail and Google Calendar.
- **Memory and the browser:** Prove that your agent actually remembers things, and put its browser to work.
- **Skills and delegation:** Teach it new procedures with skills, and hand work off to subagents and coding agents.
- **Remote gateways:** Move the Gateway to an always-on server, reach it privately over Tailscale, and connect your Mac as a node.
- **Workflows and orchestration:** Run multi-step pipelines with approval checkpoints, get structured answers from a model, fan work out to many agents at once, and choose the right tool for each job.

If you'd rather run OpenClaw on a server from the start, the [OpenClaw Railway template](https://github.com/stevekinney/openclaw-railway-template) deploys a Gateway to [Railway](https://railway.com?referralCode=kinney) that's reachable only over Tailscale. The [Railway lesson](running-openclaw-on-railway-with-tailscale.md) later in the course walks through setting it up.

> [!NOTE] New to Railway?
> If you'd like, you can sign up with [my referral link](https://railway.com?referralCode=kinney). You'll get $20 in Railway credits, which is about a free month on the Pro plan, and I get a small referral bonus. It's entirely optional, and the course works the same either way.
