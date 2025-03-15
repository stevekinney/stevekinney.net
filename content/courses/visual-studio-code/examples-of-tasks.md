---
title: Examples of VS Code Tasks
description: Practical examples of VS Code tasks for common development scenarios including building, testing, and deployments
modified: 2025-03-16T14:18:06-06:00
---

## Compiling TypeScript, Then Running Unit Tests

```jsonc
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Compile TypeScript",
			"type": "shell",
			"command": "tsc -p tsconfig.json",
			"problemMatcher": "$tsc",
			"group": "build",
		},
		{
			"label": "Run Tests",
			"type": "shell",
			"command": "npm run test",
			"group": "test",
			"dependsOn": "Compile TypeScript", // runs compile first, then test
		},
	],
}
```

- `dependsOn` ensures `Compile TypeScript` completes before `Run Tests`.
- `problemMatcher` is set to `$tsc`, letting VS Code highlight TS errors in the editor.

## Docker Build and Push

Let’s say you have a Dockerfile, and you want to build and push to a container registry in one step:

```jsonc
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Docker Build",
			"type": "shell",
			"command": "docker build -t myrepo/myimage:latest .",
			"problemMatcher": [],
		},
		{
			"label": "Docker Push",
			"type": "shell",
			"command": "docker push myrepo/myimage:latest",
			"problemMatcher": [],
			"dependsOn": "Docker Build",
		},
	],
}
```

- No major problem matchers here, but the tasks still give you a handy single-click solution.
- We chain tasks with `dependsOn`.

## Using Variables and Inputs

VS Code supports [variable substitution](https://code.visualstudio.com/docs/editor/variables-reference) and user inputs. Let’s allow the user to input a custom environment, like `production` or `staging`:

```jsonc
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Deploy",
			"type": "shell",
			"command": "npm run deploy -- --env ${input:whichEnv}",
		},
	],
	"inputs": [
		{
			"id": "whichEnv",
			"type": "pickString",
			"description": "Select environment to deploy to",
			"options": ["development", "staging", "production"],
			"default": "development",
		},
	],
}
```

- When you run `Deploy`, VS Code will pop up a picker to select the environment, substituting that choice in the command.
- Perfect for scripts that differ by environment or other parameters.
