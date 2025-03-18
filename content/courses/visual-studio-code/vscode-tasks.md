---
title: Tasks in Visual Studio Code
description: Understand how to configure and use Visual Studio Code tasks to automate your development workflow
modified: 2025-03-17T16:46:31-05:00
---

`tasks.json` is a configuration file in Visual Studio Code that defines automated tasks you can run from the editor. Instead of manually typing the same build or test commands in the terminal (ugh, repetitive strain, anyone?), you can click a button, press a shortcut, or let Visual Studio Code trigger these tasks automatically.

It lives inside the `.vscode` folder, typically at:

```sh
.vscode/tasks.json
```

In [Multi-Root Workspaces](multi-root-workspaces.md), each folder can maintain its own `tasks.json`, or you can set a single overarching tasks file for your workspace.

## Why Use Tasks in Visual Studio Code?

1. **Consistency**: Everyone on the team can share the same commands and parameters, so no one can say, “But it works on my machine…”
2. **Speed**: With tasks, you just press a key combo (`Ctrl+Shift+B` on Windows/Linux or `Cmd+Shift+B` on macOS by default) or select a task from the Command Palette to run everything from build scripts to Docker commands.
3. **Automation**: Chain tasks to build, test, lint, and deploy in one fell swoop.
4. **Integration**: Tasks play nicely with Visual Studio Code's debugging and problem matchers (integrated error detection in your code).

## Basic Structure

Here’s a minimal example of a `tasks.json` file:

```jsonc
{
	// See https://code.visualstudio.com/docs/editor/tasks
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Build the project",
			"type": "shell",
			"command": "npm run build",
			"problemMatcher": "$tsc",
			"group": {
				"kind": "build",
				"isDefault": true,
			},
		},
	],
}
```

### Tasting Notes

- **version**: Must be `"2.0.0"` for all modern usage.
- **tasks**: An array of objects, each describing a specific task.
- **label**: Human-readable name shown when you run tasks in Visual Studio Code.
- **type**: Commonly `shell` (executes in your OS shell) or `process` (spawns a subprocess).
- **command**: The actual command to run (`npm run build`, `gulp`, `make`, etc.).
- **problemMatcher**: Tells Visual Studio Code how to parse compiler, test, or linter errors and warnings. `$tsc` matches TypeScript compiler output, `$eslint-stylish` for ESLint, etc.
- **group**: Tasks can be grouped under `"build"`, `"test"`, or custom groups.

## Common Task Types

### Shell Tasks

Most typical scenario: run a script or command in your shell. Great for quick builds and tests.

```json
{
	"label": "Shell Task Example",
	"type": "shell",
	"command": "echo Hello from the shell!"
}
```

### Process Tasks

Runs the command as a subprocess without typical shell expansions. You might need to specify `command` and `args` more explicitly:

```json
{
	"label": "Process Task Example",
	"type": "process",
	"command": "node",
	"args": ["app.js"]
}
```

### Gulp, Grunt, MSBuild, and Make

Visual Studio Code can detect certain tasks automatically from your gulp, grunt, or MSBuild project definitions. However, you can still define them manually in tasks.json if you want more control or a custom approach.

> [!WARNING] I can't answer any questions on Gulp, Grunt, MSBuild, or Make
> I don't use any of these tools—these days, at least—and cannot speak to them.
