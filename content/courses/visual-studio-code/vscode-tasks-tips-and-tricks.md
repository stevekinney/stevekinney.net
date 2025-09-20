---
title: 'Visual Studio Code Tasks: Tips and Tricks'
description: >-
  Advanced techniques for customizing Visual Studio Code tasks with problem
  matchers, presentation options, and environment variables
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-16T17:35:22-06:00'
---

## Custom Problem Matchers

You can define custom problem matchers to parse the output of any CLI tool. This is super handy if you have a bespoke compiler or custom linting solution. A custom matcher can highlight file paths and line numbers in errors, letting you click on them to jump straight to the code.

```jsonc
{
  "problemMatcher": [
    {
      "owner": "customLinter",
      "pattern": [
        {
          "regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error)\\s+(.*)$",
          "file": 1,
          "line": 2,
          "column": 3,
          "severity": 4,
          "message": 5,
        },
      ],
    },
  ],
}
```

## Presentation Options

You can control how the task output is shown:

```jsonc
{
  "label": "Verbose Build",
  "type": "shell",
  "command": "npm run build --verbose",
  "presentation": {
    "reveal": "always",
    "panel": "dedicated",
    "echo": true,
    "showReuseMessage": false,
    "clear": true,
  },
}
```

- `reveal`: Show the panel automatically or only if there's a problem (`silent`, `never`, etc.).
- `panel`: Keep each task's output in a separate panel, or reuse a single terminal panel.
- `clear`: Clear the previous output before running the new task.

## Environment Variables

Need environment variables for a single task? Insert `env` in the task:

```jsonc
{
  "label": "Build with Env Var",
  "type": "shell",
  "command": "npm run build",
  "env": {
    "NODE_ENV": "production",
    "API_KEY": "xyz123",
  },
}
```

Securely handle secrets—avoid committing real secrets to version control! Use placeholders or retrieval from a secure store.

## Automatically Running Tasks on Folder Open

You can configure tasks to run automatically when you open a folder or workspace using the `runOn` property. This is especially useful for starting development servers, running initial build steps, or setting up your development environment.

```jsonc
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev Server",
      "type": "shell",
      "command": "npm run dev",
      "isBackground": true,
      "problemMatcher": {
        "owner": "custom",
        "pattern": {
          "regexp": ".",
        },
        "background": {
          "beginsPattern": "Starting development server",
          "endsPattern": "Development server started",
        },
      },
      "runOptions": {
        "runOn": "folderOpen",
      },
    },
  ],
}
```

### Key Properties:

- **`runOptions.runOn`:** Specifies when to run the task. The value `"folderOpen"` means the task will automatically start when the folder is opened.
- **`isBackground: true`:** Marks this as a long-running background task that doesn't block Visual Studio Code.
- **`problemMatcher`:** Configure patterns to detect when the task has started successfully.

### Additional `runOn` Options:

- **`folderOpen`:** Run when the folder or workspace is opened
- **`default`:** Only run when explicitly triggered

### Tips for Auto-Starting Tasks:

**Use `presentation` options** to control terminal visibility:

```jsonc
"presentation": {
	"reveal": "silent",
	"panel": "dedicated",
	"showReuseMessage": false
}
```

**Combine with task dependencies** to create complete startup workflows:

```jsonc
{
  "label": "Dev Environment",
  "dependsOn": ["Start Backend", "Start Frontend", "Watch CSS"],
  "dependsOrder": "parallel",
  "runOptions": {
    "runOn": "folderOpen",
  },
}
```

**Use prompts for confirmation** if you don't always want the task to run:

```jsonc
"inputs": [
	{
		"id": "confirmStart",
		"type": "pickString",
		"description": "Start development server?",
		"options": ["Yes", "No"],
		"default": "Yes"
	}
],
```
