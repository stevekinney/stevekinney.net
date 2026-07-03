---
name: Temporal Explorer
githubUrl: https://github.com/stevekinney/temporal-explorer
writingPath: /writing/build-temporal-workflow
description: 'An experimental interface for poking at Temporal workflows, histories, and runtime state without turning every debugging session into a scavenger hunt.'
---

[Temporal Explorer](https://github.com/stevekinney/temporal-explorer) is an experiment in making [Temporal](https://temporal.io/) workflows easier to look at while you are building them. Workflow histories are incredibly useful, but they are also very good at making your eyes glaze over if you are already trying to debug something at 11:37 p.m.

The project is about putting the useful bits closer to the surface: what ran, what waited, what failed, and what the system thinks is supposed to happen next. Durable execution is easier to trust when the runtime is legible.
