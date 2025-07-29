---
title: Installing and Setting Up Claude Code
description: Complete installation guide for Claude Code CLI tool with system requirements and initial configuration.
modified: 2025-07-29T12:30:30-06:00
---

Claude Code is a **powerful agentic AI coding assistant** that transforms how developers approach their workflows. Unlike traditional code completion tools, it operates directly in your terminal, understanding your entire codebase and executing complex development tasks through natural language commands. It functions less like a suggestion tool and more like an **intelligent partner** or a junior developer on your team.

Here's a comprehensive guide on how to install and get started with Claude Code:

## Understanding What Claude Code Is

Claude Code is an **agentic code tool** developed by Anthropic that provides a native way to integrate Claude into coding workflows. It's designed to be a **low-level, unopinionated, and flexible power tool**, offering nearly raw access to the underlying model's capabilities. Its core strengths include:

- **Full Codebase Awareness**: It's initialized within a specific project directory, giving it a persistent, broad understanding of the entire project structure, inter-file relationships, and coding patterns.
- **Autonomous Execution**: Claude Code can perform complex, multi-step workflows with a degree of autonomy, directly manipulating files, executing shell commands, managing Git operations, and running tests, often without continuous human intervention. It can even operate in an "auto mode".
- **Terminal-Native Integration**: As a command-line interface (CLI) tool, it integrates directly into the terminal, facilitating scripting, automation, and integration with other command-line tools. It allows you to chat with it like a regular AI model.

## System Requirements

Before installation, ensure your system meets these prerequisites:

- **Operating Systems**: macOS 10.15+, Ubuntu 20.04+/Debian 10+, or Windows via WSL (Windows Subsystem for Linux).
- **Hardware**: A minimum of 4GB RAM is recommended.
- **Software**: **Node.js 18+** is essential, which includes npm (Node Package Manager). Git 2.23+ is optional but highly recommended for version control. GitHub or GitLab CLI is optional for Pull Request (PR) workflows.
- **Network**: An active internet connection is required for authentication and AI processing.
- **Location**: Claude Code is only available in supported countries.

## Installation Steps

Installation is straightforward, typically involving npm.

```bash
npm install -g @anthropic-ai/claude-code
```

1. **Install Node.js**: If you don't have Node.js 18+ or need to update, use your distribution's package manager or Node Version Manager (nvm).
2. **Install Claude Code**: Open your terminal and run the command: `npm install -g @anthropic-ai/claude-code`.
   - **Important**: **Do NOT use `sudo`** with this command unless absolutely necessary, as it can cause permission issues. If you encounter permission errors on Linux, it's recommended to configure npm to use a user-writable directory within your home folder, for example, `~/.npm-global`, and then add it to your PATH.
3. **Authentication**: The first time you run `claude` in your project directory, it will guide you through an OAuth process to connect to your Anthropic account.
   - You will need an active billing setup (e.g., sufficient credits) in your Anthropic Console account.
   - Alternatively, you can log in with your **Claude.ai Pro or Max plan** subscription for a unified experience.
   - Claude Code can also be configured for enterprise deployments through Amazon Bedrock or Google Vertex AI.

### Check Your Set Up

Run Claude's built-in diagnostic tool:

```bash
claude doctor
```

Expected output:

```ts
✔ All systems go
```
