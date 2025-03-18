---
title: Examples of Visual Studio Code Tasks
description: Practical examples of Visual Studio Code tasks for common development scenarios including building, testing, and deployments
modified: 2025-03-18T01:04:17-05:00
---

## Tasks for a Vite Project

In the example below, we've got separate tasks for linting, testing, building, and serving a Vite app.

The `"group"` property tags the lint task as a build-related task and the test task as a test group task, enabling quick access via **Run Build Task** or **Run Test Task** commands. The build task runs the project’s production build (using Vite or `tsc`) and associates the TypeScript problem matcher to catch compile errors.

The development server task runs in the background so you can continue working while it watches for file changes. Marking it with `"isBackground": true` prevents Visual Studio Code from treating it as finished – it will keep running until you terminate it manually.

```json
// .vscode/tasks.json (excerpt)
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Lint",
      "type": "npm", 
      "script": "lint",
      "group": "build",                      // Allows Run Build Task to trigger lint
      "problemMatcher": ["$eslint-stylish"]  // Highlights ESLint errors in Problems pane
    },
    {
      "label": "Test",
      "type": "shell",
      "command": "npm run test",             // Or a direct test runner command
      "group": "test",                      // Allows Run Test Task to trigger tests
      "problemMatcher": []                  // (Attach a matcher if test output can be parsed for errors)
    },
    {
      "label": "Build (Frontend)",
      "type": "shell",
      "command": "npm run build",           // Runs Vite or tsc build for frontend
      "problemMatcher": ["$tsc"]            // Use TypeScript matcher to catch type errors
    },
    {
      "label": "Dev Server (Frontend)",
      "type": "npm",
      "script": "dev",                     // Launches Vite dev server
      "isBackground": true,                // Mark as long-running background task
      "problemMatcher": "$tsc-watch"       // Treat TS compile errors during dev
    }
  ]
}
```

### Adding a Backend Server

So, now let's say we *also* wanted to spin up the backend API. We can add some additional tasks.

```json
// Compound task to run frontend and backend concurrently
{
  "label": "Dev: Full Stack",
  "dependsOn": ["Dev Server (Frontend)", "Dev Server (API)"]
  // By default, dependsOn tasks run in parallel in separate terminals ([Integrate with External Tools via Tasks](https://code.visualstudio.com/docs/editor/tasks#:~:text=You%20can%20also%20compose%20tasks,executed%20in%20parallel%20by%20default))
},
// The backend API server task might be defined as:
{
  "label": "Dev Server (API)",
  "type": "shell",
  "command": "nodemon src/server.ts",
  "isBackground": true,
  "problemMatcher": []  // (Use a matcher if you want to capture errors in Problems)
},
// Sequential compound task: lint -> test -> build
{
  "label": "Check & Build All",
  "dependsOn": ["Lint", "Test", "Build (Frontend)"],
  "dependsOrder": "sequence"               // Run tasks one by one in the given order ([Integrate with External Tools via Tasks](https://code.visualstudio.com/docs/editor/tasks#:~:text=))
  // "Check & Build All" will run Lint, then Test, then Build (Frontend) sequentially
}
```

## Some Other Examples
### Compiling TypeScript, Then Running Unit Tests

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
- `problemMatcher` is set to `$tsc`, letting Visual Studio Code highlight TS errors in the editor.

### Docker Build and Push

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

Visual Studio Code supports [variable substitution](https://code.visualstudio.com/docs/editor/variables-reference) and user inputs. Let’s allow the user to input a custom environment, like `production` or `staging`:

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

- When you run `Deploy`, Visual Studio Code will pop up a picker to select the environment, substituting that choice in the command.
- Perfect for scripts that differ by environment or other parameters.
