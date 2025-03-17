---
title: 'Debugging: The Basics in VS Code'
description: Learn fundamental debugging techniques in VS Code including launch configurations, breakpoints, and stepping through code
modified: 2025-03-16T15:15:35-06:00
---

> [!NOTE] Example Repository
> We're going to be playing around with some of the examples in [this repository](https://github.com/stevekinney/vscode-examples).

There are a bunch of templates that Visual Studio Code provides to get up and running quickly.

![Setting Up a Launch Configuration](assets/Code%20-%20index.js%20—%20maths%20-2025-03-16%20at%2014.29.30@2x.png)

## Together

We're going to walk through the `maths` example in [this repository]

## Exercise: Debugging an Express Application

Set up a `launch.json`.

```json
{
	"version": "0.2.0",
	"configurations": [
		{
			"type": "node",
			"request": "launch",
			"name": "Launch Program",
			"skipFiles": ["<node_internals>/**"],
			"args": ["${workspaceFolder}/index.js"]
		}
	]
}
```
