---
title: Configuring Cursor Environments with environment.json
description: >-
  Set up reproducible cloud development environments for Cursor's background
  agents using environment.json configuration.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-07-29T15:09:56-06:00'
---

`environment.json` in Cursor serves as the **definitive configuration file for Cursor Environments**, which are **reproducible, cloud-hosted development boxes**. It acts as a canonical "recipe" that defines the setup and runtime behavior of these remote environments, primarily powering Cursor's **Background Agents** and facilitating **remote IDE sessions**.

## What `environment.json` is Used For

`environment.json` is crucial for creating consistent and isolated development environments for AI-driven coding tasks. Its main applications include:

- **Asynchronous Remote Agents (Background Agents)**: It enables the spawning of asynchronous agents that edit and run code in a remote environment. This allows you to offload long-running tasks, like code refactors, test suites, or migrations, to a remote machine while you continue coding locally. When a background agent starts, it creates its own branch to make changes, which can then be merged back.
- **Reproducible Dev Boxes**: Each agent or remote-SSH window can spin up its own Ubuntu box (or a custom Docker image if specified) based on this configuration. This ensures that every team member and continuous integration (CI) process works with an **identical and disposable workspace**, minimizing "it works on my machine" issues.
- **Remote IDE Sessions**: It supports remote IDE connections, allowing you to access and work on your code hosted in the cloud.

## How to Take Advantage of `environment.json`

To leverage `environment.json` effectively, you define the environment's specifications, allowing Cursor to provision and manage the remote workspace:

- **Location**: The `environment.json` file should typically be stored in the `.cursor/environment.json` directory at the root of your project.
- **Configuration as Code**: All runtime details are defined within this JSON file. Committing it to your repository makes the setup **portable across teammates and CI**.

### Base Environment Setup

- You can set up your machine, install tools and packages, and then **take a snapshot**.
- For advanced scenarios, you can use a **Dockerfile** to define system-level dependencies, such as specific compiler versions, debuggers, or the base operating system image. It's important _not_ to copy the entire project into the Dockerfile, as Cursor manages the workspace and checks out the correct commit.

### Key Fields/Specifications

- `snapshot`: References a cached disk image for faster boot times after the initial build.
- `install`: Specifies an idempotent dependency installation script (e.g., `npm install`, `bazel build`) that runs once before an agent starts. Its disk state is cached for subsequent runs.
- `start`: A command to run when the environment starts up.
- `terminals`: Defines background processes that run while the agent works, such as starting a web server or compiling files. You can specify the `name` and `command` for each terminal, and optionally `ports`.
- `env`: Allows you to set environment variables within the remote environment.
- `persistedDirectories`: Specifies directories that should be persisted across sessions.
- `baseImage`: Lets you define the base Docker image (e.g., `ghcr.io/cursor-images/node-20:latest`).

## Tasing Notes

- **Secrets and Git Wiring**: You can inject encrypted secrets, which are stored securely (encrypted-at-rest using KMS) in Cursor's database and provided in the background agent environment. This also allows linking the VM to your GitHub repository for branch and pull request (PR) workflows.
- **Snapshotting Workflow**: After the initial setup and running your development bootstrap commands (e.g., `bun install`, `pipenv sync`), you can click "Snapshot disk" in Cursor, which writes the ID back to `environment.json`. This allows later jobs to boot from that image, skipping package installs.
- **Starting Branch for Background Agents**: When initiating a background agent, you need to be aware of and set the starting branch. The agent will then create its own branch for the changes before a PR can be merged back into the main branch.

## Best Practices

- **Commit `environment.json`**: Always commit your `.cursor/environment.json` file to your repository. This ensures that every developer on your team inherits the identical development box, promoting consistency.
- **Treat as Mini-Dockerfile**: Think of `.cursor/environment.json` as a small Dockerfile for your entire AI workflow.
- **Clean Install Step**: Keep your `install` script clean and idempotent to ensure effective caching and faster boot times for subsequent agent runs.
- **Leverage Snapshots**: Utilize the snapshot feature to cache your environment's disk state after initial setup and dependency installation, making subsequent agent boots nearly instantaneous.

## Common Pitfalls and Limitations

Despite its benefits, `environment.json` and Cursor's environment management have some reported issues and limitations:

- **Privacy Mode Requirement**: To use advanced features like Background Agents, you **must temporarily disable privacy mode**, as these features need to send your code to remote environments to work. This can be a tricky trade-off for sensitive or proprietary projects, as it requires allowing "limited retention" of your code.
- **Documentation Link Issues**: The formal JSON schema endpoint for `environment.json` has been reported to be broken, sometimes leading to 404 errors.
- **Port Auto-forwarding Flakiness**: There have been reports of flaky port auto-forwarding for terminals, particularly on macOS and WSL 2.
- **"Failed to Start VM" Errors**: These errors often indicate missing snapshot IDs or temporary capacity issues.
- **Windows Host Specifics**: Windows hosts may require a Cursor-patched VS Code server, as vanilla Remote-SSH might fail.
- **Secret Management Nuances**: While `environment.json` can inject encrypted secrets, some users have found the management of Rails master keys or similar secrets across environments to be "annoying" or globally applied, requiring careful handling outside the standard Dockerfile process.
