---
title: Advanced Usage of Tasks in Visual Studio Code
description: Explore advanced task capabilities including watch modes, compound tasks, and task inputs for efficient development workflows
modified: 2025-03-16T16:14:40-06:00
---

## Running Tests with Watch Mode

Running tests automatically whenever you save a file is a cornerstone of Test-Driven Development (TDD) and efficient development in general. This provides immediate feedback on code changes

Then, create a `tasks.json` file (if it doesn't exist) in your `.vscode` folder.

```ts

{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Run Tests (Watch Mode)",
            "type": "shell",
            "command": "npx vitest --watch", // Or "yarn test --watchAll"
            "problemMatcher": ["$jest"],
            "group": {
                "kind": "test",
                "isDefault": true
            }
        }
    ]
}
```

- **`label`:** A descriptive name for the task.
- **`type`:** `"shell"` indicates we're running a shell command.
- **`command`:** `"npx jest --watchAll"` (or `"yarn test --watchAll"` if using Yarn) executes Jest in watch mode. The `--watchAll` flag tells Jest to watch for changes in _all_ files and re-run tests accordingly.
- **`problemMatcher`:** `"$jest"` integrates Jest's output with Visual Studio Code's Problems panel, highlighting errors and warnings directly in the editor.
- **`group`:** Marks this task as the default test task (`isDefault: true`). This allows you to run it quickly with `Ctrl+Shift+T` (or `Cmd+Shift+T` on macOS).

Now, you can run this task from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) by typing "Tasks: Run Test Task", or use the keyboard shortcut. Jest will run in the integrated terminal and automatically re-run your tests whenever you save a file.

> [!TIP]
>
> You can often configure similar watch mode tasks for other testing frameworks by using their respective command-line flags (e.g., --watch for Mocha, dotnet watch test for .NET).

## Building and Deploying a Web App

This example shows a simplified build and deployment task using `scp` (Secure Copy) to deploy a static web app to a remote server. In a real-world scenario, you would likely use a more robust deployment tool or a CI/CD pipeline, but this demonstrates the basic principles.

**Prerequisites:**

- You have SSH access to a remote server.
- You have `scp` installed on your local machine (typically included with macOS and Linux; for Windows, you might need to use WSL or an SSH client).

```json
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Build Web App",
			"type": "shell",
			"command": "npm run build", // Or your specific build command
			"problemMatcher": [],
			"group": "build"
		},
		{
			"label": "Deploy Web App",
			"type": "shell",
			"command": "echo Totally deploying…",
			"problemMatcher": [],
			"dependsOn": ["Build Web App"] // Run the build task first
		}
	]
}
```

- `"dependsOn": ["Build Web App"]`: This crucial property ensures that the "Build Web App" task runs _before_ the "Deploy Web App" task. This is essential for deploying the latest build.

> [!WARNING]
>
> Be extremely careful with deployment tasks! Ensure you are deploying to the correct server and directory. Consider using a safer deployment method in a production environment (e.g., a CI/CD pipeline with proper authentication and rollback capabilities). This example is for illustrative purposes.

## Compiling Sass/Less to CSS

This example demonstrates compiling Sass (or Less) to CSS using the `sass` command-line tool. You'll need to have the `sass` package installed globally or locally in your project.

```json
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Compile Sass",
			"type": "shell",
			"command": "sass src/styles.scss dist/styles.css", // Adjust paths as needed
			"problemMatcher": ["$sass-loader"], // Use the sass-loader problem matcher
			"group": "build"
		},
		{
			"label": "Compile Sass (Watch Mode)",
			"type": "shell",
			"command": "sass --watch src/styles.scss:dist/styles.css",
			"problemMatcher": ["$sass-loader"],
			"group": "build",
			"isBackground": true
		}
	]
}
```

- **`Compile Sass` Task:**
  - `"command": "sass src/styles.scss dist/styles.css"`: This command compiles the `src/styles.scss` file to `dist/styles.css`. Adjust the paths to match your project structure.
- **`Compile Sass (Watch Mode)` Task:**
  - `"command": "sass --watch src/styles.scss:dist/styles.css"`: This runs sass in watch mode. Sass now monitors the `src` folder, and will output to the `dist` folder.
  - `"isBackground": true`: Makes this a background task.
- **`problemMatcher`:** `"$sass-loader"` is a built-in problem matcher that correctly parses Sass compiler errors and displays them in the Visual Studio Code Problems panel. If you're using Less, you might need a different problem matcher or create a custom one.

## Running Database Migrations

This example shows how to run database migrations using a hypothetical `migrate` command. The specific command will depend on your database and migration tool (e.g., `knex migrate:latest`, `python manage.py migrate`, etc.).

```json
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Run Database Migrations",
			"type": "shell",
			"command": "npx knex migrate:latest", // Replace with your migration command
			"problemMatcher": [], // Add a problem matcher if your migration tool provides one
			"env": {
				"DATABASE_URL": "${input:dbUrl}" // Use an input for the database URL
			}
		}
	],
	"inputs": [
		{
			"id": "dbUrl",
			"type": "promptString",
			"description": "Enter the database connection URL:",
			"default": "postgres://user:password@localhost:5432/mydb"
		}
	]
}
```

