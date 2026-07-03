---
name: Weft
githubUrl: https://github.com/stevekinney/weft
description: 'Durable execution primitives for TypeScript applications that need workflows, retries, timers, and real state without pretending distributed systems are easy.'
---

I built [Weft](https://github.com/stevekinney/weft) because I kept wanting the boring parts of durable execution without hauling in a whole operations department. Sometimes you need a workflow to survive a restart, wait for a timer, retry the thing that failed, and remember where it was when the process fell over. That should not require a blood oath.

The goal is to make durable workflows feel like normal [TypeScript](https://www.typescriptlang.org/) code: explicit enough that you can reason about it, small enough that you can actually read it, and honest about the fact that time, retries, and side effects are where otherwise reasonable programs go to learn humility.
