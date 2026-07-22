---
name: Temporal MCP
githubUrl: https://github.com/stevekinney/temporal-mcp
npmPackages:
  - temporal-mcp
writingPath: /writing/temporal-developer-skill
description: 'A Model Context Protocol server for working with Temporal from agent tools, because workflow state is easier to inspect when the agent can ask directly.'
---

[Temporal MCP](https://github.com/stevekinney/temporal-mcp) connects [Temporal](https://temporal.io/) to the [Model Context Protocol](https://modelcontextprotocol.io/). The idea is pretty simple: if an agent is helping with durable workflows, it should be able to inspect workflows, namespaces, histories, and task queues without me narrating the entire state of the cluster by hand.

This sits in the same general neighborhood as my [Temporal developer skill](/writing/temporal-developer-skill): make the durable system visible to the tool doing the work. Agents get a lot more useful when they can interrogate the runtime instead of guessing from source files and vibes.