- **`command`:** Replace `"npx knex migrate:latest"` with the actual command to run your database migrations.
- **`env`:** This example uses a task input (`${input:dbUrl}`) to prompt the user for the database connection URL. This is a good practice to avoid hardcoding sensitive information in your `tasks.json` file.
- **`inputs`:** This defines the task input:
  - `"id"`: `"dbUrl"` - The ID used to reference the input in the task's `env` property.
  - `"type"`: `"promptString"` - Prompts the user for a string input.
  - `"description"`: The prompt message displayed to the user.
  - `"default"`: An optional default value.

## Task Inputs: `promptString`, `pickString`, and `command`

Visual Studio Code tasks support different input types to make your tasks more flexible and interactive.

- **`promptString` (Covered Above):** Prompts the user for free-form text input.
- **`pickString` (Covered in Original Content):** Presents the user with a dropdown list of predefined options.
- **`command`:** Executes a Visual Studio Code command and uses its return value as the input. This is powerful for integrating with other Visual Studio Code features and extensions.

**Example: `command` Input (Getting the Current Git Branch)**

```json
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Echo Current Git Branch",
			"type": "shell",
			"command": "echo Current branch: ${input:currentBranch}",
			"problemMatcher": []
		}
	],
	"inputs": [
		{
			"id": "currentBranch",
			"type": "command",
			"command": "git.getBranch" // Hypothetical command (you might need an extension)
		}
	]
}
```

- **`"command": "git.getBranch"`:** This would ideally call a Visual Studio Code command (potentially provided by a Git extension) that returns the current Git branch. You might need to install a Git extension that provides such a command, or write a simple extension yourself to expose this functionality. The built-in Git extension _doesn't_ expose a command in precisely this way, but this illustrates the concept.
- The output of the `git.getBranch` command would then be substituted into the `echo` command in the task.

## Compound Tasks

Compound tasks allow you to run multiple tasks in sequence. This is useful for orchestrating complex workflows.

```json
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Task A",
			"type": "shell",
			"command": "echo Task A"
		},
		{
			"label": "Task B",
			"type": "shell",
			"command": "echo Task B"
		},
		{
			"label": "Run A and B",
			"dependsOn": ["Task A", "Task B"],
			"dependsOrder": "sequence",
			"problemMatcher": []
		}
	]
}
```

- `"dependsOn": ["Task A", "Task B"]` : The `Run A and B` task will execute tasks with labels `Task A` and `Task B`.
- `"dependsOrder": "sequence"`: The tasks will be run in the order defined in the `dependsOn` array.

## Understanding Task Dependencies: `dependsOn` and `dependsOrder`

When orchestrating multiple tasks, you need to control both which tasks run (`dependsOn`) and how they run in relation to each other (`dependsOrder`). The `dependsOrder` property accepts three values, each with distinct behavior:

### 1. `sequence` (Default)

Tasks run serially in the exact order listed in the `dependsOn` array. Each task must complete before the next one starts.

```json
{
	"label": "Sequential Build and Test",
	"dependsOn": ["Clean", "Build", "Test"],
	"dependsOrder": "sequence"
}
```

This ensures that "Clean" finishes before "Build" starts, and "Build" finishes before "Test" starts. If any task fails, subsequent tasks won't run.

### 2. `parallel`

All dependent tasks start simultaneously and run concurrently.

```json
{
	"label": "Parallel Assets Build",
	"dependsOn": ["Compile CSS", "Compile JavaScript", "Optimize Images"],
	"dependsOrder": "parallel"
}
```

This launches all three asset compilation tasks at once, which can significantly speed up build times for independent operations.

### 3. `any`

Visual Studio Code starts tasks in parallel, but the main task completes as soon as any dependent task finishes. This is useful for "race condition" scenarios.

```json
{
	"label": "Development Server",
	"dependsOn": ["Start API Server", "Start Frontend Server"],
	"dependsOrder": "any"
}
```

In this example, the "Development Server" task is considered complete when either the API server or the frontend server starts successfully.

### Combining Dependencies

You can create complex task trees by combining dependencies. For example:

```json
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Clean",
			"type": "shell",
			"command": "rm -rf dist"
		},
		{
			"label": "Build Frontend",
			"type": "shell",
			"command": "npm run build:frontend",
			"dependsOn": ["Clean"]
		},
		{
			"label": "Build Backend",
			"type": "shell",
			"command": "npm run build:backend",
			"dependsOn": ["Clean"]
		},
		{
			"label": "Run Tests",
			"type": "shell",
			"command": "npm test",
			"dependsOn": ["Build Frontend", "Build Backend"],
			"dependsOrder": "sequence"
		},
		{
			"label": "Full Pipeline",
			"dependsOn": ["Run Tests"],
			"problemMatcher": []
		}
	]
}
```

In this example:

1. The "Clean" task runs first
2. Then "Build Frontend" and "Build Backend" run (both depend on "Clean")
3. After both builds complete, "Run Tests" executes (depends on both builds)
4. Finally, "Full Pipeline" completes after "Run Tests" finishes

> [!TIP]
>
> Be aware of potential race conditions when using `parallel` with tasks that might conflict (e.g., tasks that write to the same files). In such cases, `sequence` is safer.
