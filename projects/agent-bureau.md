---
name: Agent Bureau
githubUrl: https://github.com/stevekinney/agent-bureau
npmPackages:
  - armorer
  - conversationalist
writingPath: /writing/ai-gateway-durable-workflows
description: 'A playground for durable agent infrastructure: queues, schedules, memory, gateways, and all the glue code that stops being glue once it matters.'
---

[Agent Bureau](https://github.com/stevekinney/agent-bureau) is where I try out the infrastructure pieces around agentic systems: durable scheduling, memory, gateways, background work, and the small contracts that make a system less surprising after the first successful demonstration.

The related post on [AI gateways and durable workflows](/writing/ai-gateway-durable-workflows) covers some of the shape of that work. The short version is that agents are much easier to take seriously when the surrounding system can remember, retry, audit, and recover without depending on a human to keep the whole state machine in their head.
