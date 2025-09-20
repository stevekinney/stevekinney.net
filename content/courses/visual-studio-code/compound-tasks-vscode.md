---
title: Compound Tasks in Visual Studio Code
description: >-
  Explore advanced task capabilities including watch modes, compound tasks, and
  task inputs for efficient development workflows
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-18T06:15:05-05:00'
---

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

### `sequence` (Default)

Tasks run serially in the exact order listed in the `dependsOn` array. Each task must complete before the next one starts.

```json
{
  "label": "Sequential Build and Test",
  "dependsOn": ["Clean", "Build", "Test"],
  "dependsOrder": "sequence"
}
```

This ensures that "Clean" finishes before "Build" starts, and "Build" finishes before "Test" starts. If any task fails, subsequent tasks won't run.

### `parallel`

All dependent tasks start simultaneously and run concurrently.

```json
{
  "label": "Parallel Assets Build",
  "dependsOn": ["Compile CSS", "Compile JavaScript", "Optimize Images"],
  "dependsOrder": "parallel"
}
```

This launches all three asset compilation tasks at once, which can significantly speed up build times for independent operations.

### `any`

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
